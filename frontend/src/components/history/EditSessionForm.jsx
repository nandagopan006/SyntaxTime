import { useState } from "react";

import { getErrorMessage } from "../../services/api";
import { updateStudySession } from "../../services/studyService";
import { formatStudyMinutes } from "../../utils/formatTime";

/*
  Filling in what a session was about, after the fact.

  SyntaxTime lets a session start with nothing filled in, so this form is how a
  bare "25m" from yesterday becomes "Python - Django REST - learned JWT". Only
  the three optional fields are here: how long the session ran and when it
  happened are measurements, and the API rejects any attempt to change them.
*/
function EditSessionForm({ session, onCancel, onSaved }) {
  // These values matter only until the form is submitted, so they stay local.
  const [subject, setSubject] = useState(session.subject);
  const [topic, setTopic] = useState(session.topic);
  const [notes, setNotes] = useState(session.notes);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  /** Saves the edited details and hands the updated session back to History. */
  async function handleSubmit(event) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError("");

    try {
      const updated = await updateStudySession(session.id, {
        subject: subject.trim(),
        topic: topic.trim(),
        notes: notes.trim(),
      });
      onSaved(updated);
    } catch (error) {
      // The typed text is deliberately left in place, so a failed save never
      // costs the user the note they just wrote.
      setSaveError(getErrorMessage(error, "Unable to update this session."));
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="font-display text-2xl text-ink">Edit session</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {formatStudyMinutes(session.focused_minutes)} focused. All three fields
        are optional.
      </p>

      <fieldset disabled={isSaving} className="mt-6 space-y-4 border-t border-rule pt-4">
        <div>
          <label className="block text-sm font-medium text-ink-muted" htmlFor="edit-subject">
            Subject
          </label>
          <input
            id="edit-subject"
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Python"
            className="mt-1 w-full rounded border border-rule px-3 py-2 text-sm disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-muted" htmlFor="edit-topic">
            Topic
          </label>
          <input
            id="edit-topic"
            type="text"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Django REST authentication"
            className="mt-1 w-full rounded border border-rule px-3 py-2 text-sm disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-muted" htmlFor="edit-notes">
            What did you learn?
          </label>
          <textarea
            id="edit-notes"
            rows={6}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Learned how JWT access and refresh tokens work."
            className="mt-1 w-full rounded border border-rule px-3 py-2 text-sm disabled:opacity-60"
          />
        </div>
      </fieldset>

      {saveError && (
        <p className="mt-4 text-sm text-burgundy" role="alert">
          {saveError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded bg-ink px-5 py-2.5 text-sm text-parchment disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brass"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded border border-rule px-5 py-2.5 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brass"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default EditSessionForm;
