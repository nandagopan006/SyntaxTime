from django.urls import path

from .views import MonthlyLeaderboardView, WeeklyLeaderboardView

urlpatterns = [
    path("weekly/", WeeklyLeaderboardView.as_view(), name="weekly-leaderboard"),
    path("monthly/", MonthlyLeaderboardView.as_view(), name="monthly-leaderboard"),
]
