"""Study calculations that more than one view needs."""

from calendar import monthrange
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


def count_current_streak(study_dates):
    """
    Counts the consecutive days, up to today, in a set of study dates.

    A streak is only broken once a whole day has been missed, so studying
    yesterday but not yet today still counts. Without that, every streak would
    appear to reset each midnight until the first session of the day.

    Takes the dates rather than a user, so a caller that already has them does
    not have to ask the database for them again.
    """
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


def count_longest_streak(study_dates):
    """
    Returns the longest run of consecutive days in a set of study dates.

    Walks them in order, counting how long each unbroken run lasts and keeping
    the best one. This is not the same as the number of study days: studying on
    1 January and again on 1 June is two runs of one day, not a run of two.
    """
    ordered_dates = sorted(study_dates)
    if not ordered_dates:
        return 0

    longest_run = 1
    current_run = 1

    for previous_day, day in zip(ordered_dates, ordered_dates[1:]):
        if day - previous_day == timedelta(days=1):
            current_run += 1
        else:
            current_run = 1

        longest_run = max(longest_run, current_run)

    return longest_run


def get_current_streak_days(user):
    """Counts the user's current run of consecutive study days."""
    return count_current_streak(get_study_dates(user))


def get_longest_streak_days(user):
    """Returns the longest run of consecutive study days the user has had."""
    return count_longest_streak(get_study_dates(user))


def get_lifetime_totals(user):
    """
    Returns how many sessions the user has completed and how long in total.

    Cancelled sessions are excluded, and so is the session running right now,
    which has not been saved yet.
    """
    totals = get_completed_sessions(user).aggregate(
        focused_minutes=Sum("focused_minutes"),
        sessions_count=Count("id"),
    )

    return {
        # Sum() returns None when there are no rows, so fall back to zero.
        "focused_minutes": totals["focused_minutes"] or 0,
        "sessions_count": totals["sessions_count"],
    }


def get_average_session_minutes(user):
    """Returns the mean focused length of a completed session, in whole minutes."""
    totals = get_lifetime_totals(user)

    if not totals["sessions_count"]:
        return 0

    return round(totals["focused_minutes"] / totals["sessions_count"])


def get_most_studied_subject(subject_totals):
    """
    Returns the named subject the user has spent the most time on.

    Subject is optional in SyntaxTime, so sessions saved without one are time
    rather than a subject, and are skipped here. The totals arrive already
    sorted, so the first named row is the answer.
    """
    for row in subject_totals:
        if row["subject"]:
            return row["subject"]

    return ""


def get_profile_statistics(user):
    """
    Returns the user's whole study history in summary.

    Every figure is produced by the same functions Home and the leaderboard
    already use, so the profile can never quietly disagree with the rest of the
    application about a streak or a subject total.
    """
    totals = get_lifetime_totals(user)
    subjects = get_subject_totals(user)
    # Both streaks and the study-day count are answers about the same set of
    # dates, so it is read once rather than three times per request.
    study_dates = get_study_dates(user)

    return {
        "total_focused_minutes": totals["focused_minutes"],
        "total_sessions": totals["sessions_count"],
        "current_streak_days": count_current_streak(study_dates),
        "longest_streak_days": count_longest_streak(study_dates),
        "average_session_minutes": get_average_session_minutes(user),
        # Unique calendar dates, not sessions: three sessions on one evening
        # are one study day.
        "total_study_days": len(study_dates),
        "most_studied_subject": get_most_studied_subject(subjects),
        "subjects": subjects,
    }


def get_current_week_range():
    """
    Returns the Monday and Sunday of the week containing today.

    A SyntaxTime week runs Monday to Sunday. Defined once here so the weekly
    chart on Home and the weekly leaderboard can never disagree about which
    days they are counting.
    """
    today = timezone.localdate()
    monday = today - timedelta(days=today.weekday())

    return monday, monday + timedelta(days=6)


def get_current_month_range():
    """
    Returns the first and last day of the current calendar month.

    A calendar month, not the last thirty days: sessions from 31 July never
    count towards August.
    """
    today = timezone.localdate()
    last_day = monthrange(today.year, today.month)[1]

    return today.replace(day=1), today.replace(day=last_day)


def get_weekly_statistics(user):
    """
    Returns focused minutes for each day of the current week, Monday to Sunday.

    Days without study are included with zero, so the chart always draws seven
    bars and a quiet day is visible as a gap rather than missing entirely.
    """
    monday, sunday = get_current_week_range()

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
