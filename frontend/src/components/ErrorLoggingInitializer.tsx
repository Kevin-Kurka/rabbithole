'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { initErrorLogging, setUserContext } from '@/utils/errorLogger';

/**
 * ErrorLoggingInitializer - Initializes global error logging and sets user context
 *
 * This component:
 * - Initializes global error handlers (unhandled rejections, uncaught errors)
 * - Sets user context when user logs in/out
 * - Should be mounted once at the root of the app
 */
export const ErrorLoggingInitializer: React.FC = () => {
  const { data: session } = useSession();

  // Initialize error logging on mount
  useEffect(() => {
    initErrorLogging();
  }, []);

  // Update user context when session changes
  useEffect(() => {
    if (session?.user) {
      // Set user ID from session
      const userId = (session.user as any).id || (session as any).userId;
      setUserContext(userId);
    } else {
      // Clear user context on logout
      setUserContext(undefined);
    }
  }, [session]);

  // This component doesn't render anything
  return null;
};
