"""
Report Generation Module.

Generates PDF and DOCX reports for:
- Combined review reports (all Stage 1 + Stage 2 reviews for a single proposal)
- Cycle summary reports (status counts, acceptance rates, reviewer workload)

All functions return a BytesIO buffer so the caller can stream it as an
HTTP response without writing temp files to disk.
"""
import io
import logging
from xml.sax.saxutils import escape

from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Count, Q
from django.utils import timezone


logger = logging.getLogger(__name__)


def _safe_text(value):
    if value is None:
        return ""
    return escape(str(value))


def _get_combined_review_data(proposal):
    from reviews.models import ReviewAssignment

    fund_requested = proposal.fund_requested
    fund_requested_text = "N/A" if fund_requested is None else f"${fund_requested:,.2f}"

    stage1_assignments = ReviewAssignment.objects.filter(
        proposal=proposal,
        stage=ReviewAssignment.Stage.STAGE_1,
        status=ReviewAssignment.Status.COMPLETED,
    ).select_related("stage1_score", "reviewer")

    stage1_reviews = []
    for index, assignment in enumerate(stage1_assignments, 1):
        reviewer_name = assignment.reviewer.get_full_name() or assignment.reviewer.username
        try:
            score = assignment.stage1_score
            stage1_reviews.append({
                "reviewer_label": f"Reviewer {index}",
                "reviewer_name": reviewer_name,
                "criteria": [
                    ("Originality", score.originality_score, 15),
                    ("Clarity", score.clarity_score, 15),
                    ("Literature Review", score.literature_review_score, 15),
                    ("Methodology", score.methodology_score, 15),
                    ("Impact", score.impact_score, 15),
                    ("Publication Potential", score.publication_potential_score, 10),
                    ("Budget Appropriateness", score.budget_appropriateness_score, 10),
                    ("Timeline Practicality", score.timeline_practicality_score, 5),
                ],
                "total_score": score.total_score,
                "percentage_score": score.percentage_score,
                "weighted_percentage_score": score.weighted_percentage_score,
                "narrative_comments": score.narrative_comments,
                "recommendation": score.get_recommendation_display() if score.recommendation else "",
                "detailed_recommendation": score.detailed_recommendation,
            })
        except ObjectDoesNotExist:
            stage1_reviews.append({
                "reviewer_label": f"Reviewer {index}",
                "reviewer_name": reviewer_name,
                "error": "Score data not available",
            })

    stage2_assignments = ReviewAssignment.objects.filter(
        proposal=proposal,
        stage=ReviewAssignment.Stage.STAGE_2,
        status=ReviewAssignment.Status.COMPLETED,
    ).select_related("stage2_review", "reviewer")

    stage2_reviews = []
    for index, assignment in enumerate(stage2_assignments, 1):
        reviewer_name = assignment.reviewer.get_full_name() or assignment.reviewer.username
        try:
            review = assignment.stage2_review
            stage2_reviews.append({
                "reviewer_label": f"Reviewer {index}",
                "reviewer_name": reviewer_name,
                "concerns_addressed": review.get_concerns_addressed_display(),
                "recommendation": review.get_revised_recommendation_display(),
                "revised_score": review.revised_score,
                "technical_comments": review.technical_comments,
                "budget_comments": review.budget_comments,
            })
        except ObjectDoesNotExist:
            stage2_reviews.append({
                "reviewer_label": f"Reviewer {index}",
                "reviewer_name": reviewer_name,
                "error": "Review data not available",
            })

    return {
        "proposal_code": proposal.proposal_code,
        "title": proposal.title,
        "pi_name": proposal.pi_name,
        "pi_department": proposal.pi_department,
        "fund_requested_text": fund_requested_text,
        "status_display": proposal.get_status_display(),
        "stage1_reviews": stage1_reviews,
        "stage2_reviews": stage2_reviews,
    }


