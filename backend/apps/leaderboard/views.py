from rest_framework.response import Response
from rest_framework.views import APIView

from .services import get_monthly_leaderboard, get_weekly_leaderboard

"""
Two read-only views, because a leaderboard is only ever read.

There is nothing to create, update or delete: the ranking is worked out from
the friendships and study sessions that already exist, so a POST or a DELETE
here would have no meaning.
"""


class WeeklyLeaderboardView(APIView):
    """The user and their accepted friends, ranked over the current week."""

    def get(self, request):
        return Response(get_weekly_leaderboard(request.user))


class MonthlyLeaderboardView(APIView):
    """The user and their accepted friends, ranked over the current month."""

    def get(self, request):
        return Response(get_monthly_leaderboard(request.user))
