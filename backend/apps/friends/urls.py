from django.urls import path

from .views import (
    FriendDetailView,
    FriendListView,
    FriendRequestDetailView,
    FriendRequestListCreateView,
    UserSearchView,
)

urlpatterns = [
    path("", FriendListView.as_view(), name="friend-list"),
    path("search/", UserSearchView.as_view(), name="user-search"),
    path("requests/", FriendRequestListCreateView.as_view(), name="friend-request-list"),
    path(
        "requests/<int:pk>/",
        FriendRequestDetailView.as_view(),
        name="friend-request-detail",
    ),
    # Last, because it matches any number and the paths above are literal.
    path("<int:pk>/", FriendDetailView.as_view(), name="friend-detail"),
]
