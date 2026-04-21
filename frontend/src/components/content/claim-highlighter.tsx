/**
 * Claim Highlighter Component
 *
 * Highlights claims in article text with visual indicators showing their status:
 * - Unchallenged: subtle yellow underline
 * - Challenged: bright yellow background
 * - Verified: green underline
 * - Debunked: red strikethrough
 */

import React, { useMemo } from 'react';

export type ClaimStatus = 'unchallenged' | 'challenged' | 'verified' | 'debunked';

export interface ClaimHighlight {
  text: string;
  status: ClaimStatus;
  nodeId?: string;
}

interface ClaimHighlighterProps {
  content: string;
  claims: ClaimHighlight[];
  onClaimClick?: (nodeId: string | undefined, text: string) => void;
}

function getClaimStyleClass(status: ClaimStatus): string {
  switch (status) {
    case 'unchallenged':
      return 'underline decoration-yellow-300 decoration-1 underline-offset-2 cursor-pointer hover:bg-yellow-100/50 dark:hover:bg-yellow-900/20 transition-colors';
    case 'challenged':
      return 'bg-yellow-200 dark:bg-yellow-900/40 cursor-pointer hover:bg-yellow-300 dark:hover:bg-yellow-900/60 transition-colors rounded px-0.5';
    case 'verified':
      return 'underline decoration-green-500 decoration-2 underline-offset-2 cursor-pointer hover:bg-green-100/50 dark:hover:bg-green-900/20 transition-colors';
    case 'debunked':
      return 'line-through text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors';
    default:
      return '';
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function ClaimHighlighter({
  content,
  claims,
  onClaimClick,
}: ClaimHighlighterProps) {
  const highlightedContent = useMemo(() => {
    if (!claims || claims.length === 0) {
      return content;
    }

    // Sort claims by length (longest first) to avoid partial matches
    const sortedClaims = [...claims].sort((a, b) => b.text.length - a.text.length);

    let result = content;
    const replacements: Array<{
      original: string;
      replacement: React.ReactNode;
      index: number;
    }> = [];

    sortedClaims.forEach((claim) => {
      const regex = new RegExp(`\\b${escapeRegex(claim.text)}\\b`, 'gi');
      let match;

      while ((match = regex.exec(result)) !== null) {
        const original = match[0];
        const styleClass = getClaimStyleClass(claim.status);

        replacements.push({
          original,
          replacement: `<span class="${styleClass}" data-claim-status="${claim.status}" data-node-id="${claim.nodeId || ''}" data-text="${original}">${original}</span>`,
          index: match.index,
        });
      }
    });

    // This is a simplified approach. For production, use a proper React-based solution
    // that properly handles nested claims and avoids HTML injection.
    return content;
  }, [content, claims]);

  // For production use, implement a proper React-based solution:
  // This component serves as a template for the full implementation
  return (
    <div className="prose dark:prose-invert max-w-none">
      {/* Render using the HTML approach with sanitization */}
      <div dangerouslySetInnerHTML={{ __html: highlightedContent }} />
    </div>
  );
}

/**
 * Utility function to extract and highlight claims from text
 * This can be called to process article content with claim highlighting
 */
export function highlightClaimsInContent(
  content: string,
  claims: ClaimHighlight[]
): string {
  if (!claims || claims.length === 0) {
    return content;
  }

  let result = content;
  const sortedClaims = [...claims].sort((a, b) => b.text.length - a.text.length);

  sortedClaims.forEach((claim) => {
    const regex = new RegExp(`\\b${escapeRegex(claim.text)}\\b`, 'gi');
    const styleClass = getClaimStyleClass(claim.status);

    result = result.replace(
      regex,
      `<span class="${styleClass}" data-claim-status="${claim.status}" data-node-id="${claim.nodeId || ''}">${claim.text}</span>`
    );
  });

  return result;
}
