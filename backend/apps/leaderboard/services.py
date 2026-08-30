"""
Ranking a user against their study friends.

There is deliberately no model and no table in this app. A leaderboard is not a
fact worth storing - it is a question asked of two things that already exist:
who your accepted friends are, and how much each of you has actually studied.
Storing it would only create rows that go stale the moment anyone finishes a
session.
"""

from django.db.models import Sum

from apps.friends.services import get_user_friends
from apps.study.models import StudySession
from apps.study.services import get_current_month_range, get_current_week_range


def get_focused_minutes_by_user(users, start_date, end_date):
    """
    Totals each user's completed focused minutes over a range of days.

    One grouped query for everybody rather than one per person, and it returns
    only the people who actually studied - the caller fills in zero for the
    rest, so a quiet friend is not silently dropped from the board.
    """
    totals = (
        StudySession.objects.filter(
            user__in=users,
            status=StudySession.Status.COMPLETED,
            started_at__date__gte=start_date,
            started_at__date__lte=end_date,
        )
        .values("user_id")
        # order_by() clears the model's default ordering. Without it Django
        # adds started_at to the GROUP BY and returns one row per session
        # instead of one row per person.
        .order_by()
        .annotate(focused_minutes=Sum("focused_minutes"))
    )

    return {row["user_id"]: row["focused_minutes"] or 0 for row in totals}


def build_leaderboard(user, start_date, end_date):
    """
    Ranks the user and their accepted friends by focused minutes in a period.

    The list of people comes from the database, never from the request, so
    nobody can put a stranger on their own board or read a stranger's totals.
    """
    # The user is always on their own board, so they can see where they stand
    # even when every friend has studied more.
    participants = [user] + get_user_friends(user)
    minutes_by_user = get_focused_minutes_by_user(participants, start_date, end_date)

    # Most minutes first. A tie is settled by username so that two requests
    # asking the same question always get the same order back.
    participants.sort(
        key=lambda participant: (
            -minutes_by_user.get(participant.id, 0),
            participant.username.lower(),
        )
    )

    entries = [
        {
            "rank": position,
            "user_id": participant.id,
            "username": participant.username,
            "focused_minutes": minutes_by_user.get(participant.id, 0),
            "is_current_user": participant.id == user.id,
        }
        for position, participant in enumerate(participants, start=1)
    ]

    # Built field by field rather than serialized from the user objects, so
    # there is no way for an email address or anything else private to travel
    # out with it.
    return {"start_date": start_date, "end_date": end_date, "entries": entries}


def get_weekly_leaderboard(user):
    """Ranks the user and their friends over the current Monday-to-Sunday week."""
    start_date, end_date = get_current_week_range()

    return {"period": "weekly", **build_leaderboard(user, start_date, end_date)}


def get_monthly_leaderboard(user):
    """Ranks the user and their friends over the current calendar month."""
    start_date, end_date = get_current_month_range()

    return {"period": "monthly", **build_leaderboard(user, start_date, end_date)}
