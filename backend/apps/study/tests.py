from datetime import timedelta

from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import DailyGoal, StudySession


def build_session_payload(**overrides):
    """Builds a valid create-session body that individual tests can adjust."""
    started_at = timezone.now() - timedelta(minutes=50)
    payload = {
        "planned_minutes": 50,
        "focused_minutes": 47,
        "subject": "JavaScript",
        "topic": "Promises",
        "started_at": started_at.isoformat(),
        "completed_at": timezone.now().isoformat(),
        "status": "completed",
        "notes": "Learned Promise.all.",
    }
    payload.update(overrides)
    return payload


class StudyAPITestCase(APITestCase):
    """Shared users and helpers for the study API tests."""

    def setUp(self):
        self.nandhu = User.objects.create_user(
            username="nandhu", email="nandhu@example.com", password="StudyFocus2026!"
        )
        self.abhay = User.objects.create_user(
            username="abhay", email="abhay@example.com", password="StudyFocus2026!"
        )
        self.client.force_authenticate(user=self.nandhu)

    def create_session(self, user=None, **fields):
        """Creates a session directly, for tests that need data already in place."""
        defaults = {
            "user": user or self.nandhu,
            "planned_minutes": 50,
            "focused_minutes": 47,
            "started_at": timezone.now() - timedelta(minutes=50),
            "completed_at": timezone.now(),
            "status": StudySession.Status.COMPLETED,
        }
        defaults.update(fields)
        return StudySession.objects.create(**defaults)


