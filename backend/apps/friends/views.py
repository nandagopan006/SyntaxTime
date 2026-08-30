from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Friendship
from .serializers import (
    FriendRequestCreateSerializer,
    FriendRequestSerializer,
    FriendRequestUpdateSerializer,
    FriendSerializer,
    UserSearchResultSerializer,
)
from .services import (
    get_accepted_friendships,
    get_relationship_labels,
    respond_to_friend_request,
    search_users,
    send_friend_request,
)

"""
Plain views rather than a ViewSet.

There are only four things a user can do here, and each reads as its own short
class. A single ViewSet would have hidden search, accept and reject behind
routing and extra decorators, which is more machinery than these views need.
"""


class FriendsPagination(PageNumberPagination):
    """
    Pages the three lists on the Friends page that grow without limit.

    Friends, pending requests and search results are all as long as the user's
    life allows, and a page that renders every one of them stops being usable
    long before the database minds. Set on the views rather than in settings,
    so the rest of the API keeps returning plain arrays.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class SearchPagination(FriendsPagination):
    """Search shows fewer at a time: nobody reads past the first handful."""

    page_size = 10


class UserSearchView(APIView):
    """
    Finds other SyntaxTime users by username.

    Returns nothing but an id, a username, and how that person already relates
    to the searcher, so the search box knows whether to offer Add friend.
    """

    def get(self, request):
        matches = search_users(request.user, request.query_params.get("search"))

        paginator = SearchPagination()
        # Paginated by hand rather than with a ListAPIView, because the
        # relationship lookup below needs the page itself: working it out for
        # the whole match set would read rows nobody is going to see.
        page = paginator.paginate_queryset(matches, request, view=self)

        serializer = UserSearchResultSerializer(
            page,
            many=True,
            # Looked up once for the whole page of results, not once per row.
            context={"relationships": get_relationship_labels(request.user, page)},
        )
        return paginator.get_paginated_response(serializer.data)


class FriendListView(generics.ListAPIView):
    """The people who have accepted a friendship with the signed-in user."""

    serializer_class = FriendSerializer
    pagination_class = FriendsPagination

    def get_queryset(self):
        return get_accepted_friendships(self.request.user)


class FriendDetailView(APIView):
    """Removes a friendship. Either of the two people may do it."""

    def delete(self, request, pk):
        friendship = get_object_or_404(
            Friendship, pk=pk, status=Friendship.Status.ACCEPTED
        )

        # Checked after the lookup rather than by narrowing it, so removing a
        # friendship between two other people is refused as forbidden instead
        # of quietly reported as missing.
        if request.user not in (friendship.sender, friendship.receiver):
            raise PermissionDenied(
                "You do not have permission to manage this friendship."
            )

        friendship.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FriendRequestListCreateView(generics.ListCreateAPIView):
    """
    GET lists pending requests, POST sends one.

    By default the list answers "who has asked me?". Passing
    ?direction=outgoing answers "who have I asked and not heard back from?".
    """

    serializer_class = FriendRequestSerializer
    pagination_class = FriendsPagination

    def get_queryset(self):
        pending = (
            Friendship.objects.filter(status=Friendship.Status.PENDING)
            .select_related("sender", "receiver")
            # Newest first, and the id breaks any tie, so paging is stable.
            .order_by("-created_at", "-id")
        )

        if self.request.query_params.get("direction") == "outgoing":
            return pending.filter(sender=self.request.user)

        return pending.filter(receiver=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = FriendRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        receiver = get_object_or_404(User, pk=serializer.validated_data["receiver_id"])

        # The sender is the signed-in user, never a value from the request body.
        friendship = send_friend_request(request.user, receiver)

        return Response(
            FriendRequestSerializer(friendship, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class FriendRequestDetailView(APIView):
    """Answers one pending request. Only the person who was asked may do so."""

    def patch(self, request, pk):
        serializer = FriendRequestUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Looked up by id alone, with the permission check in the service, so
        # answering someone else's request is refused rather than made to look
        # like a request that does not exist.
        friendship = get_object_or_404(Friendship, pk=pk)
        accept = serializer.validated_data["status"] == Friendship.Status.ACCEPTED

        friendship = respond_to_friend_request(request.user, friendship, accept)

        return Response(
            FriendRequestSerializer(friendship, context={"request": request}).data
        )
