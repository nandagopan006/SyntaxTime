import { useEffect, useRef, useState } from "react";

import { formatStudyTime } from "../../utils/formatTime";
import { NO_SUBJECT_LABEL, NO_TOPIC_LABEL } from "../../utils/studySession";
import Button from "../ui/Button";

/*
  The focus coach.

  Somebody has reached for Pause or Finish. Before the timer changes, this asks
  why, and then keeps talking for as long as they want to - the first answer is
  rarely the end of it, and "what if I'm still tired after that?" deserves a
  reply rather than a closed dialog.

  The countdown is held while this is open, because talking is not studying.
  Both ways out stay on screen the whole time: the coach advises and never
  blocks. Closing this - by the button, by Escape, by clicking away - starts
  the session again from exactly where it stopped.

  This component owns no timer behaviour. It sends messages and hands the
  user's choice back to the caller, who dispatches the same Redux action the
  buttons have always dispatched.
*/

// Kept small on purpose. Seven buttons can be read at a glance; thirty
// categories would be a form, and the user is trying to get up for a drink.
const PAUSE_REASONS = [
  "Need a drink",
  "Feeling tired",
  "Distracted",
  "Bathroom",
  "Stuck on this topic",
  "Something came up",
];

const FINISH_REASONS = [
  "Need to stop",
  "Feeling tired",
  "Stuck on this topic",
  "Something came up",
  "Distracted",
];

// Mirrors the backend's limit, so the field stops before the API refuses it.
const MAX_MESSAGE_LENGTH = 500;

/**
 * The heading and opening question, which change with how interrupted the
 * session has already been.
 *
 * The escalation is in the wording only. Nothing here counts at the user or
 * implies they have done something wrong - a third interruption is a reason to
 * ask a better question, not to tell somebody off.
 */
function getPrompt(event, pauseCount) {
  if (event === "finish") {
    if (pauseCount >= 2) {
      return {
        heading: "Finishing here?",
        question:
          "You've had a few interruptions in this block. What's making you want to finish now?",
      };
    }
    return {
      heading: "Why are you finishing?",
      question: "What's stopping you from continuing right now?",
    };
  }

  if (pauseCount >= 4) {
    return {
      heading: "Another interruption?",
      question: "Something seems to keep pulling you away. What do you need right now?",
    };
  }
  if (pauseCount === 3) {
    return {
      heading: "Another interruption?",
      question: "You've paused a few times in this session. What's getting in the way?",
    };
  }
  if (pauseCount === 2) {
    return {
      heading: "Another interruption?",
      question: "What's interrupting your focus this time?",
    };
  }
  return {
    heading: "Why are you pausing?",
    question: "What's making you pause?",
  };
}

