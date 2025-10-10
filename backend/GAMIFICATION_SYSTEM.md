# Gamification System Implementation Guide

## Overview

The gamification system adds achievements, reputation points, levels, and leaderboards to the Rabbit Hole platform. This enhances user engagement by rewarding process-based contributions.

**Wave 5, Phase 5.3** - Backend Implementation

---

## Features

### 1. Achievements System
- **10 Pre-defined Achievements** across 4 categories:
  - **Evidence** (3): Evidence Expert, Truth Seeker, Early Adopter
  - **Methodology** (2): Methodology Master, Graph Architect
  - **Consensus** (3): Consensus Builder, Challenge Accepted, Resolution Pro
  - **Collaboration** (2): Collaboration Champion, Community Leader

### 2. Reputation & Leveling
- **Points System**: Users earn points for completing achievements
- **Category Points**: Track contributions across 4 categories
- **Level System**: `Level = floor(sqrt(total_points / 100))`
- **Auto-leveling**: Levels update automatically when points change

### 3. Leaderboard
- **Global Leaderboard**: Ranked by total points
- **Category Leaderboards**: Ranked by category-specific points
- **Redis Caching**: 5-minute TTL for performance
- **Top 100**: Default limit, configurable per query

---

## Database Schema

### Tables Created (Migration 007)

#### Achievements
Stores achievement definitions:
```sql
- id: UUID (Primary Key)
- key: VARCHAR(100) UNIQUE (e.g., 'evidence_expert')
- name: VARCHAR(255) (Display name)
- description: TEXT
- icon: VARCHAR(100) (Emoji or icon identifier)
- category: VARCHAR(50) (evidence|methodology|consensus|collaboration)
- points: INT (Points awarded)
- criteria: JSONB (Unlock conditions)
- created_at: TIMESTAMP
```

#### UserAchievements
Tracks which achievements users have earned:
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key -> Users)
- achievement_id: UUID (Foreign Key -> Achievements)
- earned_at: TIMESTAMP
- progress: JSONB (Current progress: { current: 7, total: 10 })
- UNIQUE(user_id, achievement_id)
```

#### UserReputation (Gamification)
Stores user reputation and points:
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key -> Users, UNIQUE)
- total_points: INT
- evidence_points: INT
- methodology_points: INT
- consensus_points: INT
- collaboration_points: INT
- level: INT (Auto-calculated)
- updated_at: TIMESTAMP
- created_at: TIMESTAMP
```

### Views
- **Leaderboard**: Join of UserReputation and Users with rankings
- **UserAchievementProgress**: Cross join showing all achievements and user progress

### Functions
- `calculate_user_level(points INT)`: Calculate level from points
- `update_user_level()`: Trigger function to auto-update level

---

## Files Created

### 1. Database Migration
**Location**: `/migrations/007_gamification_system.sql`
- Creates all gamification tables
- Adds indexes for performance
- Creates views and functions
- Seeds initial reputation for existing users

### 2. Entity Classes
**Location**: `/src/entities/`

- `Achievement.ts`: Achievement definition
- `UserAchievement.ts`: User's earned achievements
- `GamificationReputation.ts`: User reputation and points
- `LeaderboardEntry.ts`: Leaderboard entry with ranking
- `UserStats.ts`: Aggregated user statistics

### 3. Configuration
**Location**: `/src/config/achievements.ts`
- Achievement definitions array
- Helper functions for querying achievements
- TypeScript interfaces for type safety

### 4. Service Layer
**Location**: `/src/services/AchievementService.ts`

Main service handling all gamification logic:
- `checkAchievements(userId)`: Check and award new achievements
- `awardAchievement(userId, achievementKey)`: Award specific achievement
- `getProgress(userId, achievementKey)`: Get progress towards achievement
- `updateReputation(userId, points, category)`: Update user points
- `getLeaderboard(category?, limit)`: Get leaderboard
- `getUserStats(userId)`: Get comprehensive user stats
- `initializeUserReputation(userId)`: Initialize new user

### 5. GraphQL Resolver
**Location**: `/src/resolvers/GamificationResolver.ts`

Queries:
- `myAchievements`: Get current user's achievements
- `allAchievements`: Get all available achievements
- `leaderboard(category?, limit?)`: Get leaderboard
- `userStats(userId?)`: Get user statistics
- `achievementProgress(achievementKey, userId?)`: Get progress percentage

