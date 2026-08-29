from django.urls import path

from .views import (
    ProfileStatisticsView,
    StudySessionDetailView,
    StudySessionHistoryView,
    StudySessionListCreateView,
    SubjectTotalsView,
    TodayGoalView,
    TodayStatisticsView,
    WeeklyStatisticsView,
)

urlpatterns = [
    path("sessions/", StudySessionListCreateView.as_view(), name="session-list"),
    path("sessions/<int:pk>/", StudySessionDetailView.as_view(), name="session-detail"),
    path("history/", StudySessionHistoryView.as_view(), name="session-history"),
    path("statistics/", TodayStatisticsView.as_view(), name="study-statistics"),
    path(
        "statistics/weekly/",
        WeeklyStatisticsView.as_view(),
        name="weekly-statistics",
    ),
    path("subjects/", SubjectTotalsView.as_view(), name="subject-totals"),
    path("profile/", ProfileStatisticsView.as_view(), name="profile-statistics"),
]

# Included separately under /api/goals/ by the project URLs.
goal_urlpatterns = [
    path("today/", TodayGoalView.as_view(), name="today-goal"),
]
