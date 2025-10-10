# Collaboration System - Quick Start Guide

## Prerequisites

- PostgreSQL running
- Redis running
- Node.js environment set up

## Step 1: Run Database Migration

```bash
# Option 1: Using psql directly
psql postgresql://postgres:postgres@localhost:5432/rabbithole_db -f migrations/008_collaboration_system.sql

# Option 2: Using Docker
docker exec -i rabbithole-postgres psql -U postgres -d rabbithole_db < migrations/008_collaboration_system.sql

# Option 3: Using environment variable
psql $DATABASE_URL -f migrations/008_collaboration_system.sql
```

Expected output:
```
CREATE TABLE
CREATE INDEX
...
NOTICE: Collaboration system migration completed successfully!
NOTICE: Tables created: ChatMessages, UserPresence, GraphShares, GraphInvitations, GraphActivity, CollaborationSessions
```

## Step 2: Verify Redis Connection

```bash
# Test Redis connection
redis-cli ping
# Expected: PONG

# Check Redis is accessible on configured port
redis-cli -h localhost -p 6379 ping
```

Update `.env` if needed:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Step 3: Start the Server

```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm start
```

Expected output:
```
🚀 Server ready at http://localhost:4000/graphql
```

## Step 4: Run Tests

In a new terminal:

```bash
# Run collaboration test suite
node test-collaboration.js
```

Expected output should show all tests passing:
```
==========================================================
  REAL-TIME COLLABORATION SYSTEM TEST SUITE
==========================================================

✓ Passed: 7-8
✗ Failed: 0

🎉 All tests passed!
```

## Step 5: Test in GraphQL Playground

Open http://localhost:4000/graphql and try these queries:

### Create a Test User

```graphql
mutation {
  createUser(username: "alice") {
    id
    username
  }
}
```

### Create a Test Graph

```graphql
mutation {
  createGraph(title: "Test Collaboration Graph") {
    id
    title
  }
}
```

### Join the Graph

```graphql
mutation {
  joinGraph(
    graphId: "YOUR_GRAPH_ID"
    sessionId: "session-123"
  )
}
```

### Send a Chat Message

```graphql
mutation {
  sendChatMessage(
    graphId: "YOUR_GRAPH_ID"
    message: "Hello, world!"
  ) {
    id
    username
    message
    timestamp
  }
}
```

### Get Chat Messages

```graphql
query {
  getChatMessages(graphId: "YOUR_GRAPH_ID", limit: 10) {
    id
    username
    message
    timestamp
  }
}
```

### Get Active Users

```graphql
query {
  activeUsers(graphId: "YOUR_GRAPH_ID") {
    userId
    status
    lastHeartbeat
  }
}
```

## Step 6: Test WebSocket Subscriptions

Create a WebSocket subscription (in GraphQL Playground, use separate tab for subscriptions):

```graphql
subscription {
  chatMessage(graphId: "YOUR_GRAPH_ID") {
    id
    username
    message
    timestamp
  }
}
```

Then in another tab, send a message using the mutation above. You should see the subscription receive the message in real-time.

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
- Check DATABASE_URL in `.env`
- Ensure PostgreSQL is running
- Verify database exists: `psql -l | grep rabbithole`

### Issue: "Redis connection failed"

**Solution:**
- Check Redis is running: `redis-cli ping`
- Verify REDIS_HOST and REDIS_PORT in `.env`
- Check firewall/network settings

### Issue: "WebSocket connection failed"

**Solution:**
- Ensure server is running on correct port
- Check that WebSocket path is `/graphql`
- Verify no proxy is blocking WebSocket connections
- Check browser console for CORS errors

### Issue: "Migration already applied"

If you see errors about tables already existing:

```bash
# Drop tables (CAUTION: This will delete data!)
psql $DATABASE_URL -c "DROP TABLE IF EXISTS \"ChatMessages\", \"UserPresence\", \"GraphShares\", \"GraphInvitations\", \"CollaborationSessions\" CASCADE;"

# Then re-run migration
psql $DATABASE_URL -f migrations/008_collaboration_system.sql
```

### Issue: "TypeScript decorator errors"

These are warnings from the TypeScript compiler but don't affect runtime. The application uses `ts-node` which handles decorators correctly with `experimentalDecorators` enabled in `tsconfig.json`.

To suppress these warnings:
```bash
# Use ts-node instead of tsc
npm start
```

## Verification Checklist

- [ ] Migration ran successfully
- [ ] Server starts without errors
- [ ] Redis connection working (check server logs)
- [ ] Database tables created (check via psql or pgAdmin)
- [ ] Test script passes all tests
- [ ] GraphQL queries work in playground
- [ ] WebSocket subscriptions receive messages
- [ ] Chat messages persist across server restart

## Next Steps

1. **Frontend Integration**: Implement React components using Apollo Client
2. **Authentication**: Add JWT token to WebSocket connection
3. **Rate Limiting**: Add rate limiting to prevent spam
4. **Monitoring**: Set up logging and metrics

## Quick Reference

### Key Files
- **Migration**: `/migrations/008_collaboration_system.sql`
- **Entities**: `/src/entities/Collaboration.ts`
- **Chat Service**: `/src/services/ChatService.ts`
- **Presence Service**: `/src/services/collaboration/PresenceService.ts`
- **Resolvers**: `/src/resolvers/CollaborationResolver.ts`
- **Test Script**: `/test-collaboration.js`

### Redis Keys
```
chat:{graphId}                      # Chat messages
presence:{graphId}:{userId}:{sessionId}  # User presence
graph:{graphId}:users               # Active users set
```

### PubSub Topics
```
USER_JOINED:{graphId}
USER_LEFT:{graphId}
CURSOR_MOVED:{graphId}
CHAT_MESSAGE:{graphId}
ACTIVITY_CREATED:{graphId}
```

### Important Commands

```bash
# Check tables
psql $DATABASE_URL -c "\dt"

# View chat messages
psql $DATABASE_URL -c "SELECT * FROM \"ChatMessages\" LIMIT 5;"

# View active users
psql $DATABASE_URL -c "SELECT * FROM \"UserPresence\" WHERE status != 'offline';"

# Monitor Redis
redis-cli MONITOR

# Check Redis keys
redis-cli KEYS "*"

# Clear Redis cache
redis-cli FLUSHALL  # CAUTION: Deletes all Redis data
```

## Support

For issues or questions:
1. Check the detailed [COLLABORATION_SYSTEM_SUMMARY.md](./COLLABORATION_SYSTEM_SUMMARY.md)
2. Review server logs for errors
3. Test with the provided test script
4. Verify all prerequisites are met

---

**Last Updated:** October 9, 2025
**Version:** 1.0.0