Mutations:
- `checkMyAchievements`: Manually trigger achievement check
- `awardPoints(userId, points, category)`: Award points (admin/system use)

### 6. Seed Script
**Location**: `/src/scripts/seed-achievements.ts`
- Populates Achievements table
- Idempotent (can run multiple times)
- Run with: `npm run seed:achievements`

### 7. Test Script
**Location**: `/test-gamification.js`
- Comprehensive test suite
- Tests all queries and mutations
- Pretty formatted output
- Run with: `node test-gamification.js`

---

## Setup Instructions

### 1. Run Migration

```bash
# From backend directory
psql $DATABASE_URL -f migrations/007_gamification_system.sql
```

### 2. Seed Achievements

```bash
npm run seed:achievements
```

Expected output:
```
🌱 Seeding achievements...

✅ Inserted: Evidence Expert (evidence_expert)
✅ Inserted: Truth Seeker (truth_seeker)
... (10 total)

📊 Summary:
   - Inserted: 10 achievements
   - Updated: 0 achievements
   - Total: 10 achievements
```

### 3. Build TypeScript

```bash
npm run build
```

### 4. Start Server

```bash
npm start
```

### 5. Test Gamification

```bash
node test-gamification.js
```

---

## GraphQL API Examples

### Query All Achievements

```graphql
query {
  allAchievements {
    id
    key
    name
    description
    icon
    category
    points
    criteria
  }
}
```

### Get My Achievements

```graphql
query {
  myAchievements {
    id
    earnedAt
    progress
    achievement {
      name
      icon
      points
      category
    }
  }
}
```

### Get Leaderboard

```graphql
query {
  leaderboard(limit: 10) {
    rank
    user {
      username
    }
    totalPoints
    level
    evidencePoints
    methodologyPoints
    consensusPoints
    collaborationPoints
  }
}
```

### Get User Stats

```graphql
query {
  userStats(userId: "user-uuid-here") {
    totalPoints
    level
    categoryBreakdown
    achievements {
      achievement {
        name
        icon
        points
      }
      earnedAt
    }
  }
}
```

### Award Points (System/Admin)

```graphql
mutation {
  awardPoints(
    userId: "user-uuid-here",
    points: 50,
    category: "evidence"
  )
}
```

### Check for New Achievements

```graphql
mutation {
  checkMyAchievements {
    id
    key
    name
    icon
    points
  }
}
```

---

## Achievement Criteria

Each achievement has criteria stored in JSONB format:

```typescript
{
  type: 'count',           // Type of check
  metric: 'evidence_submitted',  // Metric to measure
  threshold: 50,           // Required value
  operator: 'gte'          // Comparison (gte, lte, eq)
}
```

### Supported Metrics

- `evidence_submitted`: Count of evidence pieces submitted
- `high_veracity_nodes`: Nodes with ≥0.9 veracity score
- `level0_contributions`: Level 0 nodes created
- `methodologies_completed`: Distinct methodologies completed
- `graphs_created`: Graphs created by user
- `process_validations`: ConsensusVotes cast
- `challenges_submitted`: Challenges created
- `challenges_resolved`: Challenges successfully resolved
- `chat_messages_sent`: Chat messages sent
- `users_helped`: Distinct users collaborated with

---

## Event-Driven Achievement Checking

### Recommended Integration Points

Add achievement checks to existing mutations:

#### Evidence Submission
```typescript
// In EvidenceResolver.submitEvidence()
await achievementService.updateReputation(userId, 10, 'evidence');
await achievementService.checkAchievements(userId); // Async
```

#### Methodology Completion
```typescript
// In MethodologyWorkflowResolver.completeMethodology()
await achievementService.updateReputation(userId, 20, 'methodology');
await achievementService.checkAchievements(userId);
```

#### Process Validation
```typescript
// In ProcessValidationResolver.voteOnProcess()
await achievementService.updateReputation(userId, 5, 'consensus');
await achievementService.checkAchievements(userId);
```

#### Chat Messages
```typescript
// In CollaborationResolver.sendChatMessage()
await achievementService.updateReputation(userId, 2, 'collaboration');
await achievementService.checkAchievements(userId);
```

### Async Processing with Redis (Future Enhancement)

For better performance, use Redis pub/sub:

```typescript
// Publish event
await redis.publish('achievement:check', JSON.stringify({ userId }));

// Background worker subscribes and processes
redis.subscribe('achievement:check', async (message) => {
  const { userId } = JSON.parse(message);
  await achievementService.checkAchievements(userId);
});
```

