"""
Admin configuration for the proposals module.
"""
from django.contrib import admin
from .models import (
    GrantCycle, Proposal, Stage1Decision, FinalDecision, AuditLog,
    ResearchArea, Keyword, ResearchAreaKeyword, ProposalKeyword
)


@admin.register(GrantCycle)
class GrantCycleAdmin(admin.ModelAdmin):
    list_display = ['name', 'year', 'start_date', 'end_date', 'is_active', 'created_at']
    list_filter = ['is_active', 'year']
    search_fields = ['name', 'year']
    ordering = ['-year', '-created_at']
    date_hierarchy = 'start_date'


@admin.register(Proposal)
class ProposalAdmin(admin.ModelAdmin):
    list_display = [
        'proposal_code', 'title', 'pi_name', 'created_by', 'submitted_by', 'cycle', 'status',
        'primary_research_area', 'fund_requested', 'submitted_at'
    ]
    list_filter = ['status', 'cycle', 'pi_department', 'primary_research_area']
    search_fields = ['proposal_code', 'title', 'pi_name', 'pi_email', 'keywords__name']
    ordering = ['-created_at']
    readonly_fields = ['proposal_code', 'display_keywords', 'created_at', 'updated_at', 'submitted_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'proposal_code', 'title', 'abstract', 'cycle', 'status',
                'created_by', 'submitted_by', 'primary_research_area', 'display_keywords', 'is_locked'
            )
        }),
        ('PI Information', {
            'fields': ('pi_name', 'pi_department', 'pi_email', 'co_investigators')
        }),
        ('Funding & Files', {
            'fields': ('fund_requested', 'proposal_file', 'application_template_file', 
                      'revised_proposal_file', 'response_to_reviewers_file')
        }),
        ('Timestamps', {
            'fields': ('revision_deadline', 'created_at', 'submitted_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def display_keywords(self, obj):
        return ', '.join(obj.keywords.values_list('name', flat=True))
    display_keywords.short_description = 'Keywords'


@admin.register(Stage1Decision)
class Stage1DecisionAdmin(admin.ModelAdmin):
    list_display = ['proposal', 'decision', 'average_score', 'decision_date']
    list_filter = ['decision', 'decision_date']
    search_fields = ['proposal__proposal_code', 'proposal__title']


@admin.register(FinalDecision)
class FinalDecisionAdmin(admin.ModelAdmin):
    list_display = ['proposal', 'decision', 'approved_grant_amount', 'decision_date']
    list_filter = ['decision', 'decision_date']
    search_fields = ['proposal__proposal_code', 'proposal__title']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['action_type', 'user', 'proposal', 'timestamp']
    list_filter = ['action_type', 'timestamp']
    search_fields = ['user__username', 'proposal__proposal_code']
    readonly_fields = ['user', 'action_type', 'proposal', 'timestamp', 'details']


@admin.register(ResearchArea)
class ResearchAreaAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'description']


@admin.register(Keyword)
class KeywordAdmin(admin.ModelAdmin):
    list_display = ['name', 'normalized_name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'normalized_name']


@admin.register(ResearchAreaKeyword)
class ResearchAreaKeywordAdmin(admin.ModelAdmin):
    list_display = ['research_area', 'keyword', 'weight', 'created_at']
    list_filter = ['research_area']
    search_fields = ['research_area__name', 'keyword__name']


@admin.register(ProposalKeyword)
class ProposalKeywordAdmin(admin.ModelAdmin):
    list_display = ['proposal', 'keyword', 'created_at']
    list_filter = ['keyword']
    search_fields = ['proposal__proposal_code', 'proposal__title', 'keyword__name']
