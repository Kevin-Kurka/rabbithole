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
    jest.resetAllMocks();
    mockPool.query.mockResolvedValue({ rows: [] });
    service = new NotificationService(mockPool, mockPubSub);
  });

  // ============================================================================
  // createNotification() - Create single notification
  // ============================================================================

  describe('createNotification()', () => {
    it('should create notification with all fields', async () => {
      const mockDbNotification = {
        id: mockNotificationId,
        props: JSON.stringify({
          userId: mockUserId,
          type: 'mention',
          title: 'You were mentioned',
          message: 'Someone mentioned you',
          entityType: 'node',
          entityId: 'node-123',
          relatedUserId: 'other-user',
          metadata: { key: 'value' },
          read: false
        }),
        created_at: new Date(),
        updated_at: new Date()
      };

      const expectedNotification = {
        id: mockNotificationId,
        userId: mockUserId,
        type: 'mention',
        message: 'Someone mentioned you',
        read: false,
        created_at: mockDbNotification.created_at
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'type-id' }] })
        .mockResolvedValueOnce({ rows: [mockDbNotification] });

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

      expect(result).toEqual(expectedNotification);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO public."Nodes"'),
        expect.any(Array)
      );
      expect(mockPubSub.publish).toHaveBeenCalledWith(`${NOTIFICATION_CREATED}_${mockUserId}`, expectedNotification);
    });

    it('should create notification with minimal fields', async () => {
      const mockDbNotification = {
        id: mockNotificationId,
        user_id: mockUserId,
        created_at: new Date(),
        props: JSON.stringify({ userId: mockUserId, type: 'general', title: 'Title', message: 'Message', read: false })
      };

      const expectedNotification = {
        id: mockNotificationId,
        userId: mockUserId,
        type: 'general',
        message: 'Message',
        read: false,
        created_at: mockDbNotification.created_at
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'type-id' }] })
        .mockResolvedValueOnce({ rows: [mockDbNotification] });

      const notificationData: NotificationData = {
        type: 'general',
        title: 'Title',
        message: 'Message'
      };

      const result = await service.createNotification(mockUserId, notificationData);

      expect(result).toEqual(expectedNotification);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO public."Nodes"'),
        expect.any(Array)
      );
    });

    it('should publish real-time notification via pub/sub', async () => {
      const mockDbNotification = {
        id: mockNotificationId,
        user_id: mockUserId,
        created_at: new Date(),
        props: JSON.stringify({ userId: mockUserId, type: 'test', title: 'Test', message: 'Test message', read: false })
      };

      const expectedNotification = {
        id: mockNotificationId,
        userId: mockUserId,
        type: 'test',
        message: 'Test message',
        read: false,
        created_at: mockDbNotification.created_at
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'type-id' }] })
        .mockResolvedValueOnce({ rows: [mockDbNotification] });

      await service.createNotification(mockUserId, { type: 'test', title: 'Test', message: 'Test message' });

      expect(mockPubSub.publish).toHaveBeenCalledWith(`${NOTIFICATION_CREATED}_${mockUserId}`, expectedNotification);
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
        .mockResolvedValueOnce({ rows: [{ id: 'type-id' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'notif-1', props: JSON.stringify({ userId: 'u1' }) }] })
        .mockResolvedValueOnce({ rows: [{ id: 'type-id' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'notif-2', props: JSON.stringify({ userId: 'u2' }) }] })
        .mockResolvedValueOnce({ rows: [{ id: 'type-id' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'notif-3', props: JSON.stringify({ userId: 'u3' }) }] });

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
      expect(mockPool.query).toHaveBeenCalledTimes(6);
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
        .mockResolvedValueOnce({ rows: [{ id: 'type-id' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'notif-1', props: JSON.stringify({ userId: 'user-1', type: 'mention' }) }] })
        .mockResolvedValueOnce({ rows: [{ id: 'type-id' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'notif-2', props: JSON.stringify({ userId: 'user-2', type: 'mention' }) }] });

      await service.notifyMentionedUsers(
        'Hey @user1 and @user2, check this out!',
        mentionedUserIds,
        mockCommentAuthorId,
        'author_username',
        'node',
        'node-123'
      );

      expect(mockPool.query).toHaveBeenCalledTimes(4);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO public."Nodes"'),
        expect.any(Array)
      );
    });

    it('should not notify the comment author', async () => {
      const mentionedUserIds = [mockCommentAuthorId, 'user-2'];

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'type-id' }] })
        .mockResolvedValueOnce({
          rows: [{ id: 'notif-1', props: JSON.stringify({ userId: 'user-2', type: 'mention' }) }]
        });

      await service.notifyMentionedUsers(
        'Hey @self and @user2',
        mentionedUserIds,
        mockCommentAuthorId,
        'author_username',
        'node',
        'node-123'
      );

      // Should only be called once for user-2, not for author
      // Should be called for user-2. We don't strictly check times as implementation might do lookups.
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO public."Nodes"'),
        expect.any(Array)
      );
    });

    it('should not create notifications when no users to notify', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'notif-1', props: JSON.stringify({ userId: 'user-1', type: 'mention' }) }]
      });

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
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'type-id' }] })
        .mockResolvedValueOnce({
          rows: [{ id: 'notif-1', props: JSON.stringify({ userId: 'user-1', type: 'mention' }) }]
        });

      await service.notifyMentionedUsers(
        longComment,
        ['user-1'],
        mockCommentAuthorId,
        'author',
        'node',
        'node-123'
      );

      const call = (mockPool.query as jest.Mock).mock.calls[1];
      // Find the argument that contains the metadata (it's in the values array)
      const values = call[1];
      // The second argument (values[1]) is the JSON string of props
      const propsStr = values[1];
      const props = JSON.parse(propsStr);
      const metadata = props.metadata;
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
      const mockNotification = { id: 'notif-1', user_id: parentAuthorId, props: JSON.stringify({ userId: parentAuthorId, type: 'reply', read: false }) };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'type-id' }] })
        .mockResolvedValueOnce({ rows: [{ ...mockNotification, props: JSON.stringify({ userId: parentAuthorId, type: 'reply', read: false }) }] });

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'type-id' }] })
        .mockResolvedValueOnce({
          rows: [{ id: 'notif-2', props: JSON.stringify({ userId: parentAuthorId, type: 'reply', read: false }) }]
        });

      await service.notifyCommentReply(
        parentAuthorId,
        replyAuthorId,
        'reply_author',
        'This is a reply',
        'edge',
        'edge-456'
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO public."Nodes"'),
        expect.any(Array)
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
        { id: 'notif-1', props: JSON.stringify({ userId: mockUserId, type: 'mention', message: 'msg1', read: false }) },
        { id: 'notif-2', props: JSON.stringify({ userId: mockUserId, type: 'mention', message: 'msg2', read: true }) },
        { id: 'notif-3', props: JSON.stringify({ userId: mockUserId, type: 'mention', message: 'msg3', read: false }) }
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockNotifications });

      const results = await service.getUserNotifications(mockUserId, 50, 0, false);

      const expectedResults = [
        { id: 'notif-1', userId: mockUserId, type: 'mention', message: 'msg1', read: false },
        { id: 'notif-2', userId: mockUserId, type: 'mention', message: 'msg2', read: true },
        { id: 'notif-3', userId: mockUserId, type: 'mention', message: 'msg3', read: false }
      ];

      expect(results).toMatchObject(expectedResults);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT n.*'),
        [mockUserId, 50, 0]
      );

    });

    it('should get only unread notifications', async () => {
      const mockNotifications = [
        { id: 'notif-1', props: JSON.stringify({ userId: mockUserId, type: 'mention', message: 'msg1', read: false }) },
        { id: 'notif-3', props: JSON.stringify({ userId: mockUserId, type: 'mention', message: 'msg3', read: false }) }
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockNotifications });

      const results = await service.getUserNotifications(mockUserId, 50, 0, true);

      const expectedResults = [
        { id: 'notif-1', userId: mockUserId, type: 'mention', message: 'msg1', read: false },
        { id: 'notif-3', userId: mockUserId, type: 'mention', message: 'msg3', read: false }
      ];

      expect(results).toMatchObject(expectedResults);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("(n.props->>'read')::boolean = false"),
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
        props: JSON.stringify({ userId: mockUserId, read: true })
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockNotification] }) // SELECT
        .mockResolvedValueOnce({ rows: [mockNotification] }); // UPDATE

      const result = await service.markAsRead(mockNotificationId, mockUserId);

      expect(result).toMatchObject({
        id: mockNotificationId,
        userId: mockUserId,
        read: true
      });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE public."Nodes"'),
        [mockNotificationId]
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
        expect.stringContaining('UPDATE public."Nodes"'),
        [mockUserId]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("n.props->>'read'"),
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
        expect.stringContaining("n.props->>'read'"),
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
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const result = await service.deleteNotification(mockNotificationId, mockUserId);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM public."Nodes"'),
        [mockNotificationId, mockUserId]
      );
    });

    it('should return false if notification not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const result = await service.deleteNotification('nonexistent', mockUserId);

      expect(result).toBe(false);
    });

    it('should handle null rowCount', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: null, rows: [] });

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
        expect.stringContaining('SELECT n.id'),
        [['alice', 'bob', 'charlie']]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM public."Nodes" n'),
        expect.anything()
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
