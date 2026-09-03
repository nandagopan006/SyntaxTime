from django.db.models import Q
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import generics
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DailyGoal, StudySession
from .serializers import (
    DailyGoalSerializer,
    StudySessionSerializer,
    StudySessionUpdateSerializer,
)
from .services import (
    get_archive_start_date,
    get_profile_statistics,
    get_subject_totals,
    get_today_statistics,
    get_weekly_statistics,
    summarise_sessions,
)


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

    # One box that looks through everything the user wrote down. Searching the
    # notes matters most: "JWT" is the word someone remembers months later,
    # and it is usually in the notes rather than in the subject.
    search = request.query_params.get("search")
    if search:
        sessions = sessions.filter(
            Q(subject__icontains=search)
            | Q(topic__icontains=search)
            | Q(notes__icontains=search)
        )

    return sessions


class StudySessionListCreateView(generics.ListCreateAPIView):
    """GET lists the user's sessions, POST saves a finished one."""

    serializer_class = StudySessionSerializer

    def get_queryset(self):
        sessions = get_own_sessions(self.request)

        # Sliced here rather than in get_own_sessions, because a sliced queryset
        # can no longer be filtered or reordered, and the History view below
        # needs to do both. This is how the dashboard asks for just the newest
        # few sessions instead of downloading a whole history to show five rows.
        limit = self.request.query_params.get("limit")
        if limit and limit.isdigit():
            return sessions[: int(limit)]

        return sessions

    def perform_create(self, serializer):
        """
        Saves the finished session, or returns the one already saved.

        One session cannot begin twice at the same instant, so the moment it
        started identifies it. Sending the same session again therefore updates
        that record rather than creating a second - which is what stops a slow
        network, a retry or an impatient second click from turning seventy
        minutes of study into two hundred and eighty.

        The owner comes from the JWT, never from the request body, so a user
        cannot create a session in someone else's name.
        """
        started_at = serializer.validated_data.get("started_at")

        existing = StudySession.objects.filter(
            user=self.request.user, started_at=started_at
        ).first()

        if existing is not None:
            # A repeat of a session already recorded. The later attempt may
            # carry details the first did not, so it is applied to the row that
            # exists instead of being thrown away.
            serializer.instance = existing

        serializer.save(user=self.request.user)


class HistoryPagination(PageNumberPagination):
    """
    Pages the History list, and only the History list.

    A user builds up study sessions forever, so this is the one endpoint that
    would eventually return thousands of rows. It is set on the view instead of
    in settings so the other endpoints keep returning a plain array, which is
    what the dashboard already reads.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class StudySessionHistoryView(generics.ListAPIView):
    """
    The completed sessions behind the History page, newest first.

    Cancelled sessions are deliberately excluded rather than filterable:
    History is the record of study that actually happened, and it is built from
    the same sessions the statistics are.
    """

    serializer_class = StudySessionSerializer
    pagination_class = HistoryPagination

    def get_queryset(self):
        return (
            get_own_sessions(self.request)
            .filter(status=StudySession.Status.COMPLETED)
            # Ordered by when the work finished. A 90 minute session begun at
            # 8pm ends after a 25 minute one begun at 8:30, so ordering by the
            # start time would show them the wrong way round. created_at stands
            # in for a session with no completion time, and the id makes the
            # order fully deterministic when two sessions end together.
            .order_by(Coalesce("completed_at", "created_at").desc(), "-id")
        )


class StudyHistorySummaryView(APIView):
    """
    Totals for whatever slice of history is being looked at.

    Takes the same query parameters as the history list and starts from the
    same queryset, so the figures above the archive always describe the
    sessions below it - including when a subject or a search has narrowed
    them. Counting in Django rather than the browser is also what lets History
    stay on one page of results: the totals cover the whole month, not just
    the rows that have been fetched.
    """

    def get(self, request):
        sessions = get_own_sessions(request).filter(
            status=StudySession.Status.COMPLETED
        )

        return Response(
            {
                **summarise_sessions(sessions),
                # Deliberately the whole archive rather than this month, which
                # is why it is named for the archive: the year picker needs to
                # know how far back the record goes, and asking here saves a
                # second request for one date.
                "archive_start_date": get_archive_start_date(request.user),
            }
        )


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


class ProfileStatisticsView(APIView):
    """
    The signed-in user's whole study history in summary.

    Always their own: the user comes from the request's token, so there is no
    way to ask for somebody else's overview. This is a private page, not a
    public profile.
    """

    def get(self, request):
        return Response(get_profile_statistics(request.user))


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
