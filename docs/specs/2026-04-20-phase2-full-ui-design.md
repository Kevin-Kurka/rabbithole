# Rabbithole Phase 2: Full UI Implementation

**Date:** 2026-04-20
**Status:** Approved
**Scope:** Article writer, article reader with claim highlighting, challenge arena with evidence/voting/AI, theory builder with graph visualization

---

## 1. Overview

Build out all Rabbithole pages from shells to fully functional UI. Users can write articles, highlight claims, challenge them with evidence, vote on challenges, and build theories connecting pieces together. The AI analyzes evidence and provides objective scoring.

---

## 2. New Dependencies

| Package | Purpose |
|---------|---------|
| `react-force-graph-2d` | Interactive graph visualization for theory builder + explore |
| `@uiw/react-md-editor` | Already in package.json — markdown editor with preview |
| `react-markdown` | Already in package.json — markdown rendering |
| `react-syntax-highlighter` | Code blocks in markdown |
| `remark-gfm` | GitHub-flavored markdown tables/checkboxes |

---

## 3. Article Writer (`/write`)

### Layout
- Split pane: left = markdown editor, right = live preview
- Toolbar above editor: Bold, Italic, Link, Source Citation, Publish, Save Draft

### Claim Marking
- In the preview pane, author selects text → floating button "Mark as Claim" appears
- Clicking it wraps the text in a `==claim==` marker syntax in the editor (custom extension)
- Preview renders claims with yellow highlight

### Source Citations
- "Add Source" button opens a modal: URL, title, publication, author, date, source type
- Inserts `[^N]` footnote syntax in the editor
- Sources panel at bottom shows all cited sources with edit/delete

### Publish Flow
1. Validates: title required, body non-empty
2. Creates ARTICLE node (status=published, published_at=now)
3. Creates AUTHORED edge (current user → article)
4. For each `==claim==` marker: creates CLAIM node + CONTAINS_CLAIM edge
5. For each source: creates SOURCE node + CITES edge
6. Redirects to `/article/:id`

---

## 4. Article Reader (`/article/:id`)

### Layout
- Full-width article body rendered as markdown
- Right sidebar (collapsible on mobile): claims list, sources, related theories

### Claim Highlighting
- Pre-marked claims (from author): rendered as `<mark>` spans with yellow background, clickable
- Reader selection: user selects any text → floating toolbar with:
  - "Mark as Claim" — creates a new CLAIM node + CONTAINS_CLAIM edge
  - "Challenge This" — if text matches an existing claim, goes directly to challenge creation; otherwise creates claim first then opens challenge

### Claim Sidebar
- Lists all claims in the article
- Each shows: claim text (truncated), status badge (colored by status), challenge count
- Click a claim → scrolls to it in the article + shows detail popover (challenger info, scores, evidence count, link to challenge arena)

### Source Footnotes
- Footnote markers `[^N]` render as superscript links
- Clicking scrolls to the sources section at the bottom
- Each source shows: title, publication, date, type badge, external link

---

## 5. Challenge Arena (`/challenge/:id`)

### Layout
```
┌─────────────────────────────────────────────────────┐
│ CHALLENGE HEADER                                     │
│ Claim: "The statement being challenged..."           │
│ From: Article Title (link)                           │
│ Challenged by: @username | Status: Open              │
│ [VOTE FOR] 12 ─────────── 7 [VOTE AGAINST]         │
├────────────────────────┬────────────────────────────┤
│ SUPPORTING EVIDENCE    │ REFUTING EVIDENCE          │
│                        │                            │
│ [Evidence Card]        │ [Evidence Card]            │
│ [Evidence Card]        │ [Evidence Card]            │
│                        │                            │
│ [+ Submit Evidence]    │ [+ Submit Evidence]        │
├────────────────────────┴────────────────────────────┤
│ AI ANALYSIS                                          │
│ Score: 73/100 | Verdict: Likely Verified             │
│ Reasoning: "Based on 5 pieces of evidence..."        │
└─────────────────────────────────────────────────────┘
```

### Vote Widget
- Two buttons: "Support Challenge" / "Dismiss Challenge"
- One vote per user (stored as VOTE node + VOTED_ON + CAST_BY edges)
- Shows current tally (for - against = community_score)
- After voting, buttons become disabled with "You voted [for/against]"

### Evidence Cards
- Title, source type badge (colored), side indicator (green=for, red=against)
- Body text (expandable)
- Source link (if provided)
- AI scores: relevance (0-100), credibility (0-100) shown as small progress bars
- "Challenge This Evidence" button → creates new nested challenge
- Status badge if the evidence itself has been challenged

### Submit Evidence Form
- Appears when clicking "+ Submit Evidence" in either column
- Fields: title, body (textarea), source URL (optional), source type (dropdown)
- Side is pre-set based on which column's button was clicked
- Submitting creates: EVIDENCE node + SUPPORTS/REFUTES edge + SUBMITTED_BY edge

