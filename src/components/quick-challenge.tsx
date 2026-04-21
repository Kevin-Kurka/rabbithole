import { useState } from 'react';
import { chatWithAI } from '../lib/api';
import type { ChallengeFramework } from '../lib/types';

interface QuickChallengeProps {
  claimText: string;
  articleId: string;
  articleTitle: string;
  existingChallenges: any[];
  onClose: () => void;
  onSubmit: (challenge: StructuredChallenge) => void;
}

export interface StructuredChallenge {
  is_duplicate: boolean;
  duplicate_of?: string;
  duplicate_reason?: string;
  framework: ChallengeFramework;
  title: string;
  rationale: string;
  relevant_criteria: string[];
  suggested_tags: string[];
  severity: 'low' | 'medium' | 'high';
  user_friendly_summary: string;
}

type ChallengeState = 'input' | 'refining' | 'review';

export function QuickChallenge({
  claimText,
  articleId,
  articleTitle,
  existingChallenges,
  onClose,
  onSubmit,
}: QuickChallengeProps) {
  const [state, setState] = useState<ChallengeState>('input');
  const [userInput, setUserInput] = useState('');
  const [structured, setStructured] = useState<StructuredChallenge | null>(null);
  const [editingField, setEditingField] = useState<keyof StructuredChallenge | null>(null);
  const [error, setError] = useState('');

  const handleInputSubmit = async () => {
    if (!userInput.trim()) {
      setError('Please describe what you think is wrong with this claim');
      return;
    }

    setError('');
    setState('refining');

    // Build context of existing challenges
    const existingChallengeContext = existingChallenges
      .map(c => {
        const p = c.properties || {};
        return `- ${p.title}: ${p.rationale}`;
      })
      .join('\n');

    const prompt = `A user wants to challenge a claim. Help them create a well-structured, formal challenge.

CLAIM: "${claimText}"
USER'S INFORMAL INPUT: "${userInput}"

EXISTING CHALLENGES ON THIS CLAIM:
${existingChallengeContext || 'None'}

Tasks:
1. Check if this challenge is a duplicate of an existing one. If so, set is_duplicate: true and explain which existing challenge it matches.
2. Select the most appropriate challenge framework: legal, scientific, journalistic, logical, or intelligence
3. Write a clear, formal title for the challenge (10-15 words max)
4. Write a structured rationale (2-3 sentences explaining the specific issue)
5. Identify which evaluation criteria from the framework are most relevant
6. Suggest relevant tags for the claim being challenged
7. Assess severity: low/medium/high

Return JSON:
{
  "is_duplicate": false,
  "duplicate_of": null,
  "duplicate_reason": null,
  "framework": "journalistic",
  "title": "Formal challenge title",
  "rationale": "Structured rationale explaining the specific issue with this claim...",
  "relevant_criteria": ["criterion1", "criterion2"],
  "suggested_tags": ["tag1", "tag2"],
  "severity": "high",
  "user_friendly_summary": "Plain language summary of what this challenge means"
}`;

    try {
      const response = await chatWithAI([{ role: 'user', content: prompt }]);
      const content = response?.message?.content || response?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        setError('Failed to structure challenge. Please try again.');
        setState('input');
        return;
      }

      const result = JSON.parse(jsonMatch[0]) as StructuredChallenge;
      setStructured(result);
      setState('review');
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setState('input');
    }
  };

  const handleEdit = (field: keyof StructuredChallenge) => {
    setEditingField(field);
  };

  const handleSaveEdit = (field: keyof StructuredChallenge, value: any) => {
    if (structured) {
      setStructured({
        ...structured,
        [field]: value,
      });
    }
    setEditingField(null);
  };

  const handleSubmitChallenge = () => {
    if (structured) {
      onSubmit(structured);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-black border-2 border-crt-fg font-mono max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b-2 border-crt-fg p-4 flex justify-between items-center bg-black">
          <h2 className="text-xl font-bold text-crt-fg">CHALLENGE CLAIM</h2>
          <button
            onClick={onClose}
            className="text-crt-fg hover:text-crt-accent font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Claim text display */}
        <div className="p-4 bg-black border-b border-crt-border">
          <p className="text-xs text-crt-dim mb-2">CLAIM:</p>
          <p className="text-crt-fg italic border-l-2 border-crt-accent pl-3">
            "{claimText}"
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {state === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-crt-fg mb-2">
                  WHAT'S WRONG WITH THIS CLAIM?
                </label>
                <textarea
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  placeholder="Describe the issue in plain English... (e.g., 'this contradicts the source', 'there's no evidence for this', 'the dates don't match')"
                  className="w-full h-24 bg-black border border-crt-border text-crt-fg p-3 font-mono text-sm focus:border-crt-fg focus:outline-none"
                />
              </div>

              {error && (
                <div className="p-3 bg-black border border-crt-error text-crt-error text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-crt-border text-crt-fg hover:bg-crt-selection"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleInputSubmit}
                  className="px-4 py-2 bg-crt-fg text-black font-bold hover:bg-crt-accent"
                >
                  NEXT
                </button>
              </div>
            </div>
          )}

          {state === 'refining' && (
            <div className="text-center py-8">
              <div className="text-crt-fg font-bold mb-2">
                ▌ AI STRUCTURING YOUR CHALLENGE...
              </div>
              <p className="text-crt-dim text-sm">Processing framework, criteria, and severity...</p>
            </div>
          )}

          {state === 'review' && structured && (
            <div className="space-y-4">
              {/* Duplicate warning */}
              {structured.is_duplicate && (
                <div className="p-3 bg-black border-2 border-crt-warning bg-opacity-20">
                  <p className="text-crt-warning font-bold text-sm mb-1">⚠ DUPLICATE CHALLENGE</p>
                  <p className="text-sm text-crt-muted">
                    {structured.duplicate_reason}
                  </p>
                  {structured.duplicate_of && (
                    <a
                      href={`/challenge/${structured.duplicate_of}`}
                      className="text-xs text-crt-fg underline hover:text-crt-accent"
                    >
                      View existing challenge →
                    </a>
                  )}
                </div>
              )}

              {/* Framework badge */}
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-crt-selection text-black font-bold text-sm rounded-none">
                  {structured.framework.toUpperCase()}
                </div>
                <div className="px-3 py-1 bg-black border border-crt-border text-crt-fg text-xs font-bold">
                  SEVERITY: {structured.severity.toUpperCase()}
                </div>
              </div>

              {/* Editable fields */}
              <div className="space-y-3 border-t border-crt-border pt-4">
                {/* Title */}
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <label className="text-xs font-bold text-crt-dim">TITLE</label>
                    <button
                      onClick={() => handleEdit('title')}
                      className="text-xs text-crt-accent hover:text-crt-fg"
                    >
                      {editingField === 'title' ? 'DONE' : 'EDIT'}
                    </button>
                  </div>
                  {editingField === 'title' ? (
                    <input
                      autoFocus
                      type="text"
                      value={structured.title}
                      onChange={e => setStructured({ ...structured, title: e.target.value })}
                      onBlur={() => handleSaveEdit('title', structured.title)}
                      className="w-full bg-black border border-crt-fg text-crt-fg p-2 font-mono text-sm"
                    />
                  ) : (
                    <p className="text-crt-fg font-bold">{structured.title}</p>
                  )}
                </div>

                {/* Rationale */}
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <label className="text-xs font-bold text-crt-dim">RATIONALE</label>
                    <button
                      onClick={() => handleEdit('rationale')}
                      className="text-xs text-crt-accent hover:text-crt-fg"
                    >
                      {editingField === 'rationale' ? 'DONE' : 'EDIT'}
                    </button>
                  </div>
                  {editingField === 'rationale' ? (
                    <textarea
                      autoFocus
                      value={structured.rationale}
                      onChange={e => setStructured({ ...structured, rationale: e.target.value })}
                      onBlur={() => handleSaveEdit('rationale', structured.rationale)}
                      className="w-full h-16 bg-black border border-crt-fg text-crt-fg p-2 font-mono text-sm"
                    />
                  ) : (
                    <p className="text-crt-muted text-sm">{structured.rationale}</p>
                  )}
                </div>

                {/* Criteria */}
                <div>
                  <label className="text-xs font-bold text-crt-dim mb-2 block">
                    RELEVANT CRITERIA
                  </label>
                  <div className="space-y-1">
                    {structured.relevant_criteria.map((criterion, idx) => (
                      <div
                        key={idx}
                        className="text-sm text-crt-fg border-l-2 border-crt-accent pl-2"
                      >
                        • {criterion}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-xs font-bold text-crt-dim mb-2 block">
                    SUGGESTED TAGS
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {structured.suggested_tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-black border border-crt-border text-crt-fg text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* User-friendly summary */}
                <div className="p-3 bg-black border border-crt-border">
                  <p className="text-xs text-crt-dim mb-1">SUMMARY</p>
                  <p className="text-sm text-crt-fg italic">
                    {structured.user_friendly_summary}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 justify-end border-t border-crt-border pt-4">
                <button
                  onClick={() => {
                    setState('input');
                    setStructured(null);
                  }}
                  className="px-4 py-2 border border-crt-border text-crt-fg hover:bg-crt-selection"
                >
                  START OVER
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-crt-border text-crt-fg hover:bg-crt-selection"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSubmitChallenge}
                  disabled={structured.is_duplicate}
                  className="px-4 py-2 bg-crt-fg text-black font-bold hover:bg-crt-accent disabled:bg-crt-muted disabled:text-crt-dim"
                >
                  {structured.is_duplicate ? 'DUPLICATE - CANNOT SUBMIT' : 'SUBMIT CHALLENGE'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
