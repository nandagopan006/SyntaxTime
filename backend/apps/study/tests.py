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
    """
    The History page reads this endpoint. Its responses are paginated, so the
    sessions arrive under "results" rather than at the top level.
    """

    def get_history(self, params=None):
        """Returns the sessions from one page of history."""
        response = self.client.get(reverse("session-history"), params or {})
        return response.data["results"]

    def study_on_day(self, days_ago, **fields):
        """Records a completed session that finished the given number of days ago."""
        finished_at = timezone.now() - timedelta(days=days_ago)
        return self.create_session(
            started_at=finished_at - timedelta(minutes=50),
            completed_at=finished_at,
            **fields,
        )

    def test_only_the_signed_in_users_sessions_are_returned(self):
        self.create_session(subject="JavaScript")
        self.create_session(user=self.abhay, subject="Django")

        subjects = [item["subject"] for item in self.get_history()]
        self.assertEqual(subjects, ["JavaScript"])

    def test_sessions_are_returned_newest_first(self):
        self.study_on_day(2, subject="Older")
        self.study_on_day(0, subject="Newer")

        self.assertEqual(self.get_history()[0]["subject"], "Newer")

    def test_sessions_are_ordered_by_when_they_finished(self):
        # The long session starts earlier but finishes later, so ordering by
        # the start time would put these the wrong way round.
        now = timezone.now()
        self.create_session(
            subject="Long",
            started_at=now - timedelta(minutes=90),
            completed_at=now - timedelta(minutes=1),
        )
        self.create_session(
            subject="Short",
            started_at=now - timedelta(minutes=60),
            completed_at=now - timedelta(minutes=35),
        )

        self.assertEqual(
            [item["subject"] for item in self.get_history()], ["Long", "Short"]
        )

    def test_cancelled_sessions_are_not_part_of_the_learning_record(self):
        self.create_session(subject="Finished")
        self.create_session(
            subject="Abandoned",
            focused_minutes=0,
            status=StudySession.Status.CANCELLED,
        )

        subjects = [item["subject"] for item in self.get_history()]
        self.assertEqual(subjects, ["Finished"])

    def test_filtering_by_subject(self):
        self.create_session(subject="JavaScript")
        self.create_session(subject="Django")

        results = self.get_history({"subject": "django"})
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["subject"], "Django")

    def test_filtering_by_date(self):
        self.study_on_day(2, subject="Old")
        self.create_session(subject="Today")

        results = self.get_history({"date": timezone.localdate().isoformat()})
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["subject"], "Today")

    def test_filtering_by_date_range(self):
        self.study_on_day(10, subject="Old")
        self.study_on_day(1, subject="Recent")

        results = self.get_history(
            {
                "start_date": (timezone.localdate() - timedelta(days=3)).isoformat(),
                "end_date": timezone.localdate().isoformat(),
            }
        )
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["subject"], "Recent")


class HistorySearchTests(StudyAPITestCase):
    """Searching is how a user finds a session they only half remember."""

    def setUp(self):
        super().setUp()
        self.create_session(
            subject="Python",
            topic="Django REST",
            notes="Learned how JWT access and refresh tokens work.",
        )
        self.create_session(
            subject="JavaScript", topic="Promises", notes="Promise.all and race."
        )
        self.create_session(subject="", topic="", notes="")

    def search(self, term):
        response = self.client.get(reverse("session-history"), {"search": term})
        return [item["subject"] for item in response.data["results"]]

    def test_search_matches_the_notes(self):
        self.assertEqual(self.search("JWT"), ["Python"])

    def test_search_matches_the_subject(self):
        self.assertEqual(self.search("javascript"), ["JavaScript"])

    def test_search_matches_the_topic(self):
        self.assertEqual(self.search("promises"), ["JavaScript"])

    def test_search_ignores_case(self):
        self.assertEqual(self.search("jwt"), ["Python"])

    def test_search_with_no_match_returns_nothing(self):
        self.assertEqual(self.search("kubernetes"), [])

    def test_search_only_looks_at_the_signed_in_users_sessions(self):
        self.create_session(user=self.abhay, subject="Rust", notes="JWT in Rust.")
        self.assertEqual(self.search("JWT"), ["Python"])


