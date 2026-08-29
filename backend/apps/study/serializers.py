from rest_framework import serializers

from .models import DailyGoal, StudySession

# Subject, topic and notes are optional everywhere in SyntaxTime.
OPTIONAL_TEXT_FIELDS = ("subject", "topic", "notes")


class StudySessionSerializer(serializers.ModelSerializer):
    """Reads and creates study sessions. The owner comes from the request, never the body."""

    class Meta:
        model = StudySession
        fields = (
            "id",
            "subject",
            "topic",
            "planned_minutes",
            "focused_minutes",
            "started_at",
            "completed_at",
            "status",
            "notes",
            "created_at",
        )
        read_only_fields = ("id", "created_at")
        extra_kwargs = {
            "subject": {"required": False, "allow_blank": True, "allow_null": True},
            "topic": {"required": False, "allow_blank": True, "allow_null": True},
            "notes": {"required": False, "allow_blank": True, "allow_null": True},
        }

    def validate_focused_minutes(self, value):
        if value < 0:
            raise serializers.ValidationError("Focused minutes cannot be negative.")
        return value

    def validate_planned_minutes(self, value):
        if value < 1:
            raise serializers.ValidationError("Planned minutes must be at least 1.")
        return value

    def validate(self, attrs):
        # A missing optional field and an explicit null both mean "not provided",
        # so both are stored as an empty string.
        for field_name in OPTIONAL_TEXT_FIELDS:
            if attrs.get(field_name) is None:
                attrs[field_name] = ""

        planned = attrs.get("planned_minutes")
        focused = attrs.get("focused_minutes")
        if planned is not None and focused is not None and focused > planned:
            raise serializers.ValidationError(
                {"focused_minutes": "Focused minutes cannot exceed planned minutes."}
            )

        started_at = attrs.get("started_at")
        completed_at = attrs.get("completed_at")
        if started_at and completed_at and completed_at < started_at:
            raise serializers.ValidationError(
                {"completed_at": "A session cannot finish before it started."}
            )

        if attrs.get("status") == StudySession.Status.COMPLETED and not completed_at:
            raise serializers.ValidationError(
                {"completed_at": "A completed session needs a completion time."}
            )

        return attrs


class StudySessionUpdateSerializer(serializers.ModelSerializer):
    """
    Lets the user fill in the optional details later from History.

    Only subject, topic and notes are editable. The measured values - how long
    the session ran and when - are facts recorded by the timer, and allowing
    them to be edited afterwards would quietly corrupt every statistic built on
    them. They are still returned, as read-only fields, so a PATCH answers with
    the whole session and History can put the updated row straight back into
    its list without fetching it again.
    """

    class Meta:
        model = StudySession
        fields = (
            "id",
            "subject",
            "topic",
            "planned_minutes",
            "focused_minutes",
            "started_at",
            "completed_at",
            "status",
            "notes",
            "created_at",
        )
        read_only_fields = (
            "id",
            "planned_minutes",
            "focused_minutes",
            "started_at",
            "completed_at",
            "status",
            "created_at",
        )
        extra_kwargs = {
            "subject": {"required": False, "allow_blank": True, "allow_null": True},
            "topic": {"required": False, "allow_blank": True, "allow_null": True},
            "notes": {"required": False, "allow_blank": True, "allow_null": True},
        }

    def validate(self, attrs):
        for field_name in OPTIONAL_TEXT_FIELDS:
            if field_name in attrs and attrs[field_name] is None:
                attrs[field_name] = ""
        return attrs


class DailyGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyGoal
        fields = ("id", "date", "target_minutes")
        read_only_fields = ("id", "date")

    def validate_target_minutes(self, value):
        if value < 0:
            raise serializers.ValidationError("Target minutes cannot be negative.")
        return value