def _get_cycle_summary_data(cycle):
    from proposals.models import Proposal
    from reviews.models import ReviewAssignment, ReviewerProfile

    proposals = cycle.proposals.all()
    status_rows = [
        ("Total Proposals", proposals.count()),
        ("Submitted", proposals.filter(status=Proposal.Status.SUBMITTED).count()),
        ("Under Stage 1 Review", proposals.filter(status=Proposal.Status.UNDER_STAGE_1_REVIEW).count()),
        ("Stage 1 Rejected", proposals.filter(status=Proposal.Status.STAGE_1_REJECTED).count()),
        ("Accepted (No Corrections)", proposals.filter(status=Proposal.Status.ACCEPTED_NO_CORRECTIONS).count()),
        ("Tentatively Accepted", proposals.filter(status=Proposal.Status.TENTATIVELY_ACCEPTED).count()),
        ("Revision Requested", proposals.filter(status=Proposal.Status.REVISION_REQUESTED).count()),
        ("Revised Proposal Submitted", proposals.filter(status=Proposal.Status.REVISED_PROPOSAL_SUBMITTED).count()),
        ("Under Stage 2 Review", proposals.filter(status=Proposal.Status.UNDER_STAGE_2_REVIEW).count()),
        ("Final Accepted", proposals.filter(status=Proposal.Status.FINAL_ACCEPTED).count()),
        ("Final Rejected", proposals.filter(status=Proposal.Status.FINAL_REJECTED).count()),
    ]
    counts = dict(status_rows)

    s1_decided = (
        counts["Stage 1 Rejected"]
        + counts["Accepted (No Corrections)"]
        + counts["Tentatively Accepted"]
        + counts["Final Accepted"]
        + counts["Final Rejected"]
    )
    s1_accepted = (
        counts["Accepted (No Corrections)"]
        + counts["Tentatively Accepted"]
        + counts["Final Accepted"]
    )
    stage1_acceptance_rate = f"{(s1_accepted / s1_decided * 100):.1f}%" if s1_decided > 0 else "N/A"

    final_decided = counts["Final Accepted"] + counts["Final Rejected"]
    final_acceptance_rate = f"{(counts['Final Accepted'] / final_decided * 100):.1f}%" if final_decided > 0 else "N/A"

    reviewer_profiles = ReviewerProfile.objects.select_related("user").filter(
        user__review_assignments__proposal__cycle=cycle
    ).annotate(
        s1_count=Count("user__review_assignments", filter=Q(
            user__review_assignments__stage=ReviewAssignment.Stage.STAGE_1,
            user__review_assignments__proposal__cycle=cycle,
        )),
        s2_count=Count("user__review_assignments", filter=Q(
            user__review_assignments__stage=ReviewAssignment.Stage.STAGE_2,
            user__review_assignments__proposal__cycle=cycle,
        )),
        total=Count("user__review_assignments", filter=Q(
            user__review_assignments__proposal__cycle=cycle,
        )),
        pending=Count("user__review_assignments", filter=Q(
            user__review_assignments__status=ReviewAssignment.Status.PENDING,
            user__review_assignments__proposal__cycle=cycle,
        )),
    ).distinct()

    reviewer_workloads = []
    for profile in reviewer_profiles:
        if profile.total > 0:
            reviewer_workloads.append({
                "reviewer": profile.user.get_full_name() or profile.user.username,
                "department": profile.department,
                "stage1": profile.s1_count,
                "stage2": profile.s2_count,
                "total": profile.total,
                "pending": profile.pending,
            })

    return {
        "cycle_name": cycle.name,
        "cycle_year": cycle.year,
        "status_rows": status_rows,
        "stage1_acceptance_rate": stage1_acceptance_rate,
        "final_acceptance_rate": final_acceptance_rate,
        "reviewer_workloads": reviewer_workloads,
    }


