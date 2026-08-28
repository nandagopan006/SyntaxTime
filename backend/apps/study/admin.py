from django.contrib import admin

from .models import DailyGoal, StudySession


@admin.register(StudySession)
class StudySessionAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "subject",
        "topic",
        "planned_minutes",
        "focused_minutes",
        "status",
        "started_at",
    )
    list_filter = ("status", "subject", "started_at")
    search_fields = ("user__username", "subject", "topic", "notes")


@admin.register(DailyGoal)
class DailyGoalAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "target_minutes")
    list_filter = ("date",)
    search_fields = ("user__username",)
