from django.contrib.auth.models import User
from django.db import models
from django.db.models import F, Q
from django.db.models.functions import Greatest, Least


class Friendship(models.Model):
    """
    The connection between two SyntaxTime users, and how it came about.

    Being someone's friend is not a property of a user, it is something that
    happens between two of them and has a life of its own: it is asked for,
    then answered. That is why this is its own table rather than a field on
    User - there is no sensible place on either account to record "Nandhu asked
    Abhay on Tuesday and Abhay has not replied yet".

    One row covers the pair for good. When Abhay accepts, this same row changes
    status; a second row is never created, so neither user can end up listed
    twice in the other's friends.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"

    # The user who asked. Kept even after the request is accepted, because it
    # is the only record of who reached out first.
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_friend_requests",
    )

    # The user who was asked, and the only one allowed to answer.
    receiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_friend_requests",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            # Nandhu asking Nandhu is meaningless. The views reject it with a
            # readable message; this makes it impossible even if a future code
            # path forgets to check.
            models.CheckConstraint(
                condition=~Q(sender=F("receiver")),
                name="friendship_cannot_be_with_yourself",
            ),
            # Nandhu -> Abhay and Abhay -> Nandhu describe the same pair, so a
            # plain unique constraint on (sender, receiver) would let both rows
            # exist. Sorting the two ids first means the database sees one key
            # for the pair whichever way round the request was sent, and rejects
            # the second row itself rather than trusting every view to check.
            models.UniqueConstraint(
                Least(F("sender_id"), F("receiver_id")),
                Greatest(F("sender_id"), F("receiver_id")),
                name="unique_friendship_between_two_users",
            ),
        ]
        indexes = [
            # Every page of the friends feature asks one of two questions: "who
            # has asked me?" and "who am I friends with?". Both filter on a user
            # together with the status, so the pair is indexed rather than the
            # columns separately.
            models.Index(fields=["receiver", "status"]),
            models.Index(fields=["sender", "status"]),
        ]

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username} ({self.status})"

    def other_user(self, user):
        """Returns whichever side of this friendship is not the given user."""
        return self.receiver if self.sender_id == user.id else self.sender
