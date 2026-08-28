from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.db import models


class StudySession(models.Model):
    """One finished focus session: how long the user studied, and optionally what on."""

    class Status(models.TextChoices):
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="study_sessions",
    )

    # Subject, topic and notes are optional on purpose: the user must be able to
    # start studying without filling in a form first. They use blank=True with an
    # empty-string default rather than null=True, so "no subject" has exactly one
    # representation in the database instead of two (NULL and "").
    subject = models.CharField(max_length=100, blank=True, default="")
    topic = models.CharField(max_length=200, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    # The focus period the user chose before starting.
    planned_minutes = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    # The time actually spent focused. Paused and break time are excluded, so this
    # is usually lower than planned_minutes. Every statistic is built on this field.
    focused_minutes = models.PositiveIntegerField(default=0)

    started_at = models.DateTimeField()

    # Left empty for a session that never reached an end, so no code has to
    # invent a completion time that did not happen.
    completed_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.COMPLETED,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # History shows the most recent session first.
        ordering = ["-started_at"]

    def __str__(self):
        studied = self.subject or "General Study"
        return f"{self.user.username} - {studied} - {self.focused_minutes} min"


class DailyGoal(models.Model):
    """How many minutes the user aims to focus on one particular date."""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="daily_goals",
    )

    date = models.DateField()

    target_minutes = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            # A date can only have one target, so setting a new one updates the
            # existing row instead of quietly creating a second, conflicting goal.
            models.UniqueConstraint(
                fields=["user", "date"],
                name="unique_daily_goal_per_user_and_date",
            )
        ]
        ordering = ["-date"]

    def __str__(self):
        return f"{self.user.username} - {self.date} - {self.target_minutes} min"
