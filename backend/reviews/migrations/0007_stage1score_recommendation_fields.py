"""
Add recommendation fields to Stage1Score for report-ready Stage 1 workflow.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0006_reviewerprofile_department'),
    ]

    operations = [
        migrations.AddField(
            model_name='stage1score',
            name='recommendation',
            field=models.CharField(
                blank=True,
                choices=[
                    ('ACCEPT', 'Accept'),
                    ('TENTATIVELY_ACCEPT', 'Tentatively Accept'),
                    ('REJECT', 'Reject'),
                ],
                default='',
                help_text="Reviewer's recommendation based on Stage 1 evaluation",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name='stage1score',
            name='detailed_recommendation',
            field=models.TextField(
                blank=True,
                default='',
                help_text='Detailed recommendation notes for inclusion in reports',
            ),
        ),
    ]