class HistoryPaginationTests(StudyAPITestCase):
    def test_a_page_holds_twenty_sessions(self):
        for _ in range(25):
            self.create_session()

        response = self.client.get(reverse("session-history"))
        self.assertEqual(response.data["count"], 25)
        self.assertEqual(len(response.data["results"]), 20)
        self.assertIsNotNone(response.data["next"])

    def test_the_last_page_holds_the_remainder(self):
        for _ in range(25):
            self.create_session()

        response = self.client.get(reverse("session-history"), {"page": 2})
        self.assertEqual(len(response.data["results"]), 5)
        self.assertIsNone(response.data["next"])

    def test_a_short_history_fits_on_one_page(self):
        self.create_session()

        response = self.client.get(reverse("session-history"))
        self.assertEqual(response.data["count"], 1)
        self.assertIsNone(response.data["next"])

    def test_history_is_empty_for_a_user_with_no_sessions(self):
        response = self.client.get(reverse("session-history"))
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])


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

    def test_the_update_answers_with_the_whole_session(self):
        # History puts this response straight back into its list, so a reply
        # holding only the edited fields would blank out the duration and times
        # of the row the user just edited.
        session = self.create_session(
            subject="", topic="", notes="", planned_minutes=50, focused_minutes=47
        )

        response = self.client.patch(
            reverse("session-detail", args=[session.id]),
            {"subject": "Python"},
            format="json",
        )

        self.assertEqual(response.data["subject"], "Python")
        self.assertEqual(response.data["focused_minutes"], 47)
        self.assertEqual(response.data["planned_minutes"], 50)
        self.assertEqual(response.data["status"], "completed")
        self.assertIsNotNone(response.data["started_at"])
        self.assertIsNotNone(response.data["completed_at"])

    def test_a_session_can_be_emptied_back_out(self):
        session = self.create_session(subject="Python", topic="REST", notes="Notes.")

        response = self.client.patch(
            reverse("session-detail", args=[session.id]),
            {"subject": "", "topic": "", "notes": ""},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.subject, "")
        self.assertEqual(session.notes, "")

    def test_a_long_note_is_stored_whole(self):
        # History previews long notes, but nothing may shorten what is stored.
        # DRF strips whitespace from either end, so the note does not end in a
        # space - that trimming is wanted, and only the length is under test.
        session = self.create_session()
        long_note = ("Learned about JWT refresh tokens. " * 60).strip()

        self.client.patch(
            reverse("session-detail", args=[session.id]),
            {"notes": long_note},
            format="json",
        )

        session.refresh_from_db()
        self.assertEqual(session.notes, long_note)
        self.assertGreater(len(session.notes), 1900)


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


class StreakTests(StudyAPITestCase):
    """The streak is the run of consecutive days ending today or yesterday."""

    def study_on_day(self, days_ago, **fields):
        """Records a completed session that started the given number of days ago."""
        started_at = timezone.now() - timedelta(days=days_ago)
        return self.create_session(
            started_at=started_at, completed_at=started_at + timedelta(minutes=47), **fields
        )

    def get_streak(self):
        return self.client.get(reverse("study-statistics")).data["current_streak_days"]

    def test_streak_is_zero_without_sessions(self):
        self.assertEqual(self.get_streak(), 0)

    def test_three_consecutive_days_give_a_streak_of_three(self):
        self.study_on_day(0)
        self.study_on_day(1)
        self.study_on_day(2)
        self.assertEqual(self.get_streak(), 3)

    def test_several_sessions_on_one_day_count_once(self):
        self.study_on_day(0)
        self.study_on_day(0)
        self.study_on_day(1)
        self.assertEqual(self.get_streak(), 2)

    def test_a_missed_day_ends_the_streak(self):
        self.study_on_day(0)
        self.study_on_day(1)
        self.study_on_day(3)  # the gap at day 2 stops the count here
        self.assertEqual(self.get_streak(), 2)

    def test_streak_survives_a_day_that_has_not_been_studied_yet(self):
        # Studied yesterday, nothing today yet. The day is not over, so the
        # streak should still stand.
        self.study_on_day(1)
        self.study_on_day(2)
        self.assertEqual(self.get_streak(), 2)

    def test_streak_is_zero_after_missing_a_whole_day(self):
        self.study_on_day(2)
        self.study_on_day(3)
        self.assertEqual(self.get_streak(), 0)

    def test_cancelled_sessions_do_not_extend_the_streak(self):
        self.study_on_day(0)
        self.study_on_day(1, status=StudySession.Status.CANCELLED)
        self.study_on_day(2)
        self.assertEqual(self.get_streak(), 1)

    def test_another_users_sessions_do_not_extend_the_streak(self):
        self.study_on_day(0)
        self.study_on_day(1, user=self.abhay)
        self.assertEqual(self.get_streak(), 1)