def generate_combined_review_pdf(proposal):
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ImportError:
        buffer = io.BytesIO()
        buffer.write(b"Report generation requires reportlab. Please install it with: pip install reportlab")
        buffer.seek(0)
        return buffer

    report = _get_combined_review_data(proposal)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    story = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("CustomTitle", parent=styles["Heading1"], fontSize=16, spaceAfter=30, alignment=1)
    story.append(Paragraph("Combined Review Report", title_style))
    story.append(Spacer(1, 12))

    for label, value in [
        ("Proposal Code", report["proposal_code"]),
        ("Title", report["title"]),
        ("PI", report["pi_name"]),
        ("Department", report["pi_department"]),
        ("Funding Requested", report["fund_requested_text"]),
        ("Status", report["status_display"]),
    ]:
        story.append(Paragraph(f"<b>{label}:</b> {_safe_text(value)}", styles["Normal"]))
    story.append(Spacer(1, 20))

    story.append(Paragraph("Stage 1 Reviews", styles["Heading2"]))
    story.append(Spacer(1, 10))
    if not report["stage1_reviews"]:
        story.append(Paragraph("No Stage 1 reviews completed yet.", styles["Normal"]))
    for review in report["stage1_reviews"]:
        story.append(Paragraph(f"<b>{_safe_text(review['reviewer_label'])}</b>", styles["Heading3"]))
        if review.get("error"):
            story.append(Paragraph(_safe_text(review["error"]), styles["Normal"]))
            story.append(Spacer(1, 15))
            continue

        score_data = [["Criteria", "Score", "Max"]]
        for criterion_name, score_value, max_value in review["criteria"]:
            score_data.append([criterion_name, str(score_value), str(max_value)])
        score_data.extend([
            ["Total", str(review["total_score"]), "100"],
            ["Percentage", f"{review['percentage_score']}%", "-"],
            ["Weighted Score", f"{review['weighted_percentage_score']}%", "-"],
        ])

        table = Table(score_data, colWidths=[2.5 * inch, 1 * inch, 0.75 * inch])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("ALIGN", (1, 1), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 11),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
            ("BACKGROUND", (0, -2), (-1, -1), colors.beige),
            ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ]))
        story.append(table)
        story.append(Spacer(1, 10))

        if review.get("narrative_comments"):
            story.append(Paragraph("<b>Comments:</b>", styles["Normal"]))
            story.append(Paragraph(_safe_text(review["narrative_comments"]), styles["Normal"]))
        if review.get("recommendation"):
            story.append(Paragraph(f"<b>Recommendation:</b> {_safe_text(review['recommendation'])}", styles["Normal"]))
        if review.get("detailed_recommendation"):
            story.append(Paragraph("<b>Detailed Recommendation:</b>", styles["Normal"]))
            story.append(Paragraph(_safe_text(review["detailed_recommendation"]), styles["Normal"]))
        story.append(Spacer(1, 15))

    story.append(Spacer(1, 20))
    story.append(Paragraph("Stage 2 Reviews", styles["Heading2"]))
    story.append(Spacer(1, 10))
    if not report["stage2_reviews"]:
        story.append(Paragraph("No Stage 2 reviews completed yet.", styles["Normal"]))
    for review in report["stage2_reviews"]:
        story.append(Paragraph(f"<b>{_safe_text(review['reviewer_label'])}</b>", styles["Heading3"]))
        if review.get("error"):
            story.append(Paragraph(_safe_text(review["error"]), styles["Normal"]))
            story.append(Spacer(1, 15))
            continue

        story.append(Paragraph(f"<b>Concerns Addressed:</b> {_safe_text(review['concerns_addressed'])}", styles["Normal"]))
        story.append(Paragraph(f"<b>Recommendation:</b> {_safe_text(review['recommendation'])}", styles["Normal"]))
        if review.get("revised_score") is not None:
            story.append(Paragraph(f"<b>Revised Score:</b> {_safe_text(review['revised_score'])}%", styles["Normal"]))
        if review.get("technical_comments"):
            story.append(Paragraph("<b>Technical Comments:</b>", styles["Normal"]))
            story.append(Paragraph(_safe_text(review["technical_comments"]), styles["Normal"]))
        if review.get("budget_comments"):
            story.append(Paragraph("<b>Budget Comments:</b>", styles["Normal"]))
            story.append(Paragraph(_safe_text(review["budget_comments"]), styles["Normal"]))
        story.append(Spacer(1, 15))

    story.append(Spacer(1, 30))
    story.append(Paragraph(
        f"Generated on {timezone.localtime().strftime('%Y-%m-%d %H:%M:%S')}",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, textColor=colors.grey),
    ))

    try:
        doc.build(story)
    except Exception:
        logger.exception("Failed to generate combined review PDF for proposal_id=%s", proposal.id)
        raise
    buffer.seek(0)
    return buffer


