from datetime import timedelta

from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.friends.models import Friendship
from apps.study.models import StudySession
from apps.study.services import get_current_month_range, get_current_week_range


class LeaderboardTestCase(APITestCase):
    """The five people from the phase specification."""

    def setUp(self):
        self.nandhu = self.make_user("nandhu")
        self.abhay = self.make_user("abhay")
        self.rahul = self.make_user("rahul")
        self.arjun = self.make_user("arjun")
        self.stranger = self.make_user("randomuser")
        self.client.force_authenticate(user=self.nandhu)

    def make_user(self, username):
        return User.objects.create_user(
            username=username, email=f"{username}@example.com", password="StudyFocus2026!"
        )

    def befriend(self, first, second, friendship_status=Friendship.Status.ACCEPTED):
        return Friendship.objects.create(
            sender=first, receiver=second, status=friendship_status
        )

    def study(self, user, minutes, on_date=None, session_status=None):
        """Records a completed session of the given length on a given day."""
        day = on_date or timezone.localdate()
        started_at = timezone.make_aware(
            timezone.datetime.combine(day, timezone.datetime.min.time())
        ) + timedelta(hours=10)

        return StudySession.objects.create(
            user=user,
            planned_minutes=max(minutes, 1),
            focused_minutes=minutes,
            started_at=started_at,
            completed_at=started_at + timedelta(minutes=minutes),
            status=session_status or StudySession.Status.COMPLETED,
        )

    def board(self, url_name="weekly-leaderboard", user=None):
        if user is not None:
            self.client.force_authenticate(user=user)
        return self.client.get(reverse(url_name)).data

    def names(self, url_name="weekly-leaderboard", user=None):
        return [row["username"] for row in self.board(url_name, user)["entries"]]

    def minutes_for(self, username, url_name="weekly-leaderboard"):
        entries = self.board(url_name)["entries"]
        return next(row["focused_minutes"] for row in entries if row["username"] == username)


