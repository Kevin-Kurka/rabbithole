import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black font-mono">
          <div className="max-w-md w-full space-y-8 bg-black p-8 border border-crt-border">
            <div>
              <h2 className="text-2xl font-bold text-crt-error">[ ERROR ]</h2>
              <p className="mt-2 text-crt-muted">{this.state.error?.message || 'an unexpected error occurred'}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex justify-center py-2 px-4 border border-crt-fg text-sm font-medium text-crt-fg bg-crt-selection hover:border-crt-accent focus:outline-none"
            >
              [ reload page ]
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