---

## Performance Considerations

### Caching Strategy

1. **Leaderboard**: Cached in Redis for 5 minutes
2. **User Stats**: Query on-demand (could cache per user)
3. **Achievement Definitions**: Static, loaded from config

### Database Indexes

All critical queries are indexed:
- User achievements by user_id
- Reputation by total_points (for leaderboard)
- Category-specific points (for category leaderboards)

### Optimization Tips

1. **Batch Achievement Checks**: Only check after significant actions
2. **Lazy Loading**: Don't check achievements on every action
3. **Progress Caching**: Cache achievement progress per user
4. **Leaderboard Pagination**: Use LIMIT and OFFSET for large datasets

---

## Testing

### Manual Testing Steps

1. **Seed achievements**: `npm run seed:achievements`
2. **Create test user**: Use existing registration
3. **Award points**:
   ```graphql
   mutation {
     awardPoints(userId: "test-user-id", points: 100, category: "evidence")
   }
   ```
4. **Check leaderboard**: Query should show user at rank 1
5. **Verify level**: 100 points = Level 1 (floor(sqrt(100/100)))
6. **Award more points**: 400 points = Level 2 (floor(sqrt(400/100)))
7. **Trigger achievement**: Award 500 evidence points → Evidence Expert unlocks

### Automated Test Suite

Run comprehensive tests:
```bash
node test-gamification.js
```

Tests include:
- Fetching all achievements
- Getting user achievements
- User stats queries
- Global and category leaderboards
- Achievement checking
- Progress tracking

---

## Level Progression

| Level | Points Required |
|-------|----------------|
| 1     | 0-99           |
| 2     | 100-399        |
| 3     | 400-899        |
| 4     | 900-1599       |
| 5     | 1600-2499      |
| 10    | 9900-10999     |
| 20    | 39900-40999    |

Formula: `Points = (Level² × 100)`

---

## Troubleshooting

### Achievement Not Unlocking

1. Check criteria in database:
   ```sql
   SELECT * FROM "Achievements" WHERE key = 'achievement_key';
   ```
2. Verify user metrics:
   ```sql
   SELECT COUNT(*) FROM "Evidence" WHERE submitted_by = 'user_id';
   ```
3. Manually trigger check:
   ```graphql
   mutation { checkMyAchievements { name } }
   ```

### Leaderboard Not Updating

1. Clear Redis cache:
   ```bash
   redis-cli DEL leaderboard leaderboard:*
   ```
2. Check reputation data:
   ```sql
   SELECT * FROM "UserReputation" ORDER BY total_points DESC LIMIT 10;
   ```

### Points Not Updating

1. Check for database errors in logs
2. Verify transaction commits
3. Ensure `UserReputation` record exists:
   ```sql
   INSERT INTO "UserReputation" (user_id) VALUES ('user-id')
   ON CONFLICT DO NOTHING;
   ```

---

## Future Enhancements

1. **Badges**: Visual badges for achievements
2. **Streaks**: Consecutive daily activity tracking
3. **Seasons**: Reset leaderboards periodically
4. **Teams**: Group achievements and team leaderboards
5. **Notifications**: Real-time achievement unlock notifications
6. **Achievement Tiers**: Bronze, Silver, Gold versions
7. **Hidden Achievements**: Secret achievements to discover
8. **Point Decay**: Reputation decay for inactive users
9. **Badges Display**: Public profile page with badges
10. **Achievement Store**: Spend points on rewards

---

## Files Summary

### Created Files
- `migrations/007_gamification_system.sql`
- `src/entities/Achievement.ts`
- `src/entities/UserAchievement.ts`
- `src/entities/GamificationReputation.ts`
- `src/entities/LeaderboardEntry.ts`
- `src/entities/UserStats.ts`
- `src/config/achievements.ts`
- `src/services/AchievementService.ts`
- `src/resolvers/GamificationResolver.ts`
- `src/scripts/seed-achievements.ts`
- `test-gamification.js`
- `GAMIFICATION_SYSTEM.md` (this file)

### Modified Files
- `src/index.ts`: Added GamificationResolver and Redis to context
- `package.json`: Added `seed:achievements` script

---

## Support

For issues or questions:
1. Check this documentation
2. Review test script for usage examples
3. Inspect database schema in migration file
4. Check service implementation for business logic

---

**Implementation Date**: October 9, 2025
**Version**: 1.0.0
**Status**: ✅ Complete
