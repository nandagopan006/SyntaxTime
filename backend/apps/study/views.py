from django.utils import timezone
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DailyGoal, StudySession
from .serializers import (
    DailyGoalSerializer,
    StudySessionSerializer,
    StudySessionUpdateSerializer,
)
from .services import get_subject_totals, get_today_statistics, get_weekly_statistics


def get_own_sessions(request):
    """
    Returns only the sessions belonging to the signed-in user, with the optional
    subject and date filters from the query string applied.

    Every study view starts from this, which is what stops one user from reading
    another user's sessions.
    """
    sessions = StudySession.objects.filter(user=request.user)

    subject = request.query_params.get("subject")
    if subject:
        sessions = sessions.filter(subject__iexact=subject)

    date = request.query_params.get("date")
    if date:
        sessions = sessions.filter(started_at__date=date)

    start_date = request.query_params.get("start_date")
    if start_date:
        sessions = sessions.filter(started_at__date__gte=start_date)

    end_date = request.query_params.get("end_date")
    if end_date:
        sessions = sessions.filter(started_at__date__lte=end_date)

    session_status = request.query_params.get("status")
    if session_status:
        sessions = sessions.filter(status=session_status)

    # Applied last, because a queryset cannot be filtered once it is sliced.
    # This is what lets the dashboard ask for just the newest few sessions
    # instead of downloading a user's whole history to show five rows.
    limit = request.query_params.get("limit")
    if limit and limit.isdigit():
        sessions = sessions[: int(limit)]

    return sessions


class StudySessionListCreateView(generics.ListCreateAPIView):
    """GET lists the user's sessions, POST saves a finished one."""

    serializer_class = StudySessionSerializer

    def get_queryset(self):
        return get_own_sessions(self.request)

    def perform_create(self, serializer):
        # The owner comes from the JWT, never from the request body, so a user
        # cannot create a session in someone else's name.
        serializer.save(user=self.request.user)


class StudySessionHistoryView(generics.ListAPIView):
    """The same sessions as the list endpoint, named for the History page."""

    serializer_class = StudySessionSerializer

    def get_queryset(self):
        return get_own_sessions(self.request)


class StudySessionDetailView(generics.RetrieveUpdateAPIView):
    """Opens one session, and lets its optional details be filled in later."""

    def get_queryset(self):
        return StudySession.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return StudySessionUpdateSerializer
        return StudySessionSerializer


class TodayStatisticsView(APIView):
    """Saved totals for today. The running timer is not included; it lives in the browser."""

    def get(self, request):
        return Response(get_today_statistics(request.user))


class WeeklyStatisticsView(APIView):
    """Focused minutes per day for the current week, Monday to Sunday."""

    def get(self, request):
        return Response(get_weekly_statistics(request.user))


class SubjectTotalsView(APIView):
    """Completed focused minutes grouped by subject."""

    def get(self, request):
        return Response(get_subject_totals(request.user))


class TodayGoalView(APIView):
    """Reads and sets the study target for today."""

    def get(self, request):
        today = timezone.localdate()
        goal = DailyGoal.objects.filter(user=request.user, date=today).first()

        if goal is None:
            # An unset goal is reported as zero rather than 404, so the frontend
            # has one shape to render instead of two.
            return Response({"id": None, "date": today, "target_minutes": 0})

        return Response(DailyGoalSerializer(goal).data)

    def put(self, request):
        serializer = DailyGoalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        goal, _created = DailyGoal.objects.update_or_create(
            user=request.user,
            date=timezone.localdate(),
            defaults={"target_minutes": serializer.validated_data["target_minutes"]},
        )

        return Response(DailyGoalSerializer(goal).data)
