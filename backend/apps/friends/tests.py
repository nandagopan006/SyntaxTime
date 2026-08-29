from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Friendship
from .services import get_user_friends


class FriendsAPITestCase(APITestCase):
    """Three users, so every test can check what the third one is allowed to see."""

    def setUp(self):
        self.nandhu = User.objects.create_user(
            username="nandhu", email="nandhu@example.com", password="StudyFocus2026!"
        )
        self.abhay = User.objects.create_user(
            username="abhay", email="abhay@example.com", password="StudyFocus2026!"
        )
        self.rahul = User.objects.create_user(
            username="rahul", email="rahul@example.com", password="StudyFocus2026!"
        )
        self.client.force_authenticate(user=self.nandhu)

    def send_request(self, sender, receiver):
        """Sends a friend request through the API, as the given sender."""
        self.client.force_authenticate(user=sender)
        return self.client.post(
            reverse("friend-request-list"), {"receiver_id": receiver.id}, format="json"
        )

    def answer_request(self, user, friendship_id, new_status):
        """Accepts or rejects a request through the API, as the given user."""
        self.client.force_authenticate(user=user)
        return self.client.patch(
            reverse("friend-request-detail", args=[friendship_id]),
            {"status": new_status},
            format="json",
        )

    def become_friends(self, first, second):
        """Runs a request through to acceptance and returns the friendship."""
        response = self.send_request(first, second)
        self.answer_request(second, response.data["id"], "accepted")
        return Friendship.objects.get(pk=response.data["id"])