### AI Analysis Panel
- Auto-triggered when challenge has 3+ pieces of evidence
- Calls `POST /api/chat` with a structured prompt asking the AI to analyze the evidence
- Stores results in the CHALLENGE node: ai_score, ai_analysis
- Displayed as a card at the bottom with score, verdict recommendation, and reasoning

### Verdict Resolution
- Resolves when: 10+ votes cast AND 7 days since last activity, OR manually by challenger
- Verdict logic: if community_score > 0 AND ai_score > 60 → "verified"; if both negative → "debunked"; if mixed → "contested"
- Updates CLAIM/EVIDENCE status based on verdict
- Shows verdict banner at top of page when resolved

---

## 6. Theory Builder (`/theory/new` and `/theory/:id`)

### Layout
- Left panel (50%): markdown narrative editor
- Right panel (50%): interactive graph visualization

### Graph Visualization
- Uses react-force-graph-2d
- Nodes are colored by type: Article=blue, Claim=yellow, Evidence=green, Source=gray
- Edges show relationship type as labels
- Nodes are draggable for arrangement
- Click a node → shows details in a tooltip

### Adding Nodes
- Search bar above the graph: type to search nodes by text
- Results appear as a list; click "Add to Theory" to include in the graph
- Creates a CONNECTS edge with auto-incremented sequence number
- Each connection can have an annotation (editable on the edge)

### Publish Flow
1. Creates THEORY node (title, summary, body, status=published)
2. Creates AUTHORED edge (user → theory)
3. Creates CONNECTS edges for all nodes in the graph (with sequence + annotation)
4. Redirects to `/theory/:id`

---

## 7. Shared Components

### `src/components/claim-highlighter.tsx`
- Renders article body with claims as highlighted `<mark>` spans
- Handles text selection and shows floating toolbar
- Props: `body: string`, `claims: Claim[]`, `onMarkClaim: (text, start, end) => void`, `onChallenge: (claimId) => void`

### `src/components/evidence-card.tsx`
- Displays a single evidence item with all metadata
- Props: `evidence: Evidence`, `onChallenge: (id) => void`

### `src/components/vote-widget.tsx`
- For/Against buttons with tally
- Props: `challengeId: string`, `communityScore: number`, `userVote: 'for'|'against'|null`, `onVote: (side) => void`

### `src/components/source-citation.tsx`
- Inline footnote marker + source detail card
- Props: `source: Source`, `index: number`

### `src/components/markdown-renderer.tsx`
- Renders markdown with claim highlighting and source footnotes integrated
- Props: `content: string`, `claims?: Claim[]`, `sources?: Source[]`

### `src/components/markdown-editor.tsx`
- Split-pane editor with live preview
- Props: `value: string`, `onChange: (value) => void`

### `src/components/graph-visualizer.tsx`
- react-force-graph-2d wrapper with typed nodes/edges
- Props: `nodes: GraphNode[]`, `edges: GraphEdge[]`, `onNodeClick: (node) => void`

### `src/components/search-panel.tsx`
- Search input that queries Sentient semantic search
- Props: `onSelect: (node) => void`, `placeholder?: string`

### `src/components/status-badge.tsx`
- Colored pill badge for statuses
- Props: `status: string`, `type: 'claim'|'challenge'|'evidence'`

---

## 8. API Additions

Add to `src/lib/api.ts`:

```typescript
// Get claims for an article
async function getArticleClaims(articleId: string): Promise<Claim[]>
// Uses: traverse from article, filter edges of type CONTAINS_CLAIM

// Get challenge with full context (evidence, votes)
async function getChallengeContext(challengeId: string): Promise<ChallengeContext>
// Uses: traverse from challenge, gather evidence, votes, target claim

// Submit vote
async function submitVote(challengeId: string, userId: string, side: 'for'|'against'): Promise<void>
// Creates: VOTE node + VOTED_ON + CAST_BY edges

// Trigger AI analysis
async function requestAIAnalysis(challengeId: string): Promise<{ai_score: number, ai_analysis: string}>
// Calls: POST /api/chat with structured evidence summary prompt

// Get user's vote on a challenge
async function getUserVote(challengeId: string, userId: string): Promise<'for'|'against'|null>
```

---

## 9. File Map (New/Modified)

### New Files
```
src/components/
├── claim-highlighter.tsx
├── evidence-card.tsx
├── vote-widget.tsx
├── source-citation.tsx
├── markdown-renderer.tsx
├── markdown-editor.tsx
├── graph-visualizer.tsx
├── search-panel.tsx
└── status-badge.tsx
```

### Modified Files
```
src/pages/write.tsx         — Full article editor
src/pages/article.tsx       — Full reader with claims
src/pages/challenge.tsx     — Full challenge arena
src/pages/theory.tsx        — Full theory builder
src/pages/explore.tsx       — Enhanced with graph view
src/lib/api.ts              — Additional helper functions
package.json                — New dependencies
```
