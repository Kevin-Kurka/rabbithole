# Database Migrations

This directory contains SQL migration files for the RabbitHole knowledge graph system.

## Migration Files

### 003_veracity_system.sql
**Phase**: 1.3 - Veracity Score System
**Date**: 2025-10-09
**Dependencies**: Base schema with Nodes, Edges, Users, Challenges tables

Implements the dynamic veracity scoring system for Level 1 nodes and edges, including:
- Evidence tracking and aggregation
- Source credibility scoring
- Consensus calculation
- Challenge impact
- Temporal decay for time-sensitive claims
- Automatic score recalculation via triggers
- Comprehensive audit trail

See `003_veracity_system_guide.md` for detailed documentation.

## Running Migrations

### Option 1: Manual Execution
```bash
psql -U your_user -d rabbithole_db -f migrations/003_veracity_system.sql
```

### Option 2: Docker
```bash
docker exec -i rabbithole-postgres psql -U user -d rabbithole_db < migrations/003_veracity_system.sql
```

### Option 3: Programmatic (Node.js)
```javascript
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration(filename) {
  const sql = fs.readFileSync(`migrations/${filename}`, 'utf8');
  await pool.query(sql);
  console.log(`Migration ${filename} completed`);
}

runMigration('003_veracity_system.sql').then(() => process.exit(0));
```

## Verification

After running a migration, verify it completed successfully:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('Sources', 'Evidence', 'VeracityScores');

-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('calculate_veracity_score', 'refresh_veracity_score');

-- Check triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Check indexes exist
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('Evidence', 'VeracityScores');
```

## Rollback

Each migration should include rollback instructions in its guide document. For example:

```bash
# Rollback 003_veracity_system
psql -U your_user -d rabbithole_db -c "$(cat <<'SQL'
-- See 003_veracity_system_guide.md for full rollback script
SQL
)"
```

## Migration Naming Convention

Files should be named: `{number}_{description}.sql`

- `number`: Three-digit sequential number (001, 002, 003, etc.)
- `description`: Snake_case description of changes

Example: `004_add_user_roles.sql`

## Best Practices

1. **Always test migrations** on a copy of production data
2. **Back up the database** before running migrations
3. **Use transactions** when possible (BEGIN/COMMIT)
4. **Document rollback procedures** in guide files
5. **Include verification queries** to confirm success
6. **Add indexes** for all foreign keys and common query patterns
7. **Create triggers carefully** - they can impact write performance
8. **Monitor performance** after migrations, especially new indexes

## Migration Tracking

Consider creating a migrations tracking table:

```sql
CREATE TABLE IF NOT EXISTS public."schema_migrations" (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT now()
);

-- After applying migration 003
INSERT INTO public."schema_migrations" (version) VALUES ('003_veracity_system');
```

## Support

For questions about migrations:
1. Review the migration guide (e.g., `003_veracity_system_guide.md`)
2. Check the inline comments in the SQL file
3. Consult the database schema documentation
4. Contact the development team

---

**Note**: Always review migration files before running them, especially in production environments.
