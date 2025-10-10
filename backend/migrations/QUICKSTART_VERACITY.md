# Veracity System Quick Start

## Overview

The Veracity Score System provides dynamic credibility scoring for Level 1 knowledge graph nodes and edges. Level 0 items have fixed veracity = 1.0, while Level 1 items are scored based on evidence, consensus, challenges, and source credibility.

## Installation

### 1. Apply Migration

```bash
# Using psql
psql -U your_user -d rabbithole_db -f backend/migrations/003_veracity_system.sql

# Or via Docker
docker exec -i rabbithole-postgres psql -U user -d rabbithole_db \
  < backend/migrations/003_veracity_system.sql
```

### 2. Verify Installation

```bash
psql -U your_user -d rabbithole_db -f backend/migrations/003_veracity_system_test.sql
```

Look for ✓ markers indicating passed tests.

## Basic Usage

### Get Veracity Score for a Node

```sql
-- Option 1: Using the view (recommended)
SELECT
  veracity_score,
  evidence_count,
  consensus_score,
  challenge_count,
  calculated_at
FROM public."VeracityScoresSummary"
WHERE target_node_id = '<your-node-uuid>';

-- Option 2: Direct calculation
SELECT calculate_veracity_score('node', '<your-node-uuid>');
```

### Add Evidence

```sql
-- 1. Add source (if new)
INSERT INTO public."Sources" (
  source_type,
  title,
  authors,
  url,
  submitted_by
) VALUES (
  'academic_paper',
  'Research Paper Title',
  ARRAY['Dr. Author'],
  'https://example.com/paper',
  '<user-uuid>'
) RETURNING id;

-- 2. Add evidence
INSERT INTO public."Evidence" (
  target_node_id,
  source_id,
  evidence_type,
  weight,
  confidence,
  content,
  submitted_by
) VALUES (
  '<node-uuid>',
  '<source-uuid>',
  'supporting',  -- or 'refuting', 'neutral', 'clarifying'
  0.9,           -- importance (0.0 to 1.0)
  0.85,          -- confidence (0.0 to 1.0)
  'Evidence description',
  '<user-uuid>'
);

-- Veracity score is automatically recalculated by trigger
```

### Create Challenge

```sql
INSERT INTO public."Challenges" (
  target_node_id,
  status,
  rebuttal_claim,
  rebuttal_grounds
) VALUES (
  '<node-uuid>',
  'open',
  'This claim is disputed because...',
  '{"reason": "methodology_flaw"}'::jsonb
);

-- Veracity score automatically updated (reduced by challenge impact)
```

### Find Disputed Claims

```sql
SELECT
  target_node_id,
  veracity_score,
  evidence_count,
  challenge_count
FROM public."VeracityScoresSummary"
WHERE
  veracity_score < 0.5
  AND evidence_count >= 3
ORDER BY veracity_score ASC
LIMIT 20;
```

### Find High-Confidence Claims

```sql
SELECT
  target_node_id,
  veracity_score,
  evidence_count,
  consensus_score
FROM public."VeracityScoresSummary"
WHERE
  veracity_score > 0.85
  AND evidence_count >= 5
  AND challenge_count = 0
ORDER BY veracity_score DESC
LIMIT 20;
```

## Common Patterns

### 1. Get All Evidence for a Node

```sql
SELECT
  es.id,
  es.source_title,
  es.evidence_type,
  es.weight,
  es.confidence,
  es.source_credibility,
  es.effective_weight,
  es.content
FROM public."EvidenceSummary" es
WHERE es.target_node_id = '<node-uuid>'
ORDER BY es.effective_weight DESC;
```

### 2. Track Score Changes

```sql
SELECT
  h.old_score,
  h.new_score,
  h.score_delta,
  h.change_reason,
  h.changed_at
FROM public."VeracityScoreHistory" h
JOIN public."VeracityScores" vs ON h.veracity_score_id = vs.id
WHERE vs.target_node_id = '<node-uuid>'
ORDER BY h.changed_at DESC;
```

### 3. Analyze Source Quality

```sql
SELECT
  s.title,
  s.source_type,
  sc.credibility_score,
  sc.total_evidence_count,
  sc.challenge_ratio
FROM public."Sources" s
JOIN public."SourceCredibility" sc ON s.id = sc.source_id
WHERE sc.total_evidence_count >= 5
ORDER BY sc.credibility_score DESC
LIMIT 20;
```

### 4. Verify Evidence

```sql
UPDATE public."Evidence"
SET
  is_verified = true,
  verified_by = '<user-uuid>',
  verified_at = now(),
  peer_review_status = 'accepted'
WHERE id = '<evidence-uuid>';

-- This triggers automatic updates to:
-- 1. Veracity score for the target node/edge
-- 2. Source credibility for the source
```

### 5. Recalculate Score Manually

```sql
SELECT refresh_veracity_score(
  'node',                    -- or 'edge'
  '<target-uuid>',
  'manual_recalculation'
);
```

### 6. Batch Recalculate Expired Scores

```sql
-- Find and recalculate expired scores
SELECT refresh_veracity_score(
  CASE WHEN target_node_id IS NOT NULL THEN 'node' ELSE 'edge' END,
  COALESCE(target_node_id, target_edge_id),
  'scheduled_recalculation'
)
FROM public."VeracityScores"
WHERE expires_at IS NOT NULL AND expires_at < now();
```

## Understanding Scores

### Veracity Score Formula

```
veracity_score = consensus_score + challenge_impact

where:
  consensus_score = supporting_weight / (supporting_weight + refuting_weight)
  challenge_impact = -0.05 × open_challenges (max -0.5)
```

