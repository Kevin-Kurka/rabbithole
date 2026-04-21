import { chatWithAI, listNodes, createNode, createEdge } from './api';
import type { SentientNode } from './types';

export interface EnhancementResult {
  success: boolean;
  data?: EnhancementData;
  error?: string;
}

export interface EnhancementData {
  suggested_tags: string[];
  suggested_connections: SuggestedConnection[];
  extracted_claims: ExtractedClaim[];
  suggested_challenges: SuggestedChallenge[];
  credibility_notes: string;
}

export interface SuggestedConnection {
  target_id: string;
  relationship_type: string;
  label: string;
  confidence: number;
}

export interface ExtractedClaim {
  text: string;
  tags: string[];
  confidence: number;
}

export interface SuggestedChallenge {
  claim_text: string;
  framework: 'legal' | 'scientific' | 'journalistic' | 'logical' | 'intelligence';
  rationale: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ApplyResult {
  applied: {
    connections: number;
    claims: number;
    tags: number;
    challenges: number;
  };
  errors?: string[];
}

export async function enhanceArticle(
  articleId: string,
  articleTitle: string,
  articleBody: string,
  existingNodes: any[]
): Promise<EnhancementResult> {
  // Build context about existing nodes for the AI
  const nodeContext = existingNodes
    .slice(0, 30)
    .map(n => {
      const p = n.properties || {};
      return `[${n.type}] ${p.title || p.text || p.url || ''} (id: ${n.id})`;
    })
    .join('\n');

  const prompt = `You are analyzing an article in a research database. Analyze it objectively and provide structured enhancements.

ARTICLE: "${articleTitle}"
BODY: ${articleBody.slice(0, 2000)}

EXISTING NODES IN DATABASE:
${nodeContext || 'None'}

Provide your analysis as JSON:
{
  "suggested_tags": ["tag1", "tag2"],
  "suggested_connections": [
    {"target_id": "existing-node-id", "relationship_type": "describes_same_event", "label": "why connected", "confidence": 85}
  ],
  "extracted_claims": [
    {"text": "specific claim from the article", "tags": ["tag1"], "confidence": 70}
  ],
  "suggested_challenges": [
    {"claim_text": "the claim to challenge", "framework": "journalistic", "rationale": "why this should be challenged", "severity": "high"}
  ],
  "credibility_notes": "Overall assessment of source quality and potential biases"
}

RULES:
- Only suggest connections to nodes that exist in the database (use their IDs)
- Extract specific, falsifiable claims — not vague statements
- Tag claims with: financial, legal, intelligence, forensic, testimony, timeline, coverup, conspiracy, official_narrative, recurring_pattern, contradiction, corroboration
- For challenges, pick the most appropriate framework: legal, scientific, journalistic, logical, or intelligence
- Be OBJECTIVE — flag claims from ALL sides, not just one narrative
- Confidence scores 0-100`;

  try {
    const response = await chatWithAI([{ role: 'user', content: prompt }]);
    const content = response?.message?.content || response?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { success: false, error: 'No JSON in response' };
    const result = JSON.parse(jsonMatch[0]);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function applyEnhancements(
  articleId: string,
  enhancements: EnhancementData,
  tenantId: string
): Promise<ApplyResult> {
  const applied = { connections: 0, claims: 0, tags: 0, challenges: 0 };
  const errors: string[] = [];

  // Apply connections
  for (const conn of enhancements.suggested_connections || []) {
    try {
      await createEdge(
        articleId,
        conn.target_id,
        'RELATED_TO',
        {
          label: conn.label,
          relationship_type: conn.relationship_type,
          confidence: conn.confidence,
          created_by: 'ai',
          status: 'active',
        },
        tenantId
      );
      applied.connections++;
    } catch (e) {
      errors.push(`Failed to create connection: ${String(e)}`);
    }
  }

  // Create extracted claims
  for (const claim of enhancements.extracted_claims || []) {
    try {
      const claimNode = await createNode(
        'CLAIM',
        {
          text: claim.text,
          status: 'unchallenged',
          tags: claim.tags || [],
          confidence: claim.confidence,
          extracted_by: 'ai',
        },
        tenantId
      );
      await createEdge(articleId, claimNode.id, 'CONTAINS_CLAIM', {}, tenantId);
      applied.claims++;
    } catch (e) {
      errors.push(`Failed to create claim: ${String(e)}`);
    }
  }

  return { applied, errors: errors.length > 0 ? errors : undefined };
}

export async function findDuplicateNodesByType(nodes: any[]): Promise<DuplicateGroup[]> {
  // Group nodes by type
  const byType: Record<string, any[]> = {};
  for (const n of nodes) {
    const t = n.type || 'UNKNOWN';
    if (!byType[t]) byType[t] = [];
    byType[t].push(n);
  }

  // For each type with multiple nodes, ask AI to find duplicates
  const groups: DuplicateGroup[] = [];

  for (const [type, typeNodes] of Object.entries(byType)) {
    if (typeNodes.length < 2) continue;

    const summaries = typeNodes
      .map(n => {
        const p = n.properties || {};
        return `ID: ${n.id} | ${p.title || p.text || p.url || 'untitled'} | ${(p.body || p.summary || '').slice(0, 100)}`;
      })
      .join('\n');

    const prompt = `Analyze these ${type} nodes for duplicates or near-duplicates. Two nodes are duplicates if they describe the same thing, even with different wording.

NODES:
${summaries}

Return JSON:
{
  "duplicate_groups": [
    {"ids": ["id1", "id2"], "reason": "why these are duplicates", "keep_id": "id-of-best-version"}
  ]
}

If no duplicates found, return {"duplicate_groups": []}`;

    try {
      const response = await chatWithAI([{ role: 'user', content: prompt }]);
      const content = response?.message?.content || response?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        for (const g of parsed.duplicate_groups || []) {
          groups.push({ ...g, type });
        }
      }
    } catch (e) {
      console.error(`Error finding duplicates for type ${type}:`, e);
    }
  }

  return groups;
}

export interface DuplicateGroup {
  ids: string[];
  reason: string;
  keep_id: string;
  type: string;
}
