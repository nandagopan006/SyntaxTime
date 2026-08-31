from django.urls import path

from .views import FocusCoachView

urlpatterns = [
    path("focus/", FocusCoachView.as_view(), name="focus-coach"),
]
