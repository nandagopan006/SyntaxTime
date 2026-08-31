/*
  One button language for the whole application.

  Before this the same long class string was copied into every file, which is
  how heights, weights and hover states drift apart. Variants describe intent -
  what the button is for - rather than what colour it happens to be.
*/

const VARIANTS = {
  // The one obvious thing to do on a screen. Ink, not brass: brass is for
  // marking what matters, and a page full of gold buttons marks nothing.
  primary:
    "bg-ink text-parchment border border-ink hover:bg-ink/90 active:bg-ink",

  // Everything else worth doing. A sheet of paper with an edge.
  secondary:
    "bg-surface-raised text-ink-muted border border-rule hover:border-rule-strong hover:bg-surface-sunken hover:text-ink active:bg-surface-sunken",

  // Inline actions inside a panel, where a full border would be too much.
  quiet:
    "bg-transparent text-brass border border-transparent hover:bg-brass-wash active:bg-brass-wash",

  // Undoing something. Muted burgundy, never a bright alarm.
  danger:
    "bg-transparent text-burgundy border border-transparent hover:bg-burgundy/10 active:bg-burgundy/10",
};

const SIZES = {
  // Used for the timer controls, which are pressed constantly during a session
  // and deserve a target that does not need aiming for.
  lg: "px-5 py-2.5 text-sm",
  md: "px-4 py-2 text-sm",
  sm: "px-3 py-1.5 text-sm",

  // For the desktop focus window, which the user can resize. A control that
  // stays one size while its window shrinks ends up swallowing the window, so
  // this scales with it and stops at both ends.
  fluid:
    "px-[clamp(0.5rem,2vmin,0.875rem)] py-[clamp(0.1875rem,0.9vmin,0.4375rem)] " +
    "text-[clamp(0.625rem,2.2vmin,0.8125rem)]",
};

/**
 * The application's button.
 *
 * `isBusy` disables the button and shows `busyLabel`, so an action in flight
 * cannot be fired twice and always says what it is doing.
 *
 * A `ref` passes straight through to the button element: React 19 hands refs
 * to function components as an ordinary prop.
 */
function Button({
  variant = "secondary",
  size = "md",
  isBusy = false,
  busyLabel,
  disabled = false,
  fullWidth = false,
  className = "",
  children,
  ...props
}) {
  return (
    <button
      // Explicit, because a button inside a form defaults to submitting it.
      type="button"
      disabled={disabled || isBusy}
      aria-busy={isBusy || undefined}
      {...props}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-md font-medium",
        "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isBusy && busyLabel ? busyLabel : children}
    </button>
  );
}

export default Button;