class AuthenticationTests(StudyAPITestCase):
    def test_anonymous_request_is_rejected(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse("session-list"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_request_is_accepted(self):
        response = self.client.get(reverse("session-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_every_study_endpoint_requires_authentication(self):
        self.client.force_authenticate(user=None)
        endpoints = ("session-history", "study-statistics", "subject-totals", "today-goal")
        for url_name in endpoints:
            response = self.client.get(reverse(url_name))
            self.assertEqual(
                response.status_code, status.HTTP_401_UNAUTHORIZED, msg=url_name
            )


class CreateSessionTests(StudyAPITestCase):
    def test_valid_session_is_created(self):
        response = self.client.post(
            reverse("session-list"), build_session_payload(), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["focused_minutes"], 47)

    def test_session_without_subject_topic_or_notes_is_valid(self):
        payload = build_session_payload(
            planned_minutes=25, focused_minutes=25, subject="", topic="", notes=""
        )
        response = self.client.post(reverse("session-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["subject"], "")

    def test_optional_fields_may_be_omitted_entirely(self):
        payload = build_session_payload()
        for field in ("subject", "topic", "notes"):
            payload.pop(field)
        response = self.client.post(reverse("session-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["topic"], "")

    def test_null_optional_fields_are_stored_as_empty_strings(self):
        payload = build_session_payload(subject=None, topic=None, notes=None)
        response = self.client.post(reverse("session-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["subject"], "")
        self.assertEqual(response.data["notes"], "")

    def test_owner_is_taken_from_the_token_not_the_request_body(self):
        payload = build_session_payload()
        payload["user"] = self.abhay.id
        response = self.client.post(reverse("session-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        saved = StudySession.objects.get(id=response.data["id"])
        self.assertEqual(saved.user, self.nandhu)

    def test_negative_focused_minutes_is_rejected(self):
        response = self.client.post(
            reverse("session-list"),
            build_session_payload(focused_minutes=-5),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("focused_minutes", response.data)

    def test_zero_planned_minutes_is_rejected(self):
        response = self.client.post(
            reverse("session-list"),
            build_session_payload(planned_minutes=0, focused_minutes=0),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_focused_minutes_cannot_exceed_planned_minutes(self):
        response = self.client.post(
            reverse("session-list"),
            build_session_payload(planned_minutes=25, focused_minutes=40),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("focused_minutes", response.data)

    def test_completed_session_requires_a_completion_time(self):
        response = self.client.post(
            reverse("session-list"),
            build_session_payload(completed_at=None),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_status_is_rejected(self):
        response = self.client.post(
            reverse("session-list"),
            build_session_payload(status="paused_forever"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class OwnershipTests(StudyAPITestCase):
    def test_user_can_open_their_own_session(self):
        session = self.create_session()
        response = self.client.get(reverse("session-detail", args=[session.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_cannot_open_another_users_session(self):
        other_session = self.create_session(user=self.abhay)
        response = self.client.get(reverse("session-detail", args=[other_session.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_cannot_update_another_users_session(self):
        other_session = self.create_session(user=self.abhay)
        response = self.client.patch(
            reverse("session-detail", args=[other_session.id]),
            {"subject": "Hijacked"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        other_session.refresh_from_db()
        self.assertNotEqual(other_session.subject, "Hijacked")


class HistoryTests(StudyAPITestCase):
    def test_only_the_signed_in_users_sessions_are_returned(self):
        self.create_session(subject="JavaScript")
        self.create_session(user=self.abhay, subject="Django")

        response = self.client.get(reverse("session-history"))
        subjects = [item["subject"] for item in response.data]
        self.assertEqual(subjects, ["JavaScript"])

    def test_sessions_are_returned_newest_first(self):
        self.create_session(
            subject="Older", started_at=timezone.now() - timedelta(days=2)
        )
        self.create_session(
            subject="Newer", started_at=timezone.now() - timedelta(hours=1)
        )

        response = self.client.get(reverse("session-history"))
        self.assertEqual(response.data[0]["subject"], "Newer")

    def test_filtering_by_subject(self):
        self.create_session(subject="JavaScript")
        self.create_session(subject="Django")

        response = self.client.get(reverse("session-history"), {"subject": "django"})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["subject"], "Django")

    def test_filtering_by_date(self):
        self.create_session(
            subject="Old", started_at=timezone.now() - timedelta(days=2)
        )
        self.create_session(subject="Today")

        response = self.client.get(
            reverse("session-history"), {"date": timezone.localdate().isoformat()}
        )
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["subject"], "Today")

    def test_filtering_by_date_range(self):
        self.create_session(
            subject="Old", started_at=timezone.now() - timedelta(days=10)
        )
        self.create_session(
            subject="Recent", started_at=timezone.now() - timedelta(days=1)
        )

        response = self.client.get(
            reverse("session-history"),
            {
                "start_date": (timezone.localdate() - timedelta(days=3)).isoformat(),
                "end_date": timezone.localdate().isoformat(),
            },
        )
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["subject"], "Recent")


class UpdateSessionTests(StudyAPITestCase):
    def test_optional_details_can_be_added_later(self):
        session = self.create_session(subject="", topic="", notes="")

        response = self.client.patch(
            reverse("session-detail", args=[session.id]),
            {
                "subject": "Python",
                "topic": "Django REST Authentication",
                "notes": "Learned the JWT flow.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.subject, "Python")
        self.assertEqual(session.notes, "Learned the JWT flow.")

    def test_measured_fields_cannot_be_edited(self):
        session = self.create_session(focused_minutes=47, planned_minutes=50)

        response = self.client.patch(
            reverse("session-detail", args=[session.id]),
            {"focused_minutes": 999, "planned_minutes": 999, "status": "cancelled"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.focused_minutes, 47)
        self.assertEqual(session.planned_minutes, 50)
        self.assertEqual(session.status, StudySession.Status.COMPLETED)

    def test_ownership_cannot_be_changed(self):
        session = self.create_session()

        self.client.patch(
            reverse("session-detail", args=[session.id]),
            {"user": self.abhay.id, "subject": "Still mine"},
            format="json",
        )

        session.refresh_from_db()
        self.assertEqual(session.user, self.nandhu)


class DailyGoalTests(StudyAPITestCase):
    def test_today_goal_defaults_to_zero_when_not_set(self):
        response = self.client.get(reverse("today-goal"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["target_minutes"], 0)

    def test_setting_and_reading_todays_goal(self):
        response = self.client.put(
            reverse("today-goal"), {"target_minutes": 240}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.get(reverse("today-goal"))
        self.assertEqual(response.data["target_minutes"], 240)

    def test_setting_the_goal_twice_updates_instead_of_duplicating(self):
        self.client.put(reverse("today-goal"), {"target_minutes": 240}, format="json")
        self.client.put(reverse("today-goal"), {"target_minutes": 300}, format="json")

        self.assertEqual(DailyGoal.objects.filter(user=self.nandhu).count(), 1)
        self.assertEqual(DailyGoal.objects.get(user=self.nandhu).target_minutes, 300)

    def test_negative_target_is_rejected(self):
        response = self.client.put(
            reverse("today-goal"), {"target_minutes": -10}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_one_user_cannot_see_another_users_goal(self):
        DailyGoal.objects.create(
            user=self.abhay, date=timezone.localdate(), target_minutes=600
        )
        response = self.client.get(reverse("today-goal"))
        self.assertEqual(response.data["target_minutes"], 0)


class StatisticsTests(StudyAPITestCase):
    def setUp(self):
        super().setUp()
        # The four sessions described in the phase specification.
        self.create_session(
            subject="JavaScript", topic="Promises", planned_minutes=50, focused_minutes=47
        )
        self.create_session(
            subject="Python", topic="Django REST", planned_minutes=60, focused_minutes=54
        )
        self.create_session(subject="", topic="", planned_minutes=25, focused_minutes=25)
        self.create_session(
            subject="React",
            topic="useMemo",
            planned_minutes=50,
            focused_minutes=0,
            status=StudySession.Status.CANCELLED,
        )

    def test_today_focused_total_excludes_cancelled_sessions(self):
        response = self.client.get(reverse("study-statistics"))
        self.assertEqual(response.data["today_focused_minutes"], 126)  # 47 + 54 + 25

    def test_session_count_excludes_cancelled_sessions(self):
        response = self.client.get(reverse("study-statistics"))
        self.assertEqual(response.data["today_sessions_count"], 3)

    def test_statistics_include_the_daily_target(self):
        self.client.put(reverse("today-goal"), {"target_minutes": 240}, format="json")
        response = self.client.get(reverse("study-statistics"))
        self.assertEqual(response.data["daily_target_minutes"], 240)

    def test_target_is_zero_when_no_goal_is_set(self):
        response = self.client.get(reverse("study-statistics"))
        self.assertEqual(response.data["daily_target_minutes"], 0)

    def test_statistics_only_count_the_signed_in_user(self):
        self.create_session(user=self.abhay, focused_minutes=500, planned_minutes=500)
        response = self.client.get(reverse("study-statistics"))
        self.assertEqual(response.data["today_focused_minutes"], 126)

    def test_older_sessions_are_not_counted_as_today(self):
        self.create_session(
            focused_minutes=99,
            planned_minutes=99,
            started_at=timezone.now() - timedelta(days=3),
        )
        response = self.client.get(reverse("study-statistics"))
        self.assertEqual(response.data["today_focused_minutes"], 126)

    def test_statistics_are_zero_for_a_user_with_no_sessions(self):
        self.client.force_authenticate(user=self.abhay)
        response = self.client.get(reverse("study-statistics"))
        self.assertEqual(response.data["today_focused_minutes"], 0)
        self.assertEqual(response.data["today_sessions_count"], 0)


class SubjectTotalsTests(StudyAPITestCase):
    def setUp(self):
        super().setUp()
        self.create_session(subject="JavaScript", planned_minutes=60, focused_minutes=60)
        self.create_session(subject="JavaScript", planned_minutes=40, focused_minutes=40)
        self.create_session(subject="Django", planned_minutes=42, focused_minutes=42)
        self.create_session(subject="", planned_minutes=25, focused_minutes=25)
        self.create_session(
            subject="React",
            planned_minutes=50,
            focused_minutes=0,
            status=StudySession.Status.CANCELLED,
        )

    def test_sessions_are_grouped_by_subject(self):
        response = self.client.get(reverse("subject-totals"))
        totals = {row["subject"]: row["focused_minutes"] for row in response.data}
        self.assertEqual(totals["JavaScript"], 100)
        self.assertEqual(totals["Django"], 42)

    def test_empty_subject_is_kept_as_its_own_group(self):
        response = self.client.get(reverse("subject-totals"))
        totals = {row["subject"]: row["focused_minutes"] for row in response.data}
        self.assertEqual(totals[""], 25)

    def test_cancelled_sessions_are_excluded(self):
        response = self.client.get(reverse("subject-totals"))
        subjects = [row["subject"] for row in response.data]
        self.assertNotIn("React", subjects)

    def test_largest_subject_comes_first(self):
        response = self.client.get(reverse("subject-totals"))
        self.assertEqual(response.data[0]["subject"], "JavaScript")

    def test_totals_only_include_the_signed_in_user(self):
        self.create_session(
            user=self.abhay, subject="Rust", planned_minutes=99, focused_minutes=99
        )
        response = self.client.get(reverse("subject-totals"))
        self.assertNotIn("Rust", [row["subject"] for row in response.data])