def generate_summary_report(cycle):
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ImportError:
        buffer = io.BytesIO()
        buffer.write(b"Report generation requires reportlab.")
        buffer.seek(0)
        return buffer

    report = _get_cycle_summary_data(cycle)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()

    story.append(Paragraph("CTRG Grant Cycle Summary Report", styles["Heading1"]))
    story.append(Paragraph(f"{_safe_text(report['cycle_name'])} ({_safe_text(report['cycle_year'])})", styles["Heading2"]))
    story.append(Spacer(1, 20))

    stats = [["Status", "Count"]]
    stats.extend([[label, str(value)] for label, value in report["status_rows"]])
    table = Table(stats, colWidths=[3 * inch, 1.5 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 1, colors.black),
    ]))
    story.append(table)
    story.append(Spacer(1, 15))

    story.append(Paragraph("Acceptance Rates", styles["Heading2"]))
    story.append(Spacer(1, 8))
    rates_data = [
        ["Metric", "Value"],
        ["Stage 1 Acceptance Rate", report["stage1_acceptance_rate"]],
        ["Final Acceptance Rate", report["final_acceptance_rate"]],
    ]
    rates_table = Table(rates_data, colWidths=[3 * inch, 1.5 * inch])
    rates_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ("FONTNAME", (1, 1), (-1, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 1, colors.black),
    ]))
    story.append(rates_table)
    story.append(Spacer(1, 20))

    story.append(Paragraph("Reviewer Workload Summary", styles["Heading2"]))
    story.append(Spacer(1, 8))
    workload_rows = [["Reviewer", "Department", "Stage 1", "Stage 2", "Total", "Pending"]]
    for row in report["reviewer_workloads"]:
        workload_rows.append([
            _safe_text(row["reviewer"]),
            _safe_text(row["department"]),
            str(row["stage1"]),
            str(row["stage2"]),
            str(row["total"]),
            str(row["pending"]),
        ])
    if len(workload_rows) > 1:
        workload_table = Table(workload_rows, colWidths=[1.8 * inch, 1.2 * inch, 0.6 * inch, 0.6 * inch, 0.6 * inch, 0.7 * inch])
        workload_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (2, 1), (-1, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ]))
        story.append(workload_table)
    else:
        story.append(Paragraph("No reviewer assignments for this cycle.", styles["Normal"]))

    story.append(Spacer(1, 20))
    story.append(Paragraph(
        f"Generated on {timezone.localtime().strftime('%Y-%m-%d %H:%M:%S')}",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, textColor=colors.grey),
    ))

    try:
        doc.build(story)
    except Exception:
        logger.exception("Failed to generate cycle summary PDF for cycle_id=%s", cycle.id)
        raise
    buffer.seek(0)
    return buffer


