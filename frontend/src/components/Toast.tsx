'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Toast as ToastType } from '@/contexts/ToastContext';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const toastStyles: Record<ToastType['type'], { bg: string; border: string; icon: string; iconColor: string }> = {
  success: {
    bg: '#1F2937',
    border: '#10B981',
    icon: '',
    iconColor: '#10B981',
  },
  error: {
    bg: '#1F2937',
    border: '#EF4444',
    icon: '',
    iconColor: '#EF4444',
  },
  warning: {
    bg: '#1F2937',
    border: '#F59E0B',
    icon: ' ',
    iconColor: '#F59E0B',
  },
  info: {
    bg: '#1F2937',
    border: '#3B82F6',
    icon: '9',
    iconColor: '#3B82F6',
  },
};

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchOffset, setTouchOffset] = useState(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const style = toastStyles[toast.type];

  useEffect(() => {
    // Progress bar animation
    if (toast.duration && toast.duration > 0) {
      const interval = 50; // Update every 50ms
      const decrement = (interval / toast.duration) * 100;

      progressInterval.current = setInterval(() => {
        setProgress((prev) => {
          const next = prev - decrement;
          if (next <= 0) {
            clearInterval(progressInterval.current!);
            return 0;
          }
          return next;
        });
      }, interval);

      return () => {
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      };
    }
  }, [toast.duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200); // Match animation duration
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart !== null) {
      const offset = e.touches[0].clientX - touchStart;
      // Only allow right swipe
      if (offset > 0) {
        setTouchOffset(offset);
      }
    }
  };

  const handleTouchEnd = () => {
    // If swiped more than 100px, dismiss
    if (touchOffset > 100) {
      handleDismiss();
    } else {
      // Spring back
      setTouchOffset(0);
    }
    setTouchStart(null);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '16px',
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        minWidth: '320px',
        maxWidth: '100%',
        position: 'relative',
        overflow: 'hidden',
        transform: `translateX(${touchOffset}px)`,
        opacity: isExiting ? 0 : 1,
        transition: isExiting
          ? 'opacity 200ms ease-out, transform 200ms ease-out'
          : touchOffset === 0
          ? 'transform 200ms ease-out'
          : 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress Bar */}
      {toast.duration && toast.duration > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '2px',
            width: `${progress}%`,
            backgroundColor: style.border,
            transition: 'width 50ms linear',
          }}
        />
      )}

      {/* Icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          flexShrink: 0,
          fontSize: '16px',
          fontWeight: 600,
          color: style.iconColor,
          backgroundColor: `${style.iconColor}22`,
          borderRadius: '50%',
        }}
      >
        {style.icon}
      </div>

      {/* Message */}
      <div
        style={{
          flex: 1,
          fontSize: '14px',
          lineHeight: 1.5,
          color: '#fff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        {toast.message}
      </div>

      {/* Dismiss Button */}
      {toast.dismissible && (
        <button
          onClick={handleDismiss}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            flexShrink: 0,
            padding: 0,
            border: 'none',
            backgroundColor: 'transparent',
            color: '#9CA3AF',
            fontSize: '18px',
            lineHeight: 1,
            cursor: 'pointer',
            transition: 'color 200ms ease-out',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#9CA3AF';
          }}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      )}
    </div>
  );
};
