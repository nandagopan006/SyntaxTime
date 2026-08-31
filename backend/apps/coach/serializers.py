from rest_framework import serializers

"""
What the frontend is allowed to say about an interruption.

Everything here is untrusted. The reason is free text written by the user and
is never treated as an instruction; the numbers describe a timer that runs in
the browser, so they cannot be read from the database and are bounded here
instead. Anything the server can work out for itself - today's focused
minutes, the daily target - is deliberately absent, and is read from the
database in the view.
"""

# Long enough to explain an interruption, short enough that nobody is pasting
# a document into the prompt.
MAX_REASON_LENGTH = 500

# The longest session the duration picker offers is 600 minutes, so nothing
# honest can exceed it.
MAX_SESSION_MINUTES = 600

# A session cannot realistically be interrupted more often than this, and the
# prompt only distinguishes "first", "second" and "several" anyway.
MAX_PAUSE_COUNT = 100

# How many earlier turns of the conversation may be sent back. Twelve is six
# exchanges, which is a long conversation for somebody who is meant to be
# studying. It also bounds the prompt: without a cap, a client could grow the
# history until every request cost a fortune.
MAX_HISTORY_TURNS = 12

# Mirrors StudySession.subject and .topic, so the coach cannot be used to send
# more text to the provider than a session could ever hold.
MAX_SUBJECT_LENGTH = 100
MAX_TOPIC_LENGTH = 200


class CoachTurnSerializer(serializers.Serializer):
    """One earlier message in the conversation, as the browser remembers it."""

    # "coach" rather than "assistant": the frontend does not need to know the
    # provider's vocabulary, and the mapping happens in one place in services.
    role = serializers.ChoiceField(choices=["user", "coach"])
    content = serializers.CharField(
        max_length=MAX_REASON_LENGTH, trim_whitespace=True
    )


class FocusCoachSerializer(serializers.Serializer):
    """Validates one request for coaching about a pause or a finish."""

    # Only the two moments the user is asked about. Anything else is rejected
    # rather than passed through to the prompt.
    event = serializers.ChoiceField(choices=["pause", "finish"])

    # Optional: the user is never trapped into explaining themselves.
    reason = serializers.CharField(
        max_length=MAX_REASON_LENGTH,
        allow_blank=True,
        required=False,
        default="",
        trim_whitespace=True,
    )

    # The conversation so far, oldest first, as the dialog has it on screen.
    # Nothing is stored server-side, so the browser is the only place this
    # exists - and it disappears when the dialog closes.
    history = CoachTurnSerializer(many=True, required=False, default=list)

    # Which interruption this is, counted within the current session only.
    pause_count = serializers.IntegerField(
        min_value=0,
        max_value=MAX_PAUSE_COUNT,
        required=False,
        default=0,
    )

    # The live session. These describe a countdown that only exists in the
    # browser, so they are bounded rather than believed.
    planned_minutes = serializers.IntegerField(
        min_value=0, max_value=MAX_SESSION_MINUTES, required=False, default=0
    )
    elapsed_minutes = serializers.IntegerField(
        min_value=0, max_value=MAX_SESSION_MINUTES, required=False, default=0
    )
    remaining_minutes = serializers.IntegerField(
        min_value=0, max_value=MAX_SESSION_MINUTES, required=False, default=0
    )

    subject = serializers.CharField(
        max_length=MAX_SUBJECT_LENGTH,
        allow_blank=True,
        required=False,
        default="",
        trim_whitespace=True,
    )
    topic = serializers.CharField(
        max_length=MAX_TOPIC_LENGTH,
        allow_blank=True,
        required=False,
        default="",
        trim_whitespace=True,
    )

    def validate_history(self, history):
        """
        Keeps the conversation short and correctly shaped.

        Only the most recent turns are kept rather than the request refused: a
        long conversation is a reason to forget the beginning, not a reason to
        stop answering somebody mid-session.
        """
        return history[-MAX_HISTORY_TURNS:]

    def validate(self, attrs):
        """
        Keeps the session's own numbers consistent with each other.

        A client claiming forty minutes elapsed of a twenty minute session
        would have the coach talking about time that never happened, so the
        parts are trimmed to fit the whole rather than the request refused -
        this is advice, and a rejected pause helps nobody.
        """
        planned = attrs.get("planned_minutes", 0)

        if planned:
            attrs["elapsed_minutes"] = min(attrs.get("elapsed_minutes", 0), planned)
            attrs["remaining_minutes"] = min(
                attrs.get("remaining_minutes", 0),
                planned - attrs["elapsed_minutes"],
            )
        else:
            # With no planned length there is no session to describe, so the
            # coach is given nothing rather than something invented.
            attrs["elapsed_minutes"] = 0
            attrs["remaining_minutes"] = 0

        return attrs
