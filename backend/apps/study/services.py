"""Study calculations that more than one view needs."""

from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
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
        "current_streak_days": get_current_streak_days(user),
        "average_session_minutes": get_average_session_minutes(user),
        "subjects": get_subject_totals(user, on_date=today),
    }


def get_study_dates(user):
    """
    Returns the set of local calendar dates the user completed a session on.

    TruncDate converts each stored UTC timestamp into the project timezone
    before taking the date, for the same reason localdate() is used above.
    """
    return set(
        get_completed_sessions(user)
        .annotate(day=TruncDate("started_at"))
        .values_list("day", flat=True)
        # order_by() clears the model's default ordering. Without it Django adds
        # started_at to the query and distinct() then sees every session as
        # different, returning one row per session instead of one per day.
        .order_by()
        .distinct()
    )


def get_current_streak_days(user):
    """
    Counts the consecutive days, up to today, on which the user studied.

    A streak is only broken once a whole day has been missed, so studying
    yesterday but not yet today still counts. Without that, every streak would
    appear to reset each midnight until the first session of the day.
    """
    study_dates = get_study_dates(user)
    today = timezone.localdate()
    yesterday = today - timedelta(days=1)

    if today in study_dates:
        day = today
    elif yesterday in study_dates:
        day = yesterday
    else:
        return 0

    streak_days = 0
    while day in study_dates:
        streak_days += 1
        day -= timedelta(days=1)

    return streak_days


def get_average_session_minutes(user):
    """
    Returns the mean focused length of a completed session, in whole minutes.

    Cancelled sessions are excluded, and so is the session running right now,
    which has not been saved yet.
    """
    totals = get_completed_sessions(user).aggregate(
        focused_minutes=Sum("focused_minutes"),
        sessions_count=Count("id"),
    )

    if not totals["sessions_count"]:
        return 0

    return round((totals["focused_minutes"] or 0) / totals["sessions_count"])


def get_weekly_statistics(user):
    """
    Returns focused minutes for each day of the current week, Monday to Sunday.

    Days without study are included with zero, so the chart always draws seven
    bars and a quiet day is visible as a gap rather than missing entirely.
    """
    today = timezone.localdate()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)

    # order_by() is required, not decoration: the model orders by started_at by
    # default, and Django would otherwise add that column to the GROUP BY and
    # return one row per session instead of one row per day.
    daily_totals = (
        get_completed_sessions(user)
        .filter(started_at__date__gte=monday, started_at__date__lte=sunday)
        .annotate(day=TruncDate("started_at"))
        .values("day")
        .annotate(focused_minutes=Sum("focused_minutes"))
        .order_by("day")
    )
    minutes_by_date = {row["day"]: row["focused_minutes"] for row in daily_totals}

    days = []
    for offset in range(7):
        date = monday + timedelta(days=offset)
        days.append({"date": date, "focused_minutes": minutes_by_date.get(date, 0)})

    return {"start_date": monday, "end_date": sunday, "days": days}


def get_subject_totals(user, on_date=None):
    """
    Returns completed focused minutes grouped by subject, largest first.

    With on_date the totals cover that single day, which is what the Home
    dashboard shows. Without it they cover every session the user has saved.
    """
    sessions = get_completed_sessions(user)
    if on_date is not None:
        sessions = sessions.filter(started_at__date=on_date)

    return list(
        sessions.values("subject")
        .annotate(
            focused_minutes=Sum("focused_minutes"),
            sessions_count=Count("id"),
        )
        .order_by("-focused_minutes")
    )
