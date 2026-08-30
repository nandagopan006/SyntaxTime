from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Friendship


class PublicUserSerializer(serializers.ModelSerializer):
    """
    The only things one SyntaxTime user may learn about another.

    Deliberately just an id and a name. Email, password and every study session
    a person has recorded stay out of every friend response.
    """

    class Meta:
        model = User
        fields = ("id", "username")


class UserSearchResultSerializer(PublicUserSerializer):
    """
    A search result, together with how that person already relates to you.

    The relationship comes from the view, which looks all of them up in one
    query, so the search box can show Add friend, Request sent or Friends
    without the browser guessing.
    """

    relationship = serializers.SerializerMethodField()

    class Meta(PublicUserSerializer.Meta):
        fields = PublicUserSerializer.Meta.fields + ("relationship",)

    def get_relationship(self, user):
        return self.context["relationships"].get(user.id, "none")


class FriendSerializer(serializers.ModelSerializer):
    """
    One accepted friendship, described from the signed-in user's side.

    The model stores a sender and a receiver, but once a request is accepted
    that distinction stops mattering. This turns the row into the one thing the
    friends list actually wants: the other person.
    """

    user = serializers.SerializerMethodField()

    class Meta:
        model = Friendship
        fields = ("id", "user", "created_at")

    def get_user(self, friendship):
        current_user = self.context["request"].user
        return PublicUserSerializer(friendship.other_user(current_user)).data


class FriendRequestSerializer(serializers.ModelSerializer):
    """
    One pending request, incoming or outgoing.

    `user` is whoever is at the other end: the person asking when the request
    is incoming, the person asked when it is outgoing.
    """

    user = serializers.SerializerMethodField()

    class Meta:
        model = Friendship
        fields = ("id", "user", "status", "created_at")

    def get_user(self, friendship):
        current_user = self.context["request"].user
        return PublicUserSerializer(friendship.other_user(current_user)).data


class FriendRequestCreateSerializer(serializers.Serializer):
    """
    Validates who a friend request is being sent to.

    Only the receiver is accepted. The sender is always taken from the request's
    token, so nobody can send a request in someone else's name.
    """

    receiver_id = serializers.IntegerField()

    def validate_receiver_id(self, value):
        if not User.objects.filter(pk=value).exists():
            raise serializers.ValidationError("That user does not exist.")
        return value


class FriendRequestUpdateSerializer(serializers.Serializer):
    """Accepts the one field an answer to a request may change: its status."""

    status = serializers.ChoiceField(
        choices=[Friendship.Status.ACCEPTED, Friendship.Status.REJECTED]
    )
