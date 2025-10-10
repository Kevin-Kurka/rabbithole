/**
 * RemoteCursor Component
 *
 * Renders a cursor for a remote user on the canvas.
 * Features:
 * - SVG cursor with custom color
 * - Username tooltip on hover
 * - Smooth CSS transitions
 * - Positioned absolutely on canvas
 */

'use client';

import React from 'react';
import { ActiveUser } from '@/types/collaboration';

export interface RemoteCursorProps {
  user: ActiveUser;
  className?: string;
}

export function RemoteCursor({ user, className = '' }: RemoteCursorProps) {
  if (!user.cursor) return null;

  return (
    <div
      className={`remote-cursor pointer-events-none absolute z-50 ${className}`}
      style={{
        left: `${user.cursor.x}px`,
        top: `${user.cursor.y}px`,
        transition: 'left 0.15s ease-out, top 0.15s ease-out',
      }}
    >
      {/* Cursor SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))',
        }}
      >
        <path
          d="M5.65376 12.3673L7.70678 19.0423L10.0516 15.149L13.6785 17.9882L14.7266 15.9833L11.0997 13.1441L15.4697 12.3673L5.65376 12.3673Z"
          fill={user.color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>

      {/* Username Label */}
      <div
        className="absolute top-6 left-0 px-2 py-1 text-xs font-medium text-white rounded shadow-lg whitespace-nowrap"
        style={{
          backgroundColor: user.color,
        }}
      >
        {user.username}
      </div>
    </div>
  );
}

export default RemoteCursor;
