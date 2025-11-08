'use client';

import React, { useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Toast } from './Toast';

/**
 * ToastContainer - Renders all active toasts
 *
 * Position:
 * - Desktop: Bottom-right corner
 * - Mobile: Top of screen
 *
 * Features:
 * - Max 3 toasts visible at once
 * - Stack vertically with 12px gap
 * - Auto-dismiss after duration
 * - Swipe to dismiss on mobile
 * - Listens for Apollo GraphQL errors
 */
export const ToastContainer: React.FC = () => {
  const { toasts, removeToast, error: showError } = useToast();

  // Listen for Apollo error events
  useEffect(() => {
    const handleApolloError = (event: CustomEvent) => {
      const { type, message, operation } = event.detail;

      // Show error toast with operation name if available
      const errorMessage = operation
        ? `${message} (${operation})`
        : message;

      showError(errorMessage, 7000); // Show for 7 seconds for errors
    };

    window.addEventListener('apollo-error', handleApolloError as EventListener);

    return () => {
      window.removeEventListener('apollo-error', handleApolloError as EventListener);
    };
  }, [showError]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <>
      {/* Desktop: Bottom-right */}
      <div
        className="toast-container-desktop"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        <style jsx>{`
          .toast-container-desktop {
            display: flex;
          }

          @media (max-width: 768px) {
            .toast-container-desktop {
              display: none;
            }
          }

          .toast-container-desktop > * {
            pointer-events: auto;
          }
        `}</style>

        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>

      {/* Mobile: Top */}
      <div
        className="toast-container-mobile"
        style={{
          position: 'fixed',
          top: '24px',
          left: '16px',
          right: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        <style jsx>{`
          .toast-container-mobile {
            display: none;
          }

          @media (max-width: 768px) {
            .toast-container-mobile {
              display: flex;
            }
          }

          .toast-container-mobile > * {
            pointer-events: auto;
          }
        `}</style>

        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </>
  );
};