function FocusCoachDialog({
  event,
  pauseCount,
  subject,
  topic,
  elapsedSeconds,
  remainingSeconds,
  isLoading,
  messages,
  hasFailed,
  onAskCoach,
  onConfirm,
  onKeepFocusing,
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const conversationEndRef = useRef(null);

  const { heading, question } = getPrompt(event, pauseCount);
  const quickReasons = event === "finish" ? FINISH_REASONS : PAUSE_REASONS;
  const confirmLabel = event === "finish" ? "Finish session" : "Pause session";

  const hasStarted = messages.length > 0;

  // Escape returns to the session. It must never be a way of pausing by
  // accident, so it does exactly what Keep focusing does and nothing else.
  useEffect(() => {
    function handleKeyDown(keyEvent) {
      if (keyEvent.key === "Escape") {
        keyEvent.preventDefault();
        onKeepFocusing();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onKeepFocusing]);

  // The dialog takes focus when it opens, so a keyboard user is not left
  // tabbing through the page behind it.
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Keeps the newest message in view as the conversation grows. Called
  // optionally: scrolling is a convenience, and a runtime without it must lose
  // the convenience rather than take the whole dialog down with it.
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length, isLoading]);

  function handleQuickReason(quickReason) {
    setDraft(quickReason);
    inputRef.current?.focus();
  }

  function handleSubmit(submitEvent) {
    submitEvent.preventDefault();

    const text = draft.trim();
    // An empty first message is allowed - somebody may not want to explain -
    // but sending nothing into a conversation already going says nothing.
    if (isLoading || (hasStarted && !text)) {
      return;
    }

    setDraft("");
    onAskCoach(text);
  }

  return (
    // A plain overlay rather than a modal library: there is one thing on
    // screen and two ways out of it.
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/30 p-4"
      role="presentation"
      onMouseDown={(clickEvent) => {
        // Clicking the backdrop returns to the session, like Escape.
        if (clickEvent.target === clickEvent.currentTarget) {
          onKeepFocusing();
        }
      }}
    >
      {/*
        Capped at the height of the window and laid out as a column, so a long
        conversation scrolls in the middle while the actions stay reachable at
        the bottom. Without this the dialog grows past the bottom of the screen
        and takes the buttons with it.
      */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-heading"
        tabIndex={-1}
        className="surface-card flex max-h-[90vh] w-full max-w-lg flex-col outline-none"
      >
        <header className="shrink-0 px-7 pt-7">
          <p id="coach-heading" className="section-eyebrow">
            {hasStarted ? "Your focus coach" : heading}
          </p>

          {/* The session, said quietly. It is context for the decision, not a
              scoreboard, so it sits in small type and never in a warning colour. */}
          <p className="mt-3 text-sm text-ink-muted">
            {subject || NO_SUBJECT_LABEL} · {topic || NO_TOPIC_LABEL}
          </p>
          <p className="mt-0.5 text-sm text-ink-faint tabular-nums">
            {formatStudyTime(elapsedSeconds)} focused ·{" "}
            {formatStudyTime(remainingSeconds)} left
          </p>

          {/* Said plainly, because it is the reassurance that makes the
              conversation free: the clock is not running down while you
              decide, and none of this is being counted as study time. */}
          <p className="mt-2 text-sm text-forest">
            Timer held while you&apos;re here.
          </p>
        </header>

        {/* The conversation. The only part that scrolls. */}
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-rule px-7 py-5">
          {!hasStarted && <p className="text-ink">{question}</p>}

          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={message.role === "user" ? "text-right" : ""}
              >
                {/*
                  Rendered as text, never as markup: the coach's half of this
                  came from a language model, so it is treated as untrusted
                  like any other input.
                */}
                <p
                  className={[
                    "inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3.5 py-2 text-left text-sm",
                    message.role === "user"
                      ? "bg-brass-wash text-ink"
                      : "bg-surface-sunken text-ink",
                  ].join(" ")}
                >
                  {message.content}
                </p>
              </div>
            ))}

            {isLoading && (
              <p className="text-sm text-ink-faint" aria-live="polite">
                Thinking...
              </p>
            )}
          </div>

          {hasFailed && !isLoading && (
            <p className="mt-3 text-sm text-ink-faint">
              Couldn&apos;t reach your focus coach right now.
            </p>
          )}

          <div ref={conversationEndRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t border-rule px-7 pb-7 pt-5"
        >
          {/* Offered only at the start. Once there is a conversation going,
              the user is typing rather than picking. */}
          {!hasStarted && (
            <div className="mb-4 flex flex-wrap gap-2">
              {quickReasons.map((quickReason) => (
                <button
                  key={quickReason}
                  type="button"
                  onClick={() => handleQuickReason(quickReason)}
                  aria-pressed={draft === quickReason}
                  className={[
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    draft === quickReason
                      ? "border-brass bg-brass-wash text-ink"
                      : "border-rule text-ink-muted hover:border-rule-strong hover:text-ink",
                  ].join(" ")}
                >
                  {quickReason}
                </button>
              ))}
            </div>
          )}

          <label className="sr-only" htmlFor="coach-reason">
            {hasStarted ? "Reply to your focus coach" : "Tell SyntaxTime what happened"}
          </label>
          <div className="flex gap-2">
            <input
              id="coach-reason"
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(changeEvent) => setDraft(changeEvent.target.value)}
              placeholder={
                hasStarted
                  ? "Say something back..."
                  : "Tell SyntaxTime what happened..."
              }
              maxLength={MAX_MESSAGE_LENGTH}
              autoComplete="off"
              className="field-control flex-1"
            />

            {/* Disabled while a reply is in flight, so pressing it twice
                cannot ask twice. */}
            <Button
              type="submit"
              variant="primary"
              isBusy={isLoading}
              busyLabel="..."
              disabled={hasStarted && !draft.trim()}
            >
              Send
            </Button>
          </div>

          {/* Both ways out, on screen the whole time. Nobody is made to talk
              to the coach in order to pause, or to get past it to stop. */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={onKeepFocusing} disabled={isLoading}>
              Keep focusing
            </Button>

            <Button variant="quiet" onClick={onConfirm} disabled={isLoading}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FocusCoachDialog;
