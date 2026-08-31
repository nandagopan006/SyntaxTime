from rest_framework.response import Response
from rest_framework.views import APIView

from apps.study.services import get_today_statistics

from .serializers import FocusCoachSerializer
from .services import generate_focus_coaching_response, get_fallback_message

"""
One view, because the coach answers one question: the user has just pressed
pause or finish, and wants a sentence or two about it.

It reads and advises. It creates nothing, changes nothing and owns no state -
the timer stays entirely in the browser, and the session is still saved by the
existing completion flow.
"""


class FocusCoachView(APIView):
    """Answers a pause or a finish with a short piece of coaching."""

    # Authentication is the project default. It is named here anyway because
    # the whole answer is built from this user's own study day.
    throttle_scope = "coach"

    def post(self, request):
        serializer = FocusCoachSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        context = dict(serializer.validated_data)

        # Read from the database, never from the request. A client claiming to
        # have studied fifty thousand minutes today would otherwise have the
        # coach congratulating them on it.
        today = get_today_statistics(request.user)
        context["today_focused_minutes"] = today["today_focused_minutes"]
        context["today_sessions_count"] = today["today_sessions_count"]
        context["daily_target_minutes"] = today["daily_target_minutes"]

        message = generate_focus_coaching_response(context)

        # A coach that cannot answer is answered for. This is deliberately a
        # 200: the frontend's next step is to let the user pause or finish
        # either way, and an error status would only turn a missing sentence
        # into a broken screen.
        if message is None:
            return Response(
                {
                    "message": get_fallback_message(context["event"]),
                    "is_fallback": True,
                }
            )

        return Response({"message": message, "is_fallback": False})