def generate_combined_review_docx(proposal):
    try:
        from docx import Document
    except ImportError:
        buffer = io.BytesIO()
        buffer.write(b"Report generation requires python-docx.")
        buffer.seek(0)
        return buffer

    report = _get_combined_review_data(proposal)
    document = Document()
    document.add_heading("Combined Review Report", level=1)

    for label, value in [
        ("Proposal Code", report["proposal_code"]),
        ("Title", report["title"]),
        ("PI", report["pi_name"]),
        ("Department", report["pi_department"]),
        ("Funding Requested", report["fund_requested_text"]),
        ("Status", report["status_display"]),
    ]:
        document.add_paragraph(f"{label}: {value}")

    document.add_heading("Stage 1 Reviews", level=2)
    if not report["stage1_reviews"]:
        document.add_paragraph("No Stage 1 reviews completed yet.")
    for review in report["stage1_reviews"]:
        document.add_heading(review["reviewer_label"], level=3)
        if review.get("error"):
            document.add_paragraph(review["error"])
            continue
        table = document.add_table(rows=1, cols=3)
        header = table.rows[0].cells
        header[0].text = "Criteria"
        header[1].text = "Score"
        header[2].text = "Max"
        for criterion_name, score_value, max_value in review["criteria"]:
            row = table.add_row().cells
            row[0].text = criterion_name
            row[1].text = str(score_value)
            row[2].text = str(max_value)
        for label, value in [
            ("Total", review["total_score"]),
            ("Percentage", f"{review['percentage_score']}%"),
            ("Weighted Score", f"{review['weighted_percentage_score']}%"),
        ]:
            row = table.add_row().cells
            row[0].text = label
            row[1].text = str(value)
            row[2].text = "-"
        if review.get("narrative_comments"):
            document.add_paragraph(f"Comments: {review['narrative_comments']}")
        if review.get("recommendation"):
            document.add_paragraph(f"Recommendation: {review['recommendation']}")
        if review.get("detailed_recommendation"):
            document.add_paragraph(f"Detailed Recommendation: {review['detailed_recommendation']}")

    document.add_heading("Stage 2 Reviews", level=2)
    if not report["stage2_reviews"]:
        document.add_paragraph("No Stage 2 reviews completed yet.")
    for review in report["stage2_reviews"]:
        document.add_heading(review["reviewer_label"], level=3)
        if review.get("error"):
            document.add_paragraph(review["error"])
            continue
        document.add_paragraph(f"Concerns Addressed: {review['concerns_addressed']}")
        document.add_paragraph(f"Recommendation: {review['recommendation']}")
        if review.get("revised_score") is not None:
            document.add_paragraph(f"Revised Score: {review['revised_score']}%")
        if review.get("technical_comments"):
            document.add_paragraph(f"Technical Comments: {review['technical_comments']}")
        if review.get("budget_comments"):
            document.add_paragraph(f"Budget Comments: {review['budget_comments']}")

    document.add_paragraph(f"Generated on {timezone.localtime().strftime('%Y-%m-%d %H:%M:%S')}")
    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer


def generate_summary_report_docx(cycle):
    try:
        from docx import Document
    except ImportError:
        buffer = io.BytesIO()
        buffer.write(b"Report generation requires python-docx.")
        buffer.seek(0)
        return buffer

    report = _get_cycle_summary_data(cycle)
    document = Document()
    document.add_heading("CTRG Grant Cycle Summary Report", level=1)
    document.add_paragraph(f"{report['cycle_name']} ({report['cycle_year']})")

    document.add_heading("Status Breakdown", level=2)
    status_table = document.add_table(rows=1, cols=2)
    status_header = status_table.rows[0].cells
    status_header[0].text = "Status"
    status_header[1].text = "Count"
    for label, value in report["status_rows"]:
        row = status_table.add_row().cells
        row[0].text = str(label)
        row[1].text = str(value)

    document.add_heading("Acceptance Rates", level=2)
    rates_table = document.add_table(rows=1, cols=2)
    rates_header = rates_table.rows[0].cells
    rates_header[0].text = "Metric"
    rates_header[1].text = "Value"
    for label, value in [
        ("Stage 1 Acceptance Rate", report["stage1_acceptance_rate"]),
        ("Final Acceptance Rate", report["final_acceptance_rate"]),
    ]:
        row = rates_table.add_row().cells
        row[0].text = label
        row[1].text = value

    document.add_heading("Reviewer Workload Summary", level=2)
    if not report["reviewer_workloads"]:
        document.add_paragraph("No reviewer assignments for this cycle.")
    else:
        workload_table = document.add_table(rows=1, cols=6)
        header = workload_table.rows[0].cells
        for index, heading in enumerate(["Reviewer", "Department", "Stage 1", "Stage 2", "Total", "Pending"]):
            header[index].text = heading
        for row_data in report["reviewer_workloads"]:
            row = workload_table.add_row().cells
            row[0].text = row_data["reviewer"]
            row[1].text = row_data["department"] or "-"
            row[2].text = str(row_data["stage1"])
            row[3].text = str(row_data["stage2"])
            row[4].text = str(row_data["total"])
            row[5].text = str(row_data["pending"])

    document.add_paragraph(f"Generated on {timezone.localtime().strftime('%Y-%m-%d %H:%M:%S')}")
    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer
