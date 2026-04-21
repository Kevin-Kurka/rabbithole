import { createNode, createEdge, chatWithAI } from './api';

export async function generateAutoEvidence(
  challengeId: string,
  claimText: string,
  articleTitle: string,
  tenantId?: string
): Promise<void> {
  // Ask the AI to analyze the claim and find evidence
  const prompt = `You are analyzing a challenged claim from the article "${articleTitle}".

The claim being challenged is: "${claimText}"

Search the database for existing evidence, articles, and claims that are relevant. Then provide exactly 6 pieces of evidence:
- 3 SUPPORTING the challenge (evidence that the claim is questionable/false)
- 3 REFUTING the challenge (evidence that the claim is accurate/true)

For each piece of evidence, provide:
1. title: A concise title (5-10 words max)
2. body: A 2-3 sentence explanation
3. source_type: One of: primary_source, document, data, testimony, expert_opinion, media, academic
4. side: "for" (supports the challenge) or "against" (refutes the challenge)

IMPORTANT: Prefer referencing existing nodes in the database. Be creative and generate plausible evidence based on the claim.

Respond in this exact JSON format and nothing else:
{
  "evidence": [
    {"title": "...", "body": "...", "source_type": "...", "side": "for"},
    {"title": "...", "body": "...", "source_type": "...", "side": "for"},
    {"title": "...", "body": "...", "source_type": "...", "side": "for"},
    {"title": "...", "body": "...", "source_type": "...", "side": "against"},
    {"title": "...", "body": "...", "source_type": "...", "side": "against"},
    {"title": "...", "body": "...", "source_type": "...", "side": "against"}
  ]
}`;

  try {
    const response = await chatWithAI([{ role: 'user', content: prompt }]);

    // Parse the AI response — extract JSON from the message content
    const content = response?.message?.content || response?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*"evidence"[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('AI did not return valid evidence JSON');
      return;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const evidenceItems = parsed.evidence || [];

    // Create evidence nodes and link them to the challenge
    for (const item of evidenceItems) {
      const evidenceNode = await createNode('EVIDENCE', {
        title: item.title,
        body: item.body,
        source_type: item.source_type || 'media',
        side: item.side,
        relevance_score: 70,
        credibility_score: 60,
        status: 'unchallenged',
      }, tenantId);

      // Link evidence to challenge
      const edgeType = item.side === 'for' ? 'SUPPORTS' : 'REFUTES';
      await createEdge(challengeId, evidenceNode.id, edgeType, {}, tenantId);
    }
  } catch (err) {
    console.error('Auto-evidence generation failed:', err);
    // Don't throw — this is a best-effort enhancement
  }
}
