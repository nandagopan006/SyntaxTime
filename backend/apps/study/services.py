"""Study calculations that more than one view needs."""

from django.db.models import Count, Sum
from django.utils import timezone

from .models import DailyGoal, StudySession


def get_completed_sessions(user):
    """Returns the user's sessions that count toward statistics."""
    return StudySession.objects.filter(
        user=user, status=StudySession.Status.COMPLETED
    )


def get_today_statistics(user):
    """Returns saved study totals for the user's current local day."""
    # localdate() converts the current moment into the project's timezone before
    # taking the date. A session finished at 00:30 IST is stored as 19:00 UTC the
    # previous day, so comparing UTC dates would file it under the wrong day.
    today = timezone.localdate()

    totals = get_completed_sessions(user).filter(started_at__date=today).aggregate(
        focused_minutes=Sum("focused_minutes"),
        sessions_count=Count("id"),
    )

    goal = DailyGoal.objects.filter(user=user, date=today).first()

    return {
        "date": today,
        # Sum() returns None when there are no rows, so fall back to zero.
        "today_focused_minutes": totals["focused_minutes"] or 0,
        "today_sessions_count": totals["sessions_count"],
        "daily_target_minutes": goal.target_minutes if goal else 0,
    }


def get_subject_totals(user):
    """Returns completed focused minutes grouped by subject, largest first."""
    return list(
        get_completed_sessions(user)
        .values("subject")
        .annotate(
            focused_minutes=Sum("focused_minutes"),
            sessions_count=Count("id"),
        )
        .order_by("-focused_minutes")
    )
