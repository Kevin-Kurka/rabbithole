'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logComponentError } from '@/utils/errorLogger';

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
    // Log error with error logger utility
    logComponentError(error, 'ErrorBoundary', {
      componentStack: errorInfo.componentStack,
      resetKeys: this.props.resetKeys,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      errorInfo,
    });
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

      // Default fallback UI - Tesla-inspired design
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
            backgroundColor: '#000',
            color: '#fff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            {/* Error Icon */}
            <div
              style={{
                fontSize: '64px',
                marginBottom: '24px',
              }}
            >
              ⚠️
            </div>

            {/* Error Title */}
            <h1
              style={{
                fontSize: '32px',
                fontWeight: 600,
                marginBottom: '16px',
                lineHeight: 1.25,
                margin: '0 0 16px 0',
              }}
            >
              Something went wrong
            </h1>

            {/* Error Description */}
            <p
              style={{
                fontSize: '16px',
                lineHeight: 1.5,
                color: '#9CA3AF',
                marginBottom: '32px',
              }}
            >
              We encountered an unexpected error. This has been logged and we'll look into it.
              You can try refreshing the page or return to the home page.
            </p>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details
                style={{
                  marginBottom: '32px',
                  padding: '16px',
                  backgroundColor: '#1F2937',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <summary
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '12px',
                    color: '#F59E0B',
                  }}
                >
                  Error Details (Development Only)
                </summary>
                <pre
                  style={{
                    fontSize: '12px',
                    lineHeight: 1.5,
                    color: '#EF4444',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={this.reset}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#fff',
                  backgroundColor: '#3B82F6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 200ms ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }}
              >
                Try Again
              </button>

              <button
                onClick={() => window.location.href = '/'}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#fff',
                  backgroundColor: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 200ms ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4B5563';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#374151';
                }}
              >
                Go Home
              </button>

              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#9CA3AF',
                  backgroundColor: 'transparent',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'border-color 200ms ease-out, color 200ms ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4B5563';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#374151';
                  e.currentTarget.style.color = '#9CA3AF';
                }}
              >
                Refresh Page
              </button>
            </div>
          </div>
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
