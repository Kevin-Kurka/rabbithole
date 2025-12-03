import { NotificationService, NOTIFICATION_CREATED, NotificationData } from '../services/NotificationService';
import { Pool } from 'pg';

// Mock dependencies
const mockPool: any = {
  query: jest.fn()
};

const mockPubSub: any = {
  publish: jest.fn()
};

// Test data
const mockUserId = 'user-123';
const mockNotificationId = 'notif-456';
const mockCommentAuthorId = 'author-789';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService(mockPool, mockPubSub);
    jest.clearAllMocks();
  });

  // ============================================================================
  // createNotification() - Create single notification
  // ============================================================================

  describe('createNotification()', () => {
    it('should create notification with all fields', async () => {
      const mockNotification = {
        id: mockNotificationId,
        user_id: mockUserId,
        type: 'mention',
        title: 'You were mentioned',
        message: 'Someone mentioned you',
        entity_type: 'node',
        entity_id: 'node-123',
        related_user_id: 'other-user',
        metadata: JSON.stringify({ key: 'value' }),
        read: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockNotification] });

      const notificationData: NotificationData = {
        type: 'mention',
        title: 'You were mentioned',
        message: 'Someone mentioned you',
        entityType: 'node',
        entityId: 'node-123',
        relatedUserId: 'other-user',
        metadata: { key: 'value' }
      };

      const result = await service.createNotification(mockUserId, notificationData);

      expect(result).toEqual(mockNotification);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO public."Notifications"'),
        [mockUserId, 'mention', 'You were mentioned', 'Someone mentioned you', 'node', 'node-123', 'other-user', '{"key":"value"}']
      );
      expect(mockPubSub.publish).toHaveBeenCalledWith(`${NOTIFICATION_CREATED}_${mockUserId}`, mockNotification);
    });

    it('should create notification with minimal fields', async () => {
      const mockNotification = {
        id: mockNotificationId,
        user_id: mockUserId,
        type: 'general',
        title: 'Title',
        message: 'Message',
        created_at: new Date()
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockNotification] });

      const notificationData: NotificationData = {
        type: 'general',
        title: 'Title',
        message: 'Message'
      };

      const result = await service.createNotification(mockUserId, notificationData);

      expect(result).toEqual(mockNotification);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO public."Notifications"'),
        [mockUserId, 'general', 'Title', 'Message', null, null, null, null]
      );
    });

    it('should publish real-time notification via pub/sub', async () => {
      const mockNotification = {
        id: mockNotificationId,
        user_id: mockUserId,
        type: 'test',
        title: 'Test',
        message: 'Test message'
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockNotification] });

      await service.createNotification(mockUserId, { type: 'test', title: 'Test', message: 'Test message' });

      expect(mockPubSub.publish).toHaveBeenCalledWith(`NOTIFICATION_CREATED_${mockUserId}`, mockNotification);
    });
  });

  // ============================================================================
  // createBulkNotifications() - Create notifications for multiple users
  // ============================================================================

  describe('createBulkNotifications()', () => {
    it('should create notifications for multiple users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const mockNotification1 = { id: 'notif-1', user_id: 'user-1', type: 'bulk' };
      const mockNotification2 = { id: 'notif-2', user_id: 'user-2', type: 'bulk' };
      const mockNotification3 = { id: 'notif-3', user_id: 'user-3', type: 'bulk' };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockNotification1] })
        .mockResolvedValueOnce({ rows: [mockNotification2] })
        .mockResolvedValueOnce({ rows: [mockNotification3] });

      const notificationData: NotificationData = {
        type: 'bulk',
        title: 'Bulk Notification',
        message: 'Sent to multiple users'
      };

      const results = await service.createBulkNotifications(userIds, notificationData);

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('notif-1');
      expect(results[1].id).toBe('notif-2');
      expect(results[2].id).toBe('notif-3');
      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(mockPubSub.publish).toHaveBeenCalledTimes(3);
    });

    it('should handle empty user array', async () => {
      const results = await service.createBulkNotifications([], {
        type: 'test',
        title: 'Test',
        message: 'Test'
      });

      expect(results).toEqual([]);
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // notifyMentionedUsers() - Notify users mentioned in comment
  // ============================================================================

  describe('notifyMentionedUsers()', () => {
    it('should notify mentioned users', async () => {
      const mentionedUserIds = ['user-1', 'user-2'];
      const mockNotification = { id: 'notif-1', user_id: 'user-1' };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockNotification] })
        .mockResolvedValueOnce({ rows: [{ id: 'notif-2', user_id: 'user-2' }] });

      await service.notifyMentionedUsers(
        'Hey @user1 and @user2, check this out!',
        mentionedUserIds,
        mockCommentAuthorId,
        'author_username',
        'node',
        'node-123'
      );

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO public."Notifications"'),
        expect.arrayContaining(['user-1', 'mention', 'You were mentioned'])
      );
    });

    it('should not notify the comment author', async () => {
      const mentionedUserIds = [mockCommentAuthorId, 'user-2'];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'notif-1' }] });

      await service.notifyMentionedUsers(
        'Hey @self and @user2',
        mentionedUserIds,
        mockCommentAuthorId,
        'author_username',
        'node',
        'node-123'
      );

      // Should only be called once for user-2, not for author
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should not create notifications when no users to notify', async () => {
      await service.notifyMentionedUsers(
        'No mentions here',
        [mockCommentAuthorId], // Only author mentioned
        mockCommentAuthorId,
        'author_username',
        'node',
        'node-123'
      );

      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should truncate long comment text to 200 chars', async () => {
      const longComment = 'a'.repeat(300);
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'notif-1' }] });

      await service.notifyMentionedUsers(
        longComment,
        ['user-1'],
        mockCommentAuthorId,
        'author',
        'node',
        'node-123'
      );

      const call = (mockPool.query as jest.Mock).mock.calls[0];
      const metadata = JSON.parse(call[1][7]);
      expect(metadata.commentText.length).toBe(200);
    });
  });

  // ============================================================================
  // notifyCommentReply() - Notify user when their comment gets a reply
  // ============================================================================

  describe('notifyCommentReply()', () => {
    it('should notify parent comment author of reply', async () => {
      const parentAuthorId = 'parent-author-id';
      const replyAuthorId = 'reply-author-id';
      const mockNotification = { id: 'notif-1', user_id: parentAuthorId };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockNotification] });

      await service.notifyCommentReply(
        parentAuthorId,
        replyAuthorId,
        'reply_author',
        'This is a reply',
        'edge',
        'edge-456'
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO public."Notifications"'),
        expect.arrayContaining([parentAuthorId, 'reply', 'New reply to your comment'])
      );
      expect(mockPubSub.publish).toHaveBeenCalled();
    });

    it('should not notify when replying to own comment', async () => {
      const sameUserId = 'user-123';

      await service.notifyCommentReply(
        sameUserId,
        sameUserId,
        'username',
        'Self reply',
        'node',
        'node-123'
      );

      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // getUserNotifications() - Get user's notifications
  // ============================================================================

  describe('getUserNotifications()', () => {
    it('should get all notifications for user', async () => {
      const mockNotifications = [
        { id: 'notif-1', user_id: mockUserId, read: false },
        { id: 'notif-2', user_id: mockUserId, read: true },
        { id: 'notif-3', user_id: mockUserId, read: false }
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockNotifications });

      const results = await service.getUserNotifications(mockUserId, 50, 0, false);

      expect(results).toEqual(mockNotifications);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM public."Notifications"'),
        [mockUserId, 50, 0]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.not.stringContaining('read = false'),
        expect.any(Array)
      );
    });

    it('should get only unread notifications', async () => {
      const mockNotifications = [
        { id: 'notif-1', user_id: mockUserId, read: false },
        { id: 'notif-3', user_id: mockUserId, read: false }
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockNotifications });

      const results = await service.getUserNotifications(mockUserId, 50, 0, true);

      expect(results).toEqual(mockNotifications);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('read = false'),
        [mockUserId, 50, 0]
      );
    });

    it('should support pagination', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await service.getUserNotifications(mockUserId, 25, 50, false);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        [mockUserId, 25, 50]
      );
    });
  });

  // ============================================================================
  // markAsRead() - Mark single notification as read
  // ============================================================================

  describe('markAsRead()', () => {
    it('should mark notification as read', async () => {
      const mockNotification = {
        id: mockNotificationId,
        user_id: mockUserId,
        read: true
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockNotification] });

      const result = await service.markAsRead(mockNotificationId, mockUserId);

      expect(result).toEqual(mockNotification);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE public."Notifications"'),
        [mockNotificationId, mockUserId]
      );
    });

    it('should return null if notification not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await service.markAsRead('nonexistent', mockUserId);

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // markAllAsRead() - Mark all notifications as read
  // ============================================================================

  describe('markAllAsRead()', () => {
    it('should mark all unread notifications as read', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 5, rows: [] });

      const count = await service.markAllAsRead(mockUserId);

      expect(count).toBe(5);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE public."Notifications"'),
        [mockUserId]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('read = false'),
        expect.any(Array)
      );
    });

    it('should return 0 if no unread notifications', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const count = await service.markAllAsRead(mockUserId);

      expect(count).toBe(0);
    });

    it('should handle null rowCount', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: null, rows: [] });

      const count = await service.markAllAsRead(mockUserId);

      expect(count).toBe(0);
    });
  });

  // ============================================================================
  // getUnreadCount() - Get count of unread notifications
  // ============================================================================

  describe('getUnreadCount()', () => {
    it('should return unread notification count', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: '12' }] });

      const count = await service.getUnreadCount(mockUserId);

      expect(count).toBe(12);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        [mockUserId]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('read = false'),
        expect.any(Array)
      );
    });

    it('should return 0 when no unread notifications', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const count = await service.getUnreadCount(mockUserId);

      expect(count).toBe(0);
    });
  });

  // ============================================================================
  // deleteNotification() - Delete notification
  // ============================================================================

  describe('deleteNotification()', () => {
    it('should delete notification successfully', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.deleteNotification(mockNotificationId, mockUserId);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM public."Notifications"'),
        [mockNotificationId, mockUserId]
      );
    });

    it('should return false if notification not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

      const result = await service.deleteNotification('nonexistent', mockUserId);

      expect(result).toBe(false);
    });

    it('should handle null rowCount', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: null });

      const result = await service.deleteNotification(mockNotificationId, mockUserId);

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // parseMentions() - Extract @mentions from text
  // ============================================================================

  describe('parseMentions()', () => {
    it('should parse single mention', () => {
      const text = 'Hello @john, how are you?';
      const mentions = service.parseMentions(text);

      expect(mentions).toEqual(['john']);
    });

    it('should parse multiple mentions', () => {
      const text = 'Hey @alice, @bob, and @charlie!';
      const mentions = service.parseMentions(text);

      expect(mentions).toEqual(['alice', 'bob', 'charlie']);
    });

    it('should remove duplicate mentions', () => {
      const text = '@john said hi, but @john is busy. Ask @john later.';
      const mentions = service.parseMentions(text);

      expect(mentions).toEqual(['john']);
    });

    it('should handle text without mentions', () => {
      const text = 'No mentions here at all';
      const mentions = service.parseMentions(text);

      expect(mentions).toEqual([]);
    });

    it('should handle alphanumeric usernames', () => {
      const text = 'Contact @user123 and @admin_2024';
      const mentions = service.parseMentions(text);

      expect(mentions).toEqual(['user123', 'admin_2024']);
    });
  });

  // ============================================================================
  // getUserIdsByUsernames() - Convert usernames to user IDs
  // ============================================================================

  describe('getUserIdsByUsernames()', () => {
    it('should get user IDs from usernames', async () => {
      const mockUsers = [
        { id: 'id-1' },
        { id: 'id-2' },
        { id: 'id-3' }
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockUsers });

      const userIds = await service.getUserIdsByUsernames(['alice', 'bob', 'charlie']);

      expect(userIds).toEqual(['id-1', 'id-2', 'id-3']);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM public."Users"'),
        [['alice', 'bob', 'charlie']]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ANY($1)'),
        expect.any(Array)
      );
    });

    it('should return empty array for empty input', async () => {
      const userIds = await service.getUserIdsByUsernames([]);

      expect(userIds).toEqual([]);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should handle usernames not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const userIds = await service.getUserIdsByUsernames(['nonexistent']);

      expect(userIds).toEqual([]);
    });
  });
});
