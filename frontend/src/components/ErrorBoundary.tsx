'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary - Catches React errors and displays fallback UI
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error componentStack:', errorInfo.componentStack);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // In production, you might want to log to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props): void {
    // Reset error boundary when resetKeys change
    if (this.props.resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys![index]
      );

      if (hasResetKeyChanged && this.state.hasError) {
        this.reset();
      }
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="error-boundary-fallback" style={{
          padding: '2rem',
          margin: '2rem auto',
          maxWidth: '600px',
          backgroundColor: '#fee',
          border: '1px solid #f88',
          borderRadius: '8px',
        }}>
          <h2 style={{ color: '#c33', marginTop: 0 }}>
            Oops! Something went wrong
          </h2>
          <p style={{ color: '#666' }}>
            We're sorry for the inconvenience. An error occurred while rendering this component.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Error Details (Development Only)
              </summary>
              <pre style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '0.875rem',
              }}>
                <strong>Error:</strong> {this.state.error.toString()}
                {this.state.errorInfo && (
                  <>
                    {'\n\n'}
                    <strong>Component Stack:</strong>
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}

          <button
            onClick={this.reset}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#45a049';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#4CAF50';
            }}
          >
            Try Again
          </button>

          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              marginLeft: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#0b7dda';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#2196F3';
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
): React.ComponentType<P> {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