class AverageSessionTests(StudyAPITestCase):
    def get_average(self):
        return self.client.get(reverse("study-statistics")).data["average_session_minutes"]

    def test_average_is_zero_without_sessions(self):
        self.assertEqual(self.get_average(), 0)

    def test_average_of_completed_sessions(self):
        self.create_session(planned_minutes=50, focused_minutes=50)
        self.create_session(planned_minutes=40, focused_minutes=40)
        self.create_session(planned_minutes=30, focused_minutes=30)
        self.assertEqual(self.get_average(), 40)

    def test_average_is_rounded_to_whole_minutes(self):
        self.create_session(planned_minutes=50, focused_minutes=47)
        self.create_session(planned_minutes=50, focused_minutes=46)
        self.create_session(planned_minutes=50, focused_minutes=50)
        self.assertEqual(self.get_average(), 48)  # 143 / 3 is 47.67

    def test_cancelled_sessions_are_excluded_from_the_average(self):
        self.create_session(planned_minutes=60, focused_minutes=60)
        self.create_session(
            planned_minutes=60, focused_minutes=0, status=StudySession.Status.CANCELLED
        )
        self.assertEqual(self.get_average(), 60)


class TodaySubjectsTests(StudyAPITestCase):
    """The dashboard shows how today's focused time is split between subjects."""

    def get_subjects(self):
        response = self.client.get(reverse("study-statistics"))
        return {row["subject"]: row["focused_minutes"] for row in response.data["subjects"]}

    def test_subjects_are_empty_without_sessions(self):
        self.assertEqual(self.get_subjects(), {})

    def test_todays_sessions_are_grouped_by_subject(self):
        self.create_session(subject="JavaScript", planned_minutes=60, focused_minutes=60)
        self.create_session(subject="JavaScript", planned_minutes=40, focused_minutes=40)
        self.create_session(subject="Django", planned_minutes=42, focused_minutes=42)
        self.assertEqual(self.get_subjects(), {"JavaScript": 100, "Django": 42})

    def test_a_session_without_a_subject_is_kept_as_its_own_group(self):
        self.create_session(subject="", planned_minutes=25, focused_minutes=25)
        self.assertEqual(self.get_subjects(), {"": 25})

    def test_earlier_days_are_not_included(self):
        started_at = timezone.now() - timedelta(days=3)
        self.create_session(
            subject="React",
            started_at=started_at,
            completed_at=started_at + timedelta(minutes=45),
            planned_minutes=45,
            focused_minutes=45,
        )
        self.assertEqual(self.get_subjects(), {})


class WeeklyStatisticsTests(StudyAPITestCase):
    def get_days(self):
        return self.client.get(reverse("weekly-statistics")).data["days"]

    def test_the_week_always_has_seven_days(self):
        days = self.get_days()
        self.assertEqual(len(days), 7)

    def test_the_week_runs_monday_to_sunday(self):
        response = self.client.get(reverse("weekly-statistics"))
        self.assertEqual(response.data["start_date"].weekday(), 0)
        self.assertEqual(response.data["end_date"].weekday(), 6)

    def test_days_without_study_are_returned_as_zero(self):
        self.assertEqual([day["focused_minutes"] for day in self.get_days()], [0] * 7)

    def test_todays_sessions_are_summed_into_todays_day(self):
        self.create_session(planned_minutes=50, focused_minutes=47)
        self.create_session(planned_minutes=30, focused_minutes=25)

        today = timezone.localdate()
        totals = {day["date"]: day["focused_minutes"] for day in self.get_days()}
        self.assertEqual(totals[today], 72)

    def test_cancelled_sessions_are_excluded(self):
        self.create_session(
            planned_minutes=50, focused_minutes=0, status=StudySession.Status.CANCELLED
        )
        self.assertEqual([day["focused_minutes"] for day in self.get_days()], [0] * 7)

    def test_another_users_sessions_are_excluded(self):
        self.create_session(user=self.abhay, planned_minutes=50, focused_minutes=47)
        self.assertEqual([day["focused_minutes"] for day in self.get_days()], [0] * 7)


