import { useEffect, useState } from 'react';
import { listNodes, traverse } from '../lib/api';
import type { Challenge, Evidence } from '../lib/types';
import { Spinner } from '../components/spinner';

interface Notification {
  id: string;
  type: 'challenge' | 'evidence';
  title: string;
  message: string;
  timestamp: string;
  targetId: string;
  targetType: string;
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch recent challenges and evidence
        const [challenges, evidence] = await Promise.all([
          listNodes<any>('CHALLENGE', 20).catch(() => []),
          listNodes<any>('EVIDENCE', 30).catch(() => []),
        ]);

        const notifs: Notification[] = [];

        // Add challenges as notifications
        challenges.forEach((c: any) => {
          notifs.push({
            id: c.id,
            type: 'challenge',
            title: c.properties.title,
            message: `New challenge: ${c.properties.title}`,
            timestamp: c.created_at,
            targetId: c.id,
            targetType: 'challenge',
          });
        });

        // Add evidence as notifications
        evidence.forEach((e: any) => {
          notifs.push({
            id: e.id,
            type: 'evidence',
            title: e.properties.title,
            message: `New evidence submitted: ${e.properties.title}`,
            timestamp: e.created_at,
            targetId: e.id,
            targetType: 'evidence',
          });
        });

        // Sort by timestamp, newest first
        notifs.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setNotifications(notifs);
      } catch (err) {
        console.error('Failed to load notifications:', err);
        setError('Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
        <span className="ml-2 text-gray-600">Loading notifications...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Notifications</h1>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-xl mb-2">No notifications yet.</p>
          <p>Stay tuned for updates on challenges and evidence.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <a
              key={notif.id}
              href={
                notif.type === 'challenge'
                  ? `/challenge/${notif.targetId}`
                  : `#`
              }
              className="block p-5 bg-white rounded-lg border border-gray-200 hover:border-rabbit-500 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      notif.type === 'challenge'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {notif.type === 'challenge' ? 'Challenge' : 'Evidence'}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{notif.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{notif.message}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500 whitespace-nowrap">
                    {formatTime(notif.timestamp)}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