class AuthenticationTests(FriendsAPITestCase):
    def test_every_friends_endpoint_requires_authentication(self):
        self.client.force_authenticate(user=None)

        for url in (
            reverse("friend-list"),
            reverse("user-search"),
            reverse("friend-request-list"),
        ):
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_an_authenticated_user_can_search(self):
        response = self.client.get(reverse("user-search"), {"search": "abhay"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class UserSearchTests(FriendsAPITestCase):
    def search(self, term):
        response = self.client.get(reverse("user-search"), {"search": term})
        return [row["username"] for row in response.data]

    def test_search_finds_a_user_by_part_of_their_name(self):
        self.assertEqual(self.search("abh"), ["abhay"])

    def test_search_ignores_case(self):
        self.assertEqual(self.search("ABHAY"), ["abhay"])

    def test_the_searcher_never_appears_in_their_own_results(self):
        self.assertNotIn("nandhu", self.search("nandhu"))

    def test_a_search_with_no_match_returns_nothing(self):
        self.assertEqual(self.search("kubernetes"), [])

    def test_a_blank_search_does_not_return_every_user(self):
        # Otherwise the empty search box would leak the whole user table.
        self.assertEqual(self.search(""), [])

    def test_search_returns_only_a_username_and_an_id(self):
        response = self.client.get(reverse("user-search"), {"search": "abhay"})
        self.assertEqual(
            set(response.data[0].keys()), {"id", "username", "relationship"}
        )

    def test_a_stranger_is_labelled_as_no_relationship(self):
        response = self.client.get(reverse("user-search"), {"search": "abhay"})
        self.assertEqual(response.data[0]["relationship"], "none")

    def test_someone_you_have_asked_is_labelled_request_sent(self):
        self.send_request(self.nandhu, self.abhay)

        self.client.force_authenticate(user=self.nandhu)
        response = self.client.get(reverse("user-search"), {"search": "abhay"})
        self.assertEqual(response.data[0]["relationship"], "request_sent")

    def test_someone_who_has_asked_you_is_labelled_request_received(self):
        self.send_request(self.abhay, self.nandhu)

        self.client.force_authenticate(user=self.nandhu)
        response = self.client.get(reverse("user-search"), {"search": "abhay"})
        self.assertEqual(response.data[0]["relationship"], "request_received")

    def test_an_accepted_friend_is_labelled_friends(self):
        self.become_friends(self.nandhu, self.abhay)

        self.client.force_authenticate(user=self.nandhu)
        response = self.client.get(reverse("user-search"), {"search": "abhay"})
        self.assertEqual(response.data[0]["relationship"], "friends")

    def test_a_rejected_user_can_be_asked_again(self):
        response = self.send_request(self.nandhu, self.abhay)
        self.answer_request(self.abhay, response.data["id"], "rejected")

        self.client.force_authenticate(user=self.nandhu)
        search = self.client.get(reverse("user-search"), {"search": "abhay"})
        self.assertEqual(search.data[0]["relationship"], "none")


class SendFriendRequestTests(FriendsAPITestCase):
    def test_a_request_can_be_sent(self):
        response = self.send_request(self.nandhu, self.abhay)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["username"], "abhay")
        self.assertEqual(response.data["status"], "pending")

    def test_the_sender_is_taken_from_the_token_not_the_request_body(self):
        self.client.force_authenticate(user=self.nandhu)
        self.client.post(
            reverse("friend-request-list"),
            {"receiver_id": self.rahul.id, "sender_id": self.abhay.id},
            format="json",
        )

        friendship = Friendship.objects.get()
        self.assertEqual(friendship.sender, self.nandhu)

    def test_you_cannot_befriend_yourself(self):
        response = self.send_request(self.nandhu, self.nandhu)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("yourself", str(response.data))

    def test_the_same_request_cannot_be_sent_twice(self):
        self.send_request(self.nandhu, self.abhay)
        response = self.send_request(self.nandhu, self.abhay)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Friendship.objects.count(), 1)

    def test_asking_someone_who_has_already_asked_you_is_refused(self):
        # Abhay asked first, so Nandhu should be pointed at that request rather
        # than creating a second one pointing the other way.
        self.send_request(self.abhay, self.nandhu)
        response = self.send_request(self.nandhu, self.abhay)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already sent you", str(response.data))
        self.assertEqual(Friendship.objects.count(), 1)

    def test_friends_cannot_send_each_other_another_request(self):
        self.become_friends(self.nandhu, self.abhay)

        response = self.send_request(self.nandhu, self.abhay)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already friends", str(response.data))

        # Also from the other side, which is a different row direction.
        response = self.send_request(self.abhay, self.nandhu)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Friendship.objects.count(), 1)

    def test_a_rejected_request_can_be_sent_again(self):
        first = self.send_request(self.nandhu, self.abhay)
        self.answer_request(self.abhay, first.data["id"], "rejected")

        second = self.send_request(self.nandhu, self.abhay)

        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Friendship.objects.count(), 1)
        self.assertEqual(Friendship.objects.get().status, "pending")

    def test_a_request_to_a_user_who_does_not_exist_is_refused(self):
        self.client.force_authenticate(user=self.nandhu)
        response = self.client.post(
            reverse("friend-request-list"), {"receiver_id": 9999}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_the_database_refuses_a_duplicate_pair_directly(self):
        # The service checks first, but the constraint is what makes it certain
        # even if two requests arrive at the same moment.
        Friendship.objects.create(sender=self.nandhu, receiver=self.abhay)

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Friendship.objects.create(sender=self.abhay, receiver=self.nandhu)


class FriendRequestListTests(FriendsAPITestCase):
    def test_an_incoming_request_appears_for_the_receiver(self):
        self.send_request(self.abhay, self.nandhu)

        self.client.force_authenticate(user=self.nandhu)
        response = self.client.get(reverse("friend-request-list"))

        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"]["username"], "abhay")

    def test_an_incoming_request_does_not_appear_for_the_sender(self):
        self.send_request(self.abhay, self.nandhu)

        self.client.force_authenticate(user=self.abhay)
        response = self.client.get(reverse("friend-request-list"))
        self.assertEqual(response.data, [])

    def test_outgoing_requests_are_listed_separately(self):
        self.send_request(self.nandhu, self.abhay)

        self.client.force_authenticate(user=self.nandhu)
        response = self.client.get(
            reverse("friend-request-list"), {"direction": "outgoing"}
        )

        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"]["username"], "abhay")

    def test_an_unrelated_user_sees_no_requests(self):
        self.send_request(self.nandhu, self.abhay)

        self.client.force_authenticate(user=self.rahul)
        self.assertEqual(self.client.get(reverse("friend-request-list")).data, [])

    def test_an_answered_request_stops_being_listed(self):
        response = self.send_request(self.nandhu, self.abhay)
        self.answer_request(self.abhay, response.data["id"], "accepted")

        self.client.force_authenticate(user=self.abhay)
        self.assertEqual(self.client.get(reverse("friend-request-list")).data, [])


class AnswerFriendRequestTests(FriendsAPITestCase):
    def test_the_receiver_can_accept(self):
        request = self.send_request(self.nandhu, self.abhay)

        response = self.answer_request(self.abhay, request.data["id"], "accepted")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Friendship.objects.get().status, "accepted")

    def test_the_receiver_can_reject(self):
        request = self.send_request(self.nandhu, self.abhay)

        response = self.answer_request(self.abhay, request.data["id"], "rejected")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Friendship.objects.get().status, "rejected")

    def test_the_sender_cannot_accept_their_own_request(self):
        request = self.send_request(self.nandhu, self.abhay)

        response = self.answer_request(self.nandhu, request.data["id"], "accepted")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Friendship.objects.get().status, "pending")

    def test_the_sender_cannot_reject_their_own_request(self):
        request = self.send_request(self.nandhu, self.abhay)

        response = self.answer_request(self.nandhu, request.data["id"], "rejected")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Friendship.objects.get().status, "pending")

    def test_an_unrelated_user_cannot_answer_someone_elses_request(self):
        request = self.send_request(self.nandhu, self.abhay)

        response = self.answer_request(self.rahul, request.data["id"], "accepted")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Friendship.objects.get().status, "pending")

    def test_a_request_cannot_be_answered_twice(self):
        request = self.send_request(self.nandhu, self.abhay)
        self.answer_request(self.abhay, request.data["id"], "accepted")

        response = self.answer_request(self.abhay, request.data["id"], "rejected")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Friendship.objects.get().status, "accepted")

    def test_answering_a_request_that_does_not_exist_is_a_404(self):
        response = self.answer_request(self.nandhu, 9999, "accepted")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_an_invalid_status_is_refused(self):
        request = self.send_request(self.nandhu, self.abhay)

        response = self.answer_request(self.abhay, request.data["id"], "pending")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class FriendListTests(FriendsAPITestCase):
    def friend_names(self, user):
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("friend-list"))
        return [row["user"]["username"] for row in response.data]

    def test_an_accepted_friend_appears_for_both_people(self):
        self.become_friends(self.nandhu, self.abhay)

        self.assertEqual(self.friend_names(self.nandhu), ["abhay"])
        self.assertEqual(self.friend_names(self.abhay), ["nandhu"])

    def test_a_pending_request_is_not_a_friendship(self):
        self.send_request(self.nandhu, self.abhay)

        self.assertEqual(self.friend_names(self.nandhu), [])
        self.assertEqual(self.friend_names(self.abhay), [])

    def test_a_rejected_request_is_not_a_friendship(self):
        request = self.send_request(self.nandhu, self.abhay)
        self.answer_request(self.abhay, request.data["id"], "rejected")

        self.assertEqual(self.friend_names(self.nandhu), [])
        self.assertEqual(self.friend_names(self.abhay), [])

    def test_someone_elses_friendship_is_not_listed(self):
        self.become_friends(self.nandhu, self.abhay)

        self.assertEqual(self.friend_names(self.rahul), [])

    def test_a_friend_exposes_only_an_id_and_a_username(self):
        self.become_friends(self.nandhu, self.abhay)

        self.client.force_authenticate(user=self.nandhu)
        friend = self.client.get(reverse("friend-list")).data[0]

        self.assertEqual(set(friend["user"].keys()), {"id", "username"})
        self.assertNotIn("email", friend["user"])
        self.assertNotIn("password", friend["user"])