class RecentSessionsTests(StudyAPITestCase):
    """The dashboard asks the session list for the newest few completed sessions."""

    def test_limit_returns_only_that_many_sessions(self):
        for _ in range(8):
            self.create_session()

        response = self.client.get(reverse("session-list"), {"limit": 5})
        self.assertEqual(len(response.data), 5)

    def test_limited_sessions_are_still_newest_first(self):
        older = self.create_session(started_at=timezone.now() - timedelta(hours=3))
        newer = self.create_session(started_at=timezone.now() - timedelta(hours=1))

        response = self.client.get(reverse("session-list"), {"limit": 2})
        self.assertEqual([row["id"] for row in response.data], [newer.id, older.id])

    def test_filtering_by_status_excludes_cancelled_sessions(self):
        self.create_session()
        self.create_session(focused_minutes=0, status=StudySession.Status.CANCELLED)

        response = self.client.get(reverse("session-list"), {"status": "completed"})
        self.assertEqual(len(response.data), 1)

    def test_an_invalid_limit_is_ignored_rather_than_failing(self):
        self.create_session()
        response = self.client.get(reverse("session-list"), {"limit": "many"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
class ProfileStatisticsTests(StudyAPITestCase):
    """
    The Profile page reads one endpoint: the user's whole study history,
    summarised. Every figure here is lifetime, not today.
    """

    def study_on_day(self, days_ago, **fields):
        """Records a completed session that started the given number of days ago."""
        started_at = timezone.now() - timedelta(days=days_ago)
        defaults = {
            "started_at": started_at,
            "completed_at": started_at + timedelta(minutes=fields.get("focused_minutes", 47)),
        }
        defaults.update(fields)
        return self.create_session(**defaults)

    def profile(self, user=None):
        if user is not None:
            self.client.force_authenticate(user=user)
        return self.client.get(reverse("profile-statistics")).data

    def test_an_anonymous_request_is_rejected(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse("profile-statistics"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_a_new_user_gets_zeroes_rather_than_an_error(self):
        profile = self.profile()

        self.assertEqual(profile["total_focused_minutes"], 0)
        self.assertEqual(profile["total_sessions"], 0)
        self.assertEqual(profile["current_streak_days"], 0)
        self.assertEqual(profile["longest_streak_days"], 0)
        self.assertEqual(profile["average_session_minutes"], 0)
        self.assertEqual(profile["total_study_days"], 0)
        self.assertEqual(profile["most_studied_subject"], "")
        self.assertEqual(profile["subjects"], [])

    def test_lifetime_totals(self):
        self.create_session(subject="JavaScript", planned_minutes=100, focused_minutes=100)
        self.create_session(subject="JavaScript", planned_minutes=150, focused_minutes=150)
        self.create_session(subject="React", planned_minutes=120, focused_minutes=120)
        self.create_session(subject="React", planned_minutes=100, focused_minutes=100)
        self.create_session(subject="Python", planned_minutes=90, focused_minutes=90)
        self.create_session(subject="Django", planned_minutes=60, focused_minutes=60)
        self.create_session(subject="", planned_minutes=30, focused_minutes=30)

        profile = self.profile()
        self.assertEqual(profile["total_focused_minutes"], 650)
        self.assertEqual(profile["total_sessions"], 7)

    def test_the_average_is_the_total_over_the_count(self):
        self.create_session(planned_minutes=60, focused_minutes=60)
        self.create_session(planned_minutes=40, focused_minutes=40)
        self.create_session(planned_minutes=20, focused_minutes=20)

        self.assertEqual(self.profile()["average_session_minutes"], 40)

    def test_cancelled_sessions_are_excluded_everywhere(self):
        self.create_session(subject="Python", planned_minutes=100, focused_minutes=100)
        self.create_session(
            subject="Rust",
            planned_minutes=200,
            focused_minutes=0,
            status=StudySession.Status.CANCELLED,
        )

        profile = self.profile()
        self.assertEqual(profile["total_focused_minutes"], 100)
        self.assertEqual(profile["total_sessions"], 1)
        self.assertEqual(profile["total_study_days"], 1)
        self.assertEqual([row["subject"] for row in profile["subjects"]], ["Python"])
        self.assertEqual(profile["most_studied_subject"], "Python")

    def test_only_focused_minutes_count_not_the_planned_length(self):
        # A 60 minute booking the user focused 50 of. The other 10 were a break,
        # and break minutes never reach focused_minutes.
        self.create_session(planned_minutes=60, focused_minutes=50)

        self.assertEqual(self.profile()["total_focused_minutes"], 50)

    def test_another_users_sessions_are_not_counted(self):
        self.create_session(user=self.abhay, planned_minutes=500, focused_minutes=500)

        self.assertEqual(self.profile()["total_focused_minutes"], 0)

    def test_each_user_gets_their_own_overview(self):
        self.create_session(planned_minutes=100, focused_minutes=100)
        self.create_session(user=self.abhay, planned_minutes=60, focused_minutes=60)

        self.assertEqual(self.profile(self.nandhu)["total_focused_minutes"], 100)
        self.assertEqual(self.profile(self.abhay)["total_focused_minutes"], 60)


class ProfileStudyDayTests(StudyAPITestCase):
    def study_on_day(self, days_ago, **fields):
        started_at = timezone.now() - timedelta(days=days_ago)
        return self.create_session(
            started_at=started_at,
            completed_at=started_at + timedelta(minutes=47),
            **fields,
        )

    def profile(self):
        return self.client.get(reverse("profile-statistics")).data

    def test_several_sessions_in_one_evening_are_one_study_day(self):
        self.study_on_day(0, subject="JavaScript", planned_minutes=30, focused_minutes=30)
        self.study_on_day(0, subject="React", planned_minutes=40, focused_minutes=40)
        self.study_on_day(0, subject="Python", planned_minutes=20, focused_minutes=20)

        profile = self.profile()
        self.assertEqual(profile["total_study_days"], 1)
        self.assertEqual(profile["total_sessions"], 3)

    def test_study_days_count_distinct_dates(self):
        for days_ago in (0, 1, 5, 5, 9):
            self.study_on_day(days_ago)

        self.assertEqual(self.profile()["total_study_days"], 4)


class ProfileStreakTests(StudyAPITestCase):
    """
    Current streak counts back from today; longest streak is the best run the
    user has ever had. They are different questions and must not be confused.
    """

    def study_on_day(self, days_ago, **fields):
        started_at = timezone.now() - timedelta(days=days_ago)
        return self.create_session(
            started_at=started_at,
            completed_at=started_at + timedelta(minutes=47),
            **fields,
        )

    def profile(self):
        return self.client.get(reverse("profile-statistics")).data

    def test_both_streaks_are_zero_without_sessions(self):
        profile = self.profile()
        self.assertEqual(profile["current_streak_days"], 0)
        self.assertEqual(profile["longest_streak_days"], 0)

    def test_five_days_in_a_row_ending_today(self):
        for days_ago in range(5):
            self.study_on_day(days_ago)

        profile = self.profile()
        self.assertEqual(profile["current_streak_days"], 5)
        self.assertEqual(profile["longest_streak_days"], 5)

    def test_a_missed_day_breaks_the_current_streak_but_not_the_record(self):
        # Studied 6 days ago, missed 5, then 4 days in a row up to today.
        self.study_on_day(6)
        for days_ago in range(4):
            self.study_on_day(days_ago)

        profile = self.profile()
        self.assertEqual(profile["current_streak_days"], 4)
        self.assertEqual(profile["longest_streak_days"], 4)

    def test_the_longest_streak_can_be_in_the_past(self):
        # A five day run long ago, and only two days recently.
        for days_ago in (30, 29, 28, 27, 26):
            self.study_on_day(days_ago)
        for days_ago in (1, 0):
            self.study_on_day(days_ago)

        profile = self.profile()
        self.assertEqual(profile["current_streak_days"], 2)
        self.assertEqual(profile["longest_streak_days"], 5)

    def test_the_longest_streak_is_not_the_number_of_study_days(self):
        # Six study days, but never two in a row.
        for days_ago in (0, 2, 4, 6, 8, 10):
            self.study_on_day(days_ago)

        profile = self.profile()
        self.assertEqual(profile["total_study_days"], 6)
        self.assertEqual(profile["longest_streak_days"], 1)

    def test_several_sessions_on_one_day_do_not_inflate_a_streak(self):
        self.study_on_day(0)
        self.study_on_day(0)
        self.study_on_day(0)

        profile = self.profile()
        self.assertEqual(profile["current_streak_days"], 1)
        self.assertEqual(profile["longest_streak_days"], 1)

    def test_a_cancelled_session_does_not_extend_a_streak(self):
        self.study_on_day(0)
        self.study_on_day(1, focused_minutes=0, status=StudySession.Status.CANCELLED)
        self.study_on_day(2)

        profile = self.profile()
        self.assertEqual(profile["current_streak_days"], 1)
        self.assertEqual(profile["longest_streak_days"], 1)

    def test_the_profile_streak_matches_the_dashboard_streak(self):
        for days_ago in range(3):
            self.study_on_day(days_ago)

        dashboard = self.client.get(reverse("study-statistics")).data
        self.assertEqual(
            self.profile()["current_streak_days"], dashboard["current_streak_days"]
        )


class ProfileSubjectTests(StudyAPITestCase):
    def profile(self):
        return self.client.get(reverse("profile-statistics")).data

    def test_subjects_are_totalled_and_sorted_by_time(self):
        self.create_session(subject="JavaScript", planned_minutes=100, focused_minutes=100)
        self.create_session(subject="JavaScript", planned_minutes=150, focused_minutes=150)
        self.create_session(subject="React", planned_minutes=120, focused_minutes=120)
        self.create_session(subject="React", planned_minutes=100, focused_minutes=100)
        self.create_session(subject="Python", planned_minutes=90, focused_minutes=90)
        self.create_session(subject="Django", planned_minutes=60, focused_minutes=60)
        self.create_session(subject="", planned_minutes=30, focused_minutes=30)

        subjects = self.profile()["subjects"]
        self.assertEqual(
            [(row["subject"], row["focused_minutes"]) for row in subjects],
            [
                ("JavaScript", 250),
                ("React", 220),
                ("Python", 90),
                ("Django", 60),
                ("", 30),
            ],
        )

    def test_time_without_a_subject_is_kept_not_dropped(self):
        self.create_session(subject="", planned_minutes=45, focused_minutes=45)

        profile = self.profile()
        self.assertEqual(profile["subjects"], [{"subject": "", "focused_minutes": 45, "sessions_count": 1}])
        self.assertEqual(profile["total_focused_minutes"], 45)

    def test_the_most_studied_subject_is_the_busiest_named_one(self):
        self.create_session(subject="", planned_minutes=500, focused_minutes=500)
        self.create_session(subject="Python", planned_minutes=60, focused_minutes=60)

        # The unnamed block is larger, but "no subject" is not a subject.
        self.assertEqual(self.profile()["most_studied_subject"], "Python")

    def test_there_is_no_most_studied_subject_when_none_are_named(self):
        self.create_session(subject="", planned_minutes=45, focused_minutes=45)

        self.assertEqual(self.profile()["most_studied_subject"], "")


class ProfilePrivacyTests(StudyAPITestCase):
    def test_the_overview_carries_no_private_session_detail(self):
        self.create_session(
            subject="Python",
            topic="Django REST",
            notes="Learned how JWT refresh tokens work.",
            planned_minutes=60,
            focused_minutes=55,
        )

        body = str(self.client.get(reverse("profile-statistics")).data)
        for secret in ("Django REST", "JWT refresh", "password", "@example.com"):
            with self.subTest(secret=secret):
                self.assertNotIn(secret, body)

    def test_the_response_holds_only_the_overview_fields(self):
        self.assertEqual(
            set(self.client.get(reverse("profile-statistics")).data.keys()),
            {
                "total_focused_minutes",
                "total_sessions",
                "current_streak_days",
                "longest_streak_days",
                "average_session_minutes",
                "total_study_days",
                "most_studied_subject",
                "subjects",
            },
        )
