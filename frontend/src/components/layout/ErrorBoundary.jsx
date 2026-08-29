import { Component } from "react";

/*
  The last line of defence against a blank page.

  When a React component throws while rendering, React unmounts the whole tree
  and the user is left staring at an empty window with no idea what happened.
  This catches that and says something instead.

  It is a class because catching a render error is the one thing React still
  has no hook for.
*/
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? "" };
  }

  componentDidCatch(error, info) {
    // Kept in the console for whoever is developing. Nothing is sent anywhere.
    console.error("SyntaxTime hit an unexpected error:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-parchment p-6">
        <div className="surface-card max-w-md p-8 text-center shadow-panel">
          <p className="section-eyebrow">SyntaxTime</p>
          <h1 className="mt-2 text-3xl text-ink">Something went wrong</h1>

          <p className="mt-3 text-sm text-ink-muted">
            SyntaxTime could not draw this screen. Your saved study sessions are
            safe - nothing is lost.
          </p>

          {this.state.message && (
            <p className="mt-4 rounded-md border border-rule bg-surface-sunken px-4 py-3 text-left text-sm text-ink-faint">
              {this.state.message}
            </p>
          )}

          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 inline-flex items-center rounded-md border border-ink bg-ink px-4 py-2 text-sm font-medium text-parchment transition-colors hover:bg-ink/90"
          >
            Reload SyntaxTime
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
