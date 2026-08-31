from django.contrib import admin
from django.urls import include, path

from apps.study.urls import goal_urlpatterns

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/study/", include("apps.study.urls")),
    path("api/friends/", include("apps.friends.urls")),
    path("api/leaderboard/", include("apps.leaderboard.urls")),
    path("api/coach/", include("apps.coach.urls")),
    path("api/goals/", include(goal_urlpatterns)),
]