class AuthenticationTests(LeaderboardTestCase):
    def test_both_boards_require_authentication(self):
        self.client.force_authenticate(user=None)

        for name in ("weekly-leaderboard", "monthly-leaderboard"):
            with self.subTest(name=name):
                response = self.client.get(reverse(name))
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_an_authenticated_user_gets_a_board(self):
        response = self.client.get(reverse("weekly-leaderboard"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class WhoAppearsTests(LeaderboardTestCase):
    def test_a_user_alone_still_sees_themselves(self):
        self.assertEqual(self.names(), ["nandhu"])

    def test_accepted_friends_appear(self):
        self.befriend(self.nandhu, self.abhay)
        self.assertEqual(sorted(self.names()), ["abhay", "nandhu"])

    def test_a_friendship_counts_whichever_side_asked(self):
        self.befriend(self.abhay, self.nandhu)
        self.assertIn("abhay", self.names())

    def test_pending_friends_do_not_appear(self):
        self.befriend(self.nandhu, self.abhay, Friendship.Status.PENDING)
        self.assertEqual(self.names(), ["nandhu"])

    def test_rejected_friends_do_not_appear(self):
        self.befriend(self.nandhu, self.abhay, Friendship.Status.REJECTED)
        self.assertEqual(self.names(), ["nandhu"])

    def test_unrelated_users_do_not_appear(self):
        self.study(self.stranger, 1000)
        self.assertEqual(self.names(), ["nandhu"])

    def test_a_friend_of_a_friend_does_not_appear(self):
        self.befriend(self.nandhu, self.abhay)
        self.befriend(self.abhay, self.rahul)
        self.assertEqual(sorted(self.names()), ["abhay", "nandhu"])

    def test_a_friend_who_studied_nothing_still_appears(self):
        self.befriend(self.nandhu, self.arjun)
        self.assertIn("arjun", self.names())
        self.assertEqual(self.minutes_for("arjun"), 0)

    def test_removing_a_friend_removes_them_from_the_board(self):
        friendship = self.befriend(self.nandhu, self.abhay)
        self.assertIn("abhay", self.names())

        friendship.delete()
        self.assertNotIn("abhay", self.names())


class WhatCountsTests(LeaderboardTestCase):
    def test_completed_sessions_are_added_up(self):
        self.study(self.nandhu, 100)
        self.study(self.nandhu, 150)
        self.assertEqual(self.minutes_for("nandhu"), 250)

    def test_cancelled_sessions_are_excluded(self):
        self.study(self.nandhu, 200)
        self.study(self.nandhu, 200, session_status=StudySession.Status.CANCELLED)
        self.assertEqual(self.minutes_for("nandhu"), 200)

    def test_only_focused_minutes_count_not_the_planned_length(self):
        # A 50 minute session the user finished early at 37. Break and paused
        # time never reach focused_minutes, so they cannot reach the board.
        StudySession.objects.create(
            user=self.nandhu,
            planned_minutes=50,
            focused_minutes=37,
            started_at=timezone.now() - timedelta(minutes=60),
            completed_at=timezone.now(),
            status=StudySession.Status.COMPLETED,
        )
        self.assertEqual(self.minutes_for("nandhu"), 37)

    def test_a_running_timer_contributes_nothing(self):
        # Nothing is saved until the session is completed, so an active timer
        # simply has no row here to be counted.
        self.assertEqual(self.minutes_for("nandhu"), 0)


class WeeklyPeriodTests(LeaderboardTestCase):
    def test_the_week_runs_monday_to_sunday(self):
        board = self.board()
        self.assertEqual(board["period"], "weekly")
        self.assertEqual(board["start_date"].weekday(), 0)
        self.assertEqual(board["end_date"].weekday(), 6)

    def test_every_day_of_this_week_counts(self):
        monday, _ = get_current_week_range()
        today = timezone.localdate()

        day = monday
        expected = 0
        while day <= today:
            self.study(self.nandhu, 10, on_date=day)
            expected += 10
            day += timedelta(days=1)

        self.assertEqual(self.minutes_for("nandhu"), expected)

    def test_last_week_does_not_count(self):
        monday, _ = get_current_week_range()
        self.study(self.nandhu, 500, on_date=monday - timedelta(days=1))
        self.assertEqual(self.minutes_for("nandhu"), 0)


class MonthlyPeriodTests(LeaderboardTestCase):
    def test_the_month_runs_first_to_last_day(self):
        board = self.board("monthly-leaderboard")
        first, last = get_current_month_range()

        self.assertEqual(board["period"], "monthly")
        self.assertEqual(board["start_date"], first)
        self.assertEqual(board["end_date"], last)
        self.assertEqual(board["start_date"].day, 1)

    def test_the_first_of_the_month_counts(self):
        first, _ = get_current_month_range()
        self.study(self.nandhu, 90, on_date=first)
        self.assertEqual(self.minutes_for("nandhu", "monthly-leaderboard"), 90)

    def test_the_last_day_of_the_previous_month_does_not_count(self):
        first, _ = get_current_month_range()
        self.study(self.nandhu, 500, on_date=first - timedelta(days=1))
        self.assertEqual(self.minutes_for("nandhu", "monthly-leaderboard"), 0)

    def test_the_month_can_hold_more_than_the_week(self):
        monday, _ = get_current_week_range()
        first, _ = get_current_month_range()

        self.study(self.nandhu, 60)
        earlier = monday - timedelta(days=1)
        if earlier >= first:
            self.study(self.nandhu, 40, on_date=earlier)
            self.assertEqual(self.minutes_for("nandhu", "monthly-leaderboard"), 100)
            self.assertEqual(self.minutes_for("nandhu"), 60)


class RankingTests(LeaderboardTestCase):
    def test_the_board_is_ordered_by_focused_minutes(self):
        for friend in (self.abhay, self.rahul, self.arjun):
            self.befriend(self.nandhu, friend)

        self.study(self.nandhu, 250)
        self.study(self.abhay, 220)
        self.study(self.rahul, 170)
        self.study(self.arjun, 50)

        entries = self.board()["entries"]
        self.assertEqual(
            [(row["rank"], row["username"]) for row in entries],
            [(1, "nandhu"), (2, "abhay"), (3, "rahul"), (4, "arjun")],
        )

    def test_ranks_are_sequential_from_one(self):
        for friend in (self.abhay, self.rahul):
            self.befriend(self.nandhu, friend)

        entries = self.board()["entries"]
        self.assertEqual([row["rank"] for row in entries], [1, 2, 3])

    def test_a_tie_is_broken_by_username(self):
        self.befriend(self.nandhu, self.abhay)
        self.study(self.nandhu, 100)
        self.study(self.abhay, 100)

        # abhay before nandhu alphabetically, so the order is settled and does
        # not wander between requests.
        self.assertEqual(self.names(), ["abhay", "nandhu"])

    def test_a_tie_order_is_the_same_every_time(self):
        for friend in (self.abhay, self.rahul, self.arjun):
            self.befriend(self.nandhu, friend)
            self.study(friend, 60)
        self.study(self.nandhu, 60)

        first_call = self.names()
        for _ in range(3):
            self.assertEqual(self.names(), first_call)

    def test_everyone_at_zero_is_still_ordered_by_name(self):
        for friend in (self.abhay, self.rahul, self.arjun):
            self.befriend(self.nandhu, friend)

        self.assertEqual(self.names(), ["abhay", "arjun", "nandhu", "rahul"])


class CurrentUserTests(LeaderboardTestCase):
    def test_the_signed_in_user_is_marked(self):
        self.befriend(self.nandhu, self.abhay)

        entries = self.board()["entries"]
        marked = [row["username"] for row in entries if row["is_current_user"]]
        self.assertEqual(marked, ["nandhu"])

    def test_the_marking_follows_whoever_is_asking(self):
        self.befriend(self.nandhu, self.abhay)

        entries = self.board(user=self.abhay)["entries"]
        marked = [row["username"] for row in entries if row["is_current_user"]]
        self.assertEqual(marked, ["abhay"])

    def test_the_user_appears_even_when_last(self):
        self.befriend(self.nandhu, self.abhay)
        self.study(self.abhay, 500)

        entries = self.board()["entries"]
        last = entries[-1]
        self.assertEqual(last["username"], "nandhu")
        self.assertTrue(last["is_current_user"])
        self.assertEqual(last["rank"], 2)

    def test_two_friends_see_the_same_totals_from_their_own_side(self):
        self.befriend(self.nandhu, self.abhay)
        self.study(self.nandhu, 250)
        self.study(self.abhay, 220)

        def totals(user):
            board = self.board(user=user)
            return {row["username"]: row["focused_minutes"] for row in board["entries"]}

        self.assertEqual(totals(self.nandhu), totals(self.abhay))


class PrivacyTests(LeaderboardTestCase):
    def test_an_entry_carries_only_the_ranking_fields(self):
        self.befriend(self.nandhu, self.abhay)
        self.study(self.abhay, 60)

        entry = self.board()["entries"][0]
        self.assertEqual(
            set(entry.keys()),
            {"rank", "user_id", "username", "focused_minutes", "is_current_user"},
        )

    def test_no_private_study_detail_is_exposed(self):
        self.befriend(self.nandhu, self.abhay)
        StudySession.objects.create(
            user=self.abhay,
            subject="Python",
            topic="Django REST",
            notes="Learned how JWT refresh tokens work.",
            planned_minutes=60,
            focused_minutes=55,
            started_at=timezone.now() - timedelta(hours=1),
            completed_at=timezone.now(),
            status=StudySession.Status.COMPLETED,
        )

        body = str(self.board())
        for secret in ("Django REST", "JWT refresh", "notes", "@example.com", "password"):
            with self.subTest(secret=secret):
                self.assertNotIn(secret, body)


class SpecificationScenarioTests(LeaderboardTestCase):
    """The exact walkthrough from the phase specification."""

    def setUp(self):
        super().setUp()
        for friend in (self.abhay, self.rahul, self.arjun):
            self.befriend(self.nandhu, friend)

        self.study(self.nandhu, 100)
        self.study(self.nandhu, 150)
        self.study(self.abhay, 120)
        self.study(self.abhay, 100)
        self.study(self.rahul, 90)
        self.study(self.rahul, 80)
        self.study(self.arjun, 50)
        self.study(self.stranger, 1000)

    def test_the_expected_ranking(self):
        entries = self.board()["entries"]

        self.assertEqual(
            [(row["rank"], row["username"], row["focused_minutes"]) for row in entries],
            [
                (1, "nandhu", 250),
                (2, "abhay", 220),
                (3, "rahul", 170),
                (4, "arjun", 50),
            ],
        )

    def test_the_stranger_is_absent(self):
        self.assertNotIn("randomuser", self.names())

    def test_turning_a_friendship_back_to_pending_removes_that_friend(self):
        friendship = Friendship.objects.get(sender=self.nandhu, receiver=self.abhay)
        friendship.status = Friendship.Status.PENDING
        friendship.save()

        self.assertNotIn("abhay", self.names())

    def test_another_finished_session_moves_the_totals(self):
        self.study(self.nandhu, 100)

        entries = self.board()["entries"]
        self.assertEqual(entries[0]["username"], "nandhu")
        self.assertEqual(entries[0]["focused_minutes"], 350)

    def test_the_monthly_board_holds_the_same_people(self):
        self.assertEqual(
            self.names("monthly-leaderboard"),
            ["nandhu", "abhay", "rahul", "arjun"],
        )
