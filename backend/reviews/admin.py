"""
Admin configuration for the reviews module.
"""
from django.contrib import admin
from .models import ReviewerProfile, ReviewAssignment, Stage1Score, Stage2Review


@admin.register(ReviewerProfile)
class ReviewerProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'department', 'area_of_expertise', 'max_review_load', 'is_active_reviewer']
    list_filter = ['is_active_reviewer', 'department']
    search_fields = ['user__username', 'user__email', 'department', 'area_of_expertise']


@admin.register(ReviewAssignment)
class ReviewAssignmentAdmin(admin.ModelAdmin):
    list_display = ['proposal', 'reviewer', 'stage', 'status', 'deadline', 'notification_sent']
    list_filter = ['stage', 'status', 'notification_sent']
    search_fields = ['proposal__proposal_code', 'reviewer__username']
    ordering = ['-assigned_date']


@admin.register(Stage1Score)
class Stage1ScoreAdmin(admin.ModelAdmin):
    list_display = ['get_proposal', 'get_reviewer', 'total_score', 'percentage_score', 'is_draft', 'submitted_at']
    list_filter = ['is_draft', 'submitted_at']
    
    def get_proposal(self, obj):
        return obj.assignment.proposal.proposal_code
    get_proposal.short_description = 'Proposal'
    
    def get_reviewer(self, obj):
        return obj.assignment.reviewer.username
    get_reviewer.short_description = 'Reviewer'


@admin.register(Stage2Review)
class Stage2ReviewAdmin(admin.ModelAdmin):
    list_display = ['get_proposal', 'get_reviewer', 'is_chair_review', 'concerns_addressed', 'revised_recommendation', 'is_draft', 'submitted_at']
    list_filter = ['is_chair_review', 'concerns_addressed', 'revised_recommendation', 'is_draft']
    readonly_fields = ['submitted_at']
    
    def get_proposal(self, obj):
        proposal = obj.proposal or (obj.assignment.proposal if obj.assignment_id else None)
        return proposal.proposal_code if proposal else '-'
    get_proposal.short_description = 'Proposal'
    
    def get_reviewer(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.username
        if obj.assignment_id:
            return obj.assignment.reviewer.username
        return '-'
    get_reviewer.short_description = 'Reviewer'