### Evidence Effective Weight

```
effective_weight = base_weight × confidence × temporal_relevance ×
                   source_credibility × peer_review_multiplier

where:
  base_weight: Set by submitter (0.0 to 1.0)
  confidence: Set by submitter (0.0 to 1.0)
  temporal_relevance: Decays over time for time-sensitive claims
  source_credibility: From SourceCredibility table (0.0 to 1.0)
  peer_review_multiplier: accepted=1.2, disputed=0.8, rejected=0.5, pending=1.0
```

### Score Interpretation

- **0.85 - 1.00**: High confidence, strong consensus, minimal challenges
- **0.70 - 0.84**: Moderate confidence, good consensus
- **0.50 - 0.69**: Neutral to slightly positive, some disagreement
- **0.30 - 0.49**: Disputed, more refuting than supporting evidence
- **0.00 - 0.29**: Strongly disputed, very low credibility

## Integration with GraphQL

### Example TypeScript/Node.js

```typescript
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get veracity score
async function getVeracityScore(nodeId: string) {
  const result = await pool.query(
    `SELECT * FROM public."VeracityScoresSummary" WHERE target_node_id = $1`,
    [nodeId]
  );
  return result.rows[0];
}

// Add evidence
async function addEvidence(
  targetNodeId: string,
  sourceId: string,
  evidenceType: 'supporting' | 'refuting' | 'neutral' | 'clarifying',
  weight: number,
  confidence: number,
  content: string,
  userId: string
) {
  const result = await pool.query(
    `INSERT INTO public."Evidence" (
      target_node_id, source_id, evidence_type,
      weight, confidence, content, submitted_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id`,
    [targetNodeId, sourceId, evidenceType, weight, confidence, content, userId]
  );
  return result.rows[0];
}

// Find disputed claims
async function findDisputedClaims(threshold: number = 0.5, limit: number = 20) {
  const result = await pool.query(
    `SELECT * FROM public."VeracityScoresSummary"
     WHERE veracity_score < $1 AND evidence_count >= 3
     ORDER BY veracity_score ASC
     LIMIT $2`,
    [threshold, limit]
  );
  return result.rows;
}
```

## Performance Tips

1. **Use views for common queries**: `VeracityScoresSummary` and `EvidenceSummary` are optimized
2. **Batch evidence inserts**: Insert multiple pieces of evidence, scores auto-update
3. **Cache in application**: Cache frequently accessed scores in Redis
4. **Monitor slow queries**: Use `EXPLAIN ANALYZE` to identify issues
5. **Set expires_at**: Schedule periodic recalculations for time-sensitive claims

## Maintenance

### Daily Tasks

```sql
-- Create consensus snapshots
INSERT INTO public."ConsensusSnapshots" (
  target_node_id, consensus_score, source_count, evidence_count, supporting_ratio
)
SELECT
  target_node_id, consensus_score, source_count, evidence_count,
  supporting_evidence_weight / NULLIF(evidence_weight_sum, 0)
FROM public."VeracityScores"
WHERE target_node_id IS NOT NULL;
```

### Weekly Tasks

```sql
-- Recalculate source credibility
SELECT update_source_credibility(id)
FROM public."Sources"
WHERE id IN (
  SELECT DISTINCT source_id FROM public."Evidence"
  WHERE created_at > now() - INTERVAL '7 days'
);

-- Vacuum analyze
VACUUM ANALYZE public."Evidence";
VACUUM ANALYZE public."VeracityScores";
```

### Monthly Tasks

```sql
-- Archive old history
DELETE FROM public."VeracityScoreHistory"
WHERE changed_at < now() - INTERVAL '1 year';

-- Reindex
REINDEX TABLE public."Evidence";
REINDEX TABLE public."VeracityScores";
```

## Monitoring

### Key Metrics to Track

```sql
-- Score distribution
SELECT
  CASE
    WHEN veracity_score >= 0.85 THEN 'High'
    WHEN veracity_score >= 0.70 THEN 'Moderate'
    WHEN veracity_score >= 0.50 THEN 'Neutral'
    WHEN veracity_score >= 0.30 THEN 'Disputed'
    ELSE 'Low'
  END AS score_range,
  COUNT(*) as count
FROM public."VeracityScores"
GROUP BY score_range;

-- Evidence volume
SELECT DATE(created_at) as date, COUNT(*) as evidence_count
FROM public."Evidence"
WHERE created_at > now() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Challenge rate
SELECT DATE(created_at) as date, COUNT(*) as challenge_count
FROM public."Challenges"
WHERE created_at > now() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Troubleshooting

### Score Not Updating

Check if triggers are enabled:
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('Evidence', 'Challenges');
```

### Slow Queries

Check if indexes exist:
```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('Evidence', 'VeracityScores');
```

Use EXPLAIN ANALYZE:
```sql
EXPLAIN ANALYZE
SELECT * FROM public."VeracityScoresSummary"
WHERE target_node_id = '<uuid>';
```

### Missing Scores

Manually refresh:
```sql
SELECT refresh_veracity_score('node', '<node-uuid>', 'manual_recalculation');
```

## Additional Resources

- **Full Documentation**: `003_veracity_system_guide.md`
- **ER Diagram**: `003_veracity_system_diagram.txt`
- **Test Suite**: `003_veracity_system_test.sql`
- **Migration File**: `003_veracity_system.sql`

## Support

For issues or questions:
1. Check the full guide: `003_veracity_system_guide.md`
2. Review test cases: `003_veracity_system_test.sql`
3. Verify installation with test script
4. Check database logs for errors
5. Contact development team

---

**Version**: 1.0
**Last Updated**: 2025-10-09