class RemoveFriendTests(FriendsAPITestCase):
    def test_either_person_can_remove_the_friendship(self):
        friendship = self.become_friends(self.nandhu, self.abhay)

        self.client.force_authenticate(user=self.abhay)
        response = self.client.delete(reverse("friend-detail", args=[friendship.id]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Friendship.objects.count(), 0)

    def test_an_unrelated_user_cannot_remove_a_friendship(self):
        friendship = self.become_friends(self.nandhu, self.abhay)

        self.client.force_authenticate(user=self.rahul)
        response = self.client.delete(reverse("friend-detail", args=[friendship.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Friendship.objects.count(), 1)

    def test_removing_a_friend_frees_them_to_be_asked_again(self):
        friendship = self.become_friends(self.nandhu, self.abhay)

        self.client.force_authenticate(user=self.nandhu)
        self.client.delete(reverse("friend-detail", args=[friendship.id]))

        response = self.send_request(self.nandhu, self.abhay)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class LeaderboardPreparationTests(FriendsAPITestCase):
    """
    Phase 15 will total each friend's study time. All it needs from here is a
    dependable answer to "who are this user's accepted friends?".
    """

    def test_accepted_friends_are_returned_as_plain_users(self):
        self.become_friends(self.nandhu, self.abhay)
        self.become_friends(self.rahul, self.nandhu)

        friends = get_user_friends(self.nandhu)

        self.assertEqual(
            sorted(friend.username for friend in friends), ["abhay", "rahul"]
        )

    def test_the_answer_does_not_depend_on_who_asked_first(self):
        # Nandhu asked Abhay; Rahul asked Nandhu. Both are equally friends.
        self.become_friends(self.nandhu, self.abhay)
        self.become_friends(self.rahul, self.nandhu)

        self.assertIn(self.nandhu, get_user_friends(self.abhay))
        self.assertIn(self.nandhu, get_user_friends(self.rahul))

    def test_pending_and_rejected_relationships_are_excluded(self):
        self.send_request(self.nandhu, self.abhay)
        request = self.send_request(self.rahul, self.nandhu)
        self.answer_request(self.nandhu, request.data["id"], "rejected")

        self.assertEqual(get_user_friends(self.nandhu), [])

    def test_a_user_with_no_friends_gets_an_empty_list(self):
        self.assertEqual(get_user_friends(self.nandhu), [])
