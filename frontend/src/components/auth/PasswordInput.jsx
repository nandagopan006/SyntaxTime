import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

/*
  One password field for the whole application.

  Typing a password you cannot see is how people end up locked out of an
  account they just created, so every password field can be revealed. The
  component knows about showing a password and nothing else: no validation, no
  API calls, no navigation. Those belong to the page using it.
*/

/**
 * A password field with a show/hide control.
 *
 * Visibility is local state and starts hidden every time. It is deliberately
 * not remembered between fields or pages: a password left on screen from an
 * earlier visit is a surprise, not a convenience.
 */
function PasswordInput({
  label,
  value,
  onChange,
  name,
  autoComplete = "current-password",
  error = "",
  disabled = false,
  className = "",
  ...props
}) {
  const [isVisible, setIsVisible] = useState(false);
  const generatedId = useId();
  const inputId = props.id || `${name || "password"}-${generatedId}`;
  const errorId = `${inputId}-error`;

  const ToggleIcon = isVisible ? EyeOff : Eye;

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-ink" htmlFor={inputId}>
        {label}
      </label>

      <div className="relative mt-1.5">
        <input
          {...props}
          id={inputId}
          name={name}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          // Room on the right so the longest password never runs under the eye.
          className="field-control pr-11"
        />

        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          disabled={disabled}
          // A screen reader gets the action, not the picture of an eye.
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
          className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-3
                     text-ink-faint transition-colors hover:text-ink
                     disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ToggleIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-burgundy">
          {error}
        </p>
      )}
    </div>
  );
}

export default PasswordInput;
