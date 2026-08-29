"""The rules about friendships, kept out of the views that call them."""

from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import Friendship


def get_friendship_between(user, other_user):
    """Returns the friendship connecting two users, whoever asked first."""
    return Friendship.objects.filter(
        Q(sender=user, receiver=other_user) | Q(sender=other_user, receiver=user)
    ).first()


def send_friend_request(sender, receiver):
    """
    Asks another user to be a study friend, and returns the pending friendship.

    Raises a readable ValidationError rather than creating a second row when
    the two users already have something between them.
    """
    if sender == receiver:
        raise ValidationError("You cannot send a friend request to yourself.")

    existing = get_friendship_between(sender, receiver)

    if existing is None:
        return Friendship.objects.create(sender=sender, receiver=receiver)

    if existing.status == Friendship.Status.ACCEPTED:
        raise ValidationError("You are already friends with this user.")

    if existing.status == Friendship.Status.PENDING:
        if existing.receiver == sender:
            
            raise ValidationError(
                "This user has already sent you a friend request."
            )
        raise ValidationError("A friend request is already pending.")

    
    existing.sender = sender
    existing.receiver = receiver
    existing.status = Friendship.Status.PENDING
    existing.save()
    return existing


def respond_to_friend_request(user, friendship, accept):
    """
    Accepts or rejects a pending request, and returns the updated friendship.

    Only the person who was asked may answer, which is checked here rather than
    in the browser, where anyone could skip it.
    """
    if friendship.receiver != user:
        raise PermissionDenied("You do not have permission to manage this request.")

    if friendship.status != Friendship.Status.PENDING:
        raise ValidationError("This friend request has already been answered.")

    friendship.status = (
        Friendship.Status.ACCEPTED if accept else Friendship.Status.REJECTED
    )
    friendship.save()
    return friendship


def get_accepted_friendships(user):
    """Returns the accepted friendships the user is part of, either side."""
    return (
        Friendship.objects.filter(status=Friendship.Status.ACCEPTED)
        .filter(Q(sender=user) | Q(receiver=user))
        .select_related("sender", "receiver")
    )


def get_user_friends(user):
    """
    Returns the users who have accepted a friendship with this user.

    This is what the leaderboard will be built on: it turns the sender and
    receiver columns into a plain list of people, so nothing that reads it has
    to know which side originally sent the request.
    """
    friendships = get_accepted_friendships(user)
    return [friendship.other_user(user) for friendship in friendships]


def search_users(user, query, limit=20):
    """
    Finds other users by username, for the friend search box.

    The signed-in user is left out, and a blank query returns nothing rather
    than the whole user table.
    """
    query = (query or "").strip()
    if not query:
        return User.objects.none()

    return User.objects.filter(username__icontains=query).exclude(pk=user.pk)[:limit]


def get_relationship_labels(user, other_users):
    """
    Describes how the signed-in user currently relates to each of a set of users.

    Returns a dict of user id to one of "none", "request_sent",
    "request_received" or "friends". Built from a single query, so a search
    showing twenty people does not run twenty extra lookups.
    """
    other_ids = [other.id for other in other_users]

    friendships = Friendship.objects.filter(
        Q(sender=user, receiver_id__in=other_ids)
        | Q(sender_id__in=other_ids, receiver=user)
    )

    labels = {}
    for friendship in friendships:
        other_id = (
            friendship.receiver_id
            if friendship.sender_id == user.id
            else friendship.sender_id
        )

        if friendship.status == Friendship.Status.ACCEPTED:
            labels[other_id] = "friends"
        elif friendship.status == Friendship.Status.PENDING:
            labels[other_id] = (
                "request_sent" if friendship.sender_id == user.id else "request_received"
            )
        # A rejected friendship is left out on purpose, so it reads as "none"
        # and the user can be asked again. Rejecting declines one request; it is
        # not a block.

    return labels
