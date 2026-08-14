import { Component } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6">
          <div className="max-w-[460px] w-full surface-card p-8 text-center animate-fade-in">
            <div className="mx-auto h-11 w-11 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-5">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-2">
              Unhandled error
            </div>
            <h2 className="font-serif text-[28px] leading-tight text-foreground mb-2">Something went wrong</h2>
            <p className="text-[13.5px] text-muted-foreground leading-relaxed mb-6">
              {this.state.error.message || "An unexpected error occurred while rendering this view."}
            </p>
            <button
              onClick={this.reset}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-foreground text-background text-[13.5px] font-medium press"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
