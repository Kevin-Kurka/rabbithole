import React from 'react';

/**
 * LoadingStates - Collection of loading UI components
 *
 * Provides consistent loading experiences across the application
 */

// =================================================================
// LOADING SPINNER
// =================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', text, className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} border-gray-300 border-t-blue-600 rounded-full animate-spin`}
        role="status"
        aria-label="Loading"
      />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );
}

// =================================================================
// PROGRESS BAR
// =================================================================

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressBar({
  progress,
  label,
  showPercentage = true,
  className = '',
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-gray-600">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

// =================================================================
// GRAPH SKELETON
// =================================================================

export function GraphSkeleton() {
  return (
    <div className="w-full h-full bg-gray-50 rounded-lg p-4 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="h-6 bg-gray-300 rounded w-48" />
        <div className="flex gap-2">
          <div className="h-8 bg-gray-300 rounded w-20" />
          <div className="h-8 bg-gray-300 rounded w-20" />
        </div>
      </div>

      <div className="relative w-full h-96 bg-white rounded border border-gray-200">
        {/* Simulate nodes */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-gray-300 rounded-full"
            style={{
              width: '60px',
              height: '60px',
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 2) * 20}%`,
            }}
          />
        ))}

        {/* Simulate edges */}
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-gray-200 h-0.5"
            style={{
              width: `${80 + i * 10}px`,
              left: `${25 + i * 15}%`,
              top: `${40 + (i % 2) * 15}%`,
              transform: `rotate(${-30 + i * 20}deg)`,
            }}
          />
        ))}
      </div>

      {/* Toolbar skeleton */}
      <div className="mt-4 flex gap-4">
        <div className="h-10 bg-gray-300 rounded w-32" />
        <div className="h-10 bg-gray-300 rounded w-32" />
        <div className="h-10 bg-gray-300 rounded flex-1" />
      </div>
    </div>
  );
}

// =================================================================
// LIST SKELETON
// =================================================================

interface ListSkeletonProps {
  rows?: number;
  showAvatar?: boolean;
}

export function ListSkeleton({ rows = 5, showAvatar = false }: ListSkeletonProps) {
  return (
    <div className="w-full space-y-3 animate-pulse">
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200"
        >
          {showAvatar && <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0" />}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
          <div className="w-16 h-6 bg-gray-300 rounded" />
        </div>
      ))}
    </div>
  );
}

// =================================================================
// CARD SKELETON
// =================================================================

interface CardSkeletonProps {
  count?: number;
}

export function CardSkeleton({ count = 3 }: CardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="h-6 bg-gray-300 rounded w-3/4 mb-3" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
            <div className="h-3 bg-gray-200 rounded w-4/6" />
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-8 bg-gray-300 rounded w-20" />
            <div className="h-8 bg-gray-300 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// =================================================================
// TABLE SKELETON
// =================================================================

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="w-full animate-pulse">
      {/* Table header */}
      <div className="bg-gray-100 rounded-t-lg border border-gray-200 p-4 flex gap-4">
        {[...Array(columns)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-300 rounded flex-1" />
        ))}
      </div>

      {/* Table rows */}
      <div className="border-x border-b border-gray-200 rounded-b-lg">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b border-gray-100 last:border-b-0">
            {[...Array(columns)].map((_, j) => (
              <div key={j} className="h-3 bg-gray-200 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// =================================================================
// FULL PAGE LOADER
// =================================================================

interface FullPageLoaderProps {
  text?: string;
}

export function FullPageLoader({ text = 'Loading...' }: FullPageLoaderProps) {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-lg font-medium text-gray-700">{text}</p>
      </div>
    </div>
  );
}

// =================================================================
// INLINE LOADER
// =================================================================

interface InlineLoaderProps {
  text?: string;
  className?: string;
}

export function InlineLoader({ text = 'Loading...', className = '' }: InlineLoaderProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LoadingSpinner size="sm" />
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  );
}

// =================================================================
// BUTTON LOADER
// =================================================================

interface ButtonLoaderProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function ButtonLoader({
  loading,
  children,
  className = '',
  disabled = false,
  onClick,
}: ButtonLoaderProps) {
  return (
    <button
      className={`relative ${className} ${loading ? 'cursor-wait' : ''}`}
      disabled={loading || disabled}
      onClick={onClick}
    >
      <span className={loading ? 'opacity-0' : ''}>{children}</span>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" />
        </div>
      )}
    </button>
  );
}

// =================================================================
// PULSE LOADER (For infinite loading states)
// =================================================================

export function PulseLoader() {
  return (
    <div className="flex items-center justify-center gap-2">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
          style={{
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}

// =================================================================
// SHIMMER EFFECT (Generic shimmer wrapper)
// =================================================================

interface ShimmerProps {
  children: React.ReactNode;
  className?: string;
}

export function Shimmer({ children, className = '' }: ShimmerProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {children}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}

// Export all as default for convenience
export default {
  LoadingSpinner,
  ProgressBar,
  GraphSkeleton,
  ListSkeleton,
  CardSkeleton,
  TableSkeleton,
  FullPageLoader,
  InlineLoader,
  ButtonLoader,
  PulseLoader,
  Shimmer,
};
