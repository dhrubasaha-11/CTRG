import React from 'react';

interface Props {
  children: React.ReactNode;
  resetKey?: string;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
    this.setState({ hasError: true, error });
  }

  render() {
    if (this.state.hasError) {
      const err = (this.state as any).error;
      return (
        <div className="app-background flex min-h-screen items-center justify-center px-4">
          <div className="surface-glass w-full max-w-md rounded-3xl border border-slate-200 p-10 text-center shadow-[0_26px_44px_rgba(15,23,42,0.16)]">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">Something went wrong</h1>
            <p className="text-slate-600 mb-4">An unexpected error occurred. Please try refreshing the page.</p>
            {err && (
              <pre className="text-left text-xs text-red-600 bg-red-50 p-3 rounded-lg mb-4 overflow-auto max-h-40">
                {err.message || String(err)}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[linear-gradient(140deg,#1e2a4a_0%,#2a3a5f_100%)] text-white rounded-xl font-semibold shadow-[0_12px_26px_rgba(30,42,74,0.32)] hover:brightness-110 transition"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
