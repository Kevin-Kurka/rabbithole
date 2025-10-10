# Gamification Quick Start Guide

## 30-Second Setup

```bash
cd /Users/kmk/rabbithole/backend

# Run setup (migration + seeding)
./setup-gamification.sh

# Start server
npm start

# Test (in another terminal)
node test-gamification.js
```

---

## Quick Reference

### Achievement Categories

| Category | Achievements | Total Points |
|----------|-------------|--------------|
| Evidence | 3 | 2,250 |
| Methodology | 2 | 1,000 |
| Consensus | 3 | 1,200 |
| Collaboration | 2 | 1,100 |
| **TOTAL** | **10** | **5,550** |

### Achievements List

1. 🔍 **Evidence Expert** (500 pts) - Submit 50 evidence pieces
2. 🎯 **Truth Seeker** (750 pts) - 10 nodes with 0.9+ veracity
3. 🌱 **Early Adopter** (1000 pts) - Create Level 0 seed data
4. 📋 **Methodology Master** (600 pts) - Complete 3 methodologies
5. 🏗️ **Graph Architect** (400 pts) - Create 5 graphs
6. 🤝 **Consensus Builder** (400 pts) - 20 process validations
7. ⚔️ **Challenge Accepted** (300 pts) - Submit 10 challenges
8. ✅ **Resolution Pro** (500 pts) - Resolve 5 challenges
9. 💬 **Collaboration Champion** (300 pts) - Send 100 chat messages
10. 👑 **Community Leader** (800 pts) - Help 10 users

---

## Most Common Queries

### Get My Achievements
```graphql
query { myAchievements { achievement { name icon points } earnedAt } }
```

### Leaderboard
```graphql
query { leaderboard(limit: 10) { rank user { username } totalPoints level } }
```

### My Stats
```graphql
query { userStats { totalPoints level categoryBreakdown } }
```

---

## Integration Examples

### After Evidence Submission
```typescript
import { AchievementService } from './services/AchievementService';

// In your resolver
await achievementService.updateReputation(userId, 10, 'evidence');
const newAchievements = await achievementService.checkAchievements(userId);
```

### After Graph Creation
```typescript
await achievementService.updateReputation(userId, 20, 'methodology');
await achievementService.checkAchievements(userId);
```

### After Voting
```typescript
await achievementService.updateReputation(userId, 5, 'consensus');
await achievementService.checkAchievements(userId);
```

---

## Level Progression

| Level | Points | Formula |
|-------|--------|---------|
| 1 | 0 | floor(sqrt(0/100)) |
| 2 | 100 | floor(sqrt(100/100)) |
| 3 | 400 | floor(sqrt(400/100)) |
| 5 | 1,600 | floor(sqrt(1600/100)) |
| 10 | 9,900 | floor(sqrt(9900/100)) |

Formula: `Level = floor(sqrt(total_points / 100))`

---

## Testing Flow

1. **Check achievements exist**:
   ```bash
   psql $DATABASE_URL -c 'SELECT COUNT(*) FROM "Achievements";'
   # Should return: 10
   ```

2. **Award test points**:
   ```graphql
   mutation {
     awardPoints(userId: "user-id", points: 500, category: "evidence")
   }
   ```

3. **Check for unlocks**:
   ```graphql
   mutation { checkMyAchievements { name icon points } }
   ```

4. **View leaderboard**:
   ```graphql
   query { leaderboard(limit: 5) { rank user { username } totalPoints } }
   ```

---

## Troubleshooting

### "No achievements found"
```bash
npm run seed:achievements
```

### "Leaderboard is empty"
```bash
# Award some test points
psql $DATABASE_URL -c 'UPDATE "UserReputation" SET total_points = 500 WHERE user_id = (SELECT id FROM "Users" LIMIT 1);'
```

### "Level not updating"
```sql
-- Check trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_update_user_level';

-- Manual update
UPDATE "UserReputation" SET total_points = total_points WHERE user_id = 'user-id';
```

---

## GraphQL Playground Examples

Open http://localhost:4000/graphql and try:

### Example 1: View All Achievements by Category
```graphql
query {
  allAchievements {
    category
    name
    icon
    points
    description
  }
}
```

### Example 2: Check My Progress
```graphql
query {
  userStats {
    totalPoints
    level
    achievements {
      achievement { name icon }
      earnedAt
    }
    categoryBreakdown
  }
}
```

### Example 3: Category Leaderboard
```graphql
query {
  leaderboard(category: "evidence", limit: 10) {
    rank
    user { username }
    evidencePoints
    totalPoints
  }
}
```

---

## Point Recommendations

| Action | Category | Points |
|--------|----------|--------|
| Submit evidence | evidence | 10 |
| Evidence verified | evidence | 25 |
| Create graph | methodology | 20 |
| Complete methodology | methodology | 50 |
| Cast validation vote | consensus | 5 |
| Submit challenge | consensus | 15 |
| Resolve challenge | consensus | 40 |
| Send chat message | collaboration | 2 |
| Join conversation | collaboration | 5 |

---

## Files Reference

| File | Purpose |
|------|---------|
| `migrations/007_gamification_system.sql` | Database schema |
| `src/config/achievements.ts` | Achievement definitions |
| `src/services/AchievementService.ts` | Business logic |
| `src/resolvers/GamificationResolver.ts` | GraphQL API |
| `test-gamification.js` | Test suite |
| `setup-gamification.sh` | Setup script |

---

## Support Resources

1. **Full Documentation**: `GAMIFICATION_SYSTEM.md`
2. **Test Script**: `node test-gamification.js`
3. **Setup Script**: `./setup-gamification.sh`
4. **Migration File**: `migrations/007_gamification_system.sql`

---

**Last Updated**: October 9, 2025
