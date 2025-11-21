#!/bin/bash

# Rabbit Hole Transformation - GitHub Issues Creation Script
# This script creates all issues for the transformation plan

echo "🚀 Creating Rabbit Hole Transformation Issues..."
echo ""

# Phase 1: Foundation (Weeks 1-2)
echo "📋 Creating Phase 1 Issues..."

gh issue create \
  --title "[P1] Remove 'Create Article' button from home page" \
  --body "## Description
Remove the 'Create Article' button from the home page to enforce deliberate article creation through a formal proposal process.

## Why
Articles should be created thoughtfully, not impulsively. Force users to justify new topics.

## Tasks
- [ ] Remove button from \`frontend/src/app/page.tsx\`
- [ ] Add 'Propose New Topic' link (leads to modal)
- [ ] Update navigation if needed
- [ ] Test that articles page still has create functionality

## Files
- \`frontend/src/app/page.tsx\`

## Acceptance Criteria
- Home page has no 'Create Article' button
- 'Propose New Topic' link visible
- Existing article creation still works

## Priority
Critical - Quick win, aligns with vision

## Estimate
1 hour"

gh issue create \
  --title "[P1] Redesign home page for discovery (not creation)" \
  --body "## Description
Transform home page from creation-focused to discovery-focused, showcasing high-credibility articles and enabling exploration.

## Features
- Featured Articles section (highest credibility scores)
- Recently Updated with credibility trend indicators
- Topic Categories (Science, History, Current Events)
- Search bar prominently placed
- 'Browse by Credibility' filter
- Remove creation CTAs, focus on consumption

## Design Mockup
\`\`\`
┌─────────────────────────────────────────┐
│  🔍 Search...                           │
├─────────────────────────────────────────┤
│  Featured Articles (Highest Credibility)│
│  ┌──────┐ ┌──────┐ ┌──────┐           │
│  │ 0.95 │ │ 0.92 │ │ 0.90 │           │
│  └──────┘ └──────┘ └──────┘           │
│                                         │
│  Browse by Category:                    │
│  [Science] [History] [Current Events]   │
│                                         │
│  Recently Updated:                      │
│  • Article 1 (0.88) ↑ +0.05            │
│  • Article 2 (0.75) → No change        │
└─────────────────────────────────────────┘
\`\`\`

## Tasks
- [ ] Query articles sorted by \`veracity_score DESC\`
- [ ] Create Featured Articles component
- [ ] Add credibility badges (Gold >0.9, Silver >0.7, Bronze >0.5)
- [ ] Topic filter dropdown
- [ ] Recently Updated section with trend indicators
- [ ] Implement search integration

## Files
- \`frontend/src/app/page.tsx\`
- \`frontend/src/components/featured-articles.tsx\` (new)
- \`frontend/src/components/credibility-badge.tsx\` (new)
- \`frontend/src/components/topic-filter.tsx\` (new)

## Dependencies
- Requires CredibilityBadge component (#TBD)

## Acceptance Criteria
- Home page shows articles sorted by credibility
- Users can filter by topic/category
- Search is prominent
- No creation buttons visible
- Mobile responsive

## Priority
High

## Estimate
2 days"

gh issue create \
  --title "[P1] Build comprehensive node detail page" \
  --body "## Description
Create a full-featured node detail page that shows content, references, evidence, challenges, and editing in one place.

## Layout
\`\`\`
┌─────────────────────────────────────────────────┐
│ Node Title                    [Credibility: 0.85]│
│ Type: Article | Created: ... | Updated: ...     │
├─────────────────────────────────────────────────┤
│                                                  │
│  [Content/Narrative] (markdown)                  │
│                                                  │
│  Referenced Nodes:                               │
│  → [Person] John Doe (credibility: 0.92)        │
│  → [Event] Battle of XYZ (credibility: 0.88)    │
│                                                  │
├─────────────────────────────────────────────────┤
│ Tabs:                                            │
│ [Content] [References] [Evidence] [Challenges]  │
│ [History] [Discussions] [Edit]                  │
└─────────────────────────────────────────────────┘
\`\`\`

## Features
- Display veracity score with visual indicator
- Show evidence chain (supporting vs refuting)
- List active challenges with status
- Reference links are clickable (traverse graph)
- Type-specific rendering (Article vs Person vs Event)
- Permission-gated Edit tab
- Version history
- Comment threads

## Tasks
- [ ] Create NodeDetailPage component
- [ ] Implement tab navigation
- [ ] Build Content tab (markdown renderer)
- [ ] Build References tab (clickable links)
- [ ] Build Evidence tab (see #TBD)
- [ ] Build Challenges tab (list with filters)
- [ ] Build History tab (version diffs)
- [ ] Build Discussions tab (comment threads)
- [ ] Build Edit tab (move editor here)
- [ ] Wire up GraphQL queries
- [ ] Add real-time subscriptions

## GraphQL
\`\`\`graphql
query GetNodeDetail(\$nodeId: ID!) {
  node(id: \$nodeId) {
    id
    title
    nodeType
    narrative
    veracityScore {
      score
      evidenceCount
      challengeCount
    }
    references {
      id
      title
      nodeType
      veracityScore { score }
    }
    evidence {
      id
      type
      weight
      source { title credibility }
    }
    challenges {
      id
      type
      severity
      status
    }
  }
}
\`\`\`

## Files
- \`frontend/src/app/nodes/[id]/page.tsx\`
- \`frontend/src/components/node-tabs.tsx\` (new)
- \`frontend/src/components/evidence-tab.tsx\` (new)
- \`frontend/src/components/challenges-tab.tsx\` (new)

## Dependencies
- CredibilityBadge component (#TBD)
- EvidenceExplorer component (#TBD)

## Acceptance Criteria
- All tabs functional
- References are clickable
- Credibility score visible
- Real-time updates work
- Mobile responsive
- Permission-based editing

## Priority
Critical

## Estimate
3 days"

gh issue create \
  --title "[P1] Create CredibilityBadge component" \
  --body "## Description
Reusable component to display credibility scores with visual indicators (gold/silver/bronze) and explanatory tooltips.

## Design
\`\`\`tsx
<CredibilityBadge score={0.85}>
  <Icon tier=\"gold\" />  // Gold: >0.9, Silver: >0.7, Bronze: >0.5
  <Score>85%</Score>
  <Tooltip>
    Based on 12 supporting evidences from 8 highly credible sources.
    2 refuting evidences from lower credibility sources.
    0 active challenges.
  </Tooltip>
</CredibilityBadge>
\`\`\`

## Features
- Color-coded badges:
  - Gold (🏆): >0.9
  - Silver (🥈): 0.7-0.9
  - Bronze (🥉): 0.5-0.7
  - Yellow (⚠️): 0.3-0.5
  - Red (❌): <0.3
- Hover tooltip with details
- Click to expand full evidence view
- Compact and large variants
- Accessible (ARIA labels)

## Props
\`\`\`typescript
interface CredibilityBadgeProps {
  score: number;  // 0.0-1.0
  evidenceCount?: number;
  challengeCount?: number;
  variant?: 'compact' | 'full';
  onClick?: () => void;
}
\`\`\`

## Tasks
- [ ] Create component file
- [ ] Implement tier calculation
- [ ] Add tooltip with evidence breakdown
- [ ] Style badges (gold/silver/bronze)
- [ ] Add accessibility (ARIA, keyboard nav)
- [ ] Write Storybook stories
- [ ] Unit tests

## Files
- \`frontend/src/components/credibility-badge.tsx\` (new)
- \`frontend/src/components/__tests__/credibility-badge.test.tsx\` (new)

## Acceptance Criteria
- Displays correct tier for score
- Tooltip shows evidence breakdown
- Accessible (screen readers, keyboard)
- Works on all screen sizes
- Storybook documentation

## Priority
High - Blocks many other features

## Estimate
4 hours"

gh issue create \
  --title "[P1] Build EvidenceExplorer component" \
  --body "## Description
Interactive component to explore evidence chains: supporting, refuting, and neutral evidence with sources and credibility scores.

## Design
\`\`\`
Evidence Explorer
├─ Supporting Evidence (12)
│  ├─ Academic Paper XYZ (0.95) ✓ Primary Source
│  ├─ Government Report ABC (0.90) ✓ Primary Source
│  └─ ...
├─ Refuting Evidence (2)
│  ├─ Blog Post (0.35) ⚠️ Low Credibility
│  └─ ...
└─ Summary
   ├─ Net Credibility: 0.85
   ├─ Source Agreement: 92%
   └─ Temporal Decay: -0.02 (5 years old)
\`\`\`

## Features
- Collapsible evidence groups (supporting/refuting/neutral)
- Click evidence to view full details
- Source credibility indicators
- Weight visualization (bar charts)
- Filter by evidence type
- Sort by date, weight, credibility
- Link to source documents

## GraphQL
\`\`\`graphql
query GetNodeEvidence(\$nodeId: ID!) {
  node(id: \$nodeId) {
    evidence {
      id
      type  # supporting, refuting, neutral
      weight
      confidence
      content
      source {
        id
        title
        type
        credibility
        publicationDate
        url
      }
      verificationStatus
      reviewStatus
    }
    veracityScore {
      score
      evidenceWeightSum
      supportingEvidenceWeight
      refutingEvidenceWeight
      sourceAgreementRatio
      temporalDecayFactor
    }
  }
}
\`\`\`

## Tasks
- [ ] Create component
- [ ] Implement evidence grouping
- [ ] Add weight visualizations
- [ ] Build source credibility display
- [ ] Add filtering and sorting
- [ ] Wire up GraphQL query
- [ ] Add pagination (if many evidence items)
- [ ] Unit tests

## Files
- \`frontend/src/components/evidence-explorer.tsx\` (new)
- \`frontend/src/components/evidence-card.tsx\` (new)

## Acceptance Criteria
- Groups evidence by type
- Shows source credibility
- Displays weight and confidence
- Expandable/collapsible
- Mobile responsive
- Handles large evidence lists

## Priority
High

## Estimate
1 day"

gh issue create \
  --title "[P1] Create reference node creation wizard" \
  --body "## Description
Step-by-step wizard to create typed reference nodes (Person, Event, Place, Thing, Source) with structured data and source verification.

## Flow
1. Select node type (Person/Event/Place/Thing/Source)
2. Fill type-specific form
3. Add primary sources for verification
4. AI suggests credibility score
5. Review and create

## Node Type Forms

### Person Form
\`\`\`typescript
{
  fullName: string;
  birthDate?: Date;
  deathDate?: Date;
  nationality?: string;
  occupation?: string;
  bio: string;
  primarySources: Source[];
}
\`\`\`

### Event Form
\`\`\`typescript
{
  name: string;
  startDate: Date;
  endDate?: Date;
  location: Place;  // Reference to Place node
  description: string;
  participants: Person[];  // References
  primarySources: Source[];
}
\`\`\`

### Place Form
\`\`\`typescript
{
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  description: string;
  primarySources: Source[];
}
\`\`\`

### Source Form
\`\`\`typescript
{
  type: 'academic_paper' | 'news_article' | 'government_report' | ...;
  title: string;
  authors: Person[];
  publicationDate: Date;
  publisher: string;
  doi?: string;
  isbn?: string;
  url?: string;
  content: string;
}
\`\`\`

## Features
- Multi-step wizard UI
- Type-specific form validation
- Date pickers, location pickers
- Node reference selector (autocomplete)
- File upload for source documents
- AI credibility preview
- Draft save functionality

## Tasks
- [ ] Create wizard component
- [ ] Build type selector step
- [ ] Implement PersonForm
- [ ] Implement EventForm
- [ ] Implement PlaceForm
- [ ] Implement SourceForm
- [ ] Add node reference autocomplete
- [ ] Wire up file uploads
- [ ] Add AI credibility preview
- [ ] GraphQL mutations for each type
- [ ] Form validation
- [ ] Unit tests

## GraphQL
\`\`\`graphql
mutation CreateReferenceNode(\$input: CreateReferenceInput!) {
  createReferenceNode(input: \$input) {
    id
    title
    nodeType
    props  # Type-specific data
    veracityScore { score }
  }
}
\`\`\`

## Files
- \`frontend/src/components/reference-wizard/index.tsx\` (new)
- \`frontend/src/components/reference-wizard/person-form.tsx\` (new)
- \`frontend/src/components/reference-wizard/event-form.tsx\` (new)
- \`frontend/src/components/reference-wizard/place-form.tsx\` (new)
- \`frontend/src/components/reference-wizard/source-form.tsx\` (new)

## Acceptance Criteria
- All node types supported
- Validation prevents invalid data
- Primary sources required
- AI suggests initial credibility
- Works on mobile
- Can save draft and resume

## Priority
Critical

## Estimate
3 days"

echo ""
echo "✅ Phase 1 Issues Created!"
echo ""

# Phase 2: User Workflows (Weeks 3-4)
echo "📋 Creating Phase 2 Issues..."

gh issue create \
  --title "[P2] Implement formal topic proposal process" \
  --body "## Description
Replace instant article creation with a formal proposal process that requires justification and AI evaluation.

## Flow
1. User clicks 'Propose New Topic'
2. Form appears:
   - Topic title
   - Why does this deserve an article?
   - What makes this different from existing topics?
   - Initial references planned
3. AI analyzes:
   - Duplication check (semantic search)
   - Reference quality assessment
   - Scope appropriateness
4. Approval/rejection with feedback
5. If approved: article created in draft mode

## AI Evaluation Criteria
- Not a duplicate (semantic similarity <0.8 to existing articles)
- References are credible (avg credibility >0.6)
- Scope is appropriate (not too broad/narrow)
- Topic is verifiable (has primary sources)

## Tasks
- [ ] Create TopicProposalForm component
- [ ] Build AI evaluation service integration
- [ ] Implement duplicate detection
- [ ] Add reference quality check
- [ ] Create approval/rejection UI
- [ ] Wire up GraphQL mutations
- [ ] Add notifications for proposal status
- [ ] Unit tests

## Files
- \`frontend/src/components/topic-proposal-form.tsx\` (new)
- \`backend/src/services/TopicProposalService.ts\` (new)
- \`backend/src/resolvers/TopicProposalResolver.ts\` (new)

## Acceptance Criteria
- Form validates all fields
- AI provides feedback
- Duplicates are detected
- Users notified of decision
- Approved topics become draft articles

## Priority
Medium

## Estimate
2 days"

gh issue create \
  --title "[P2] Build challenge submission form and dashboard" \
  --body "## Description
Enable users to formally challenge node credibility with a structured form, and view all challenges in a dashboard.

## Challenge Form
- Issue type dropdown (factual error, bias, outdated, etc.)
- Severity selector (critical/high/medium/low)
- Detailed explanation (rich text)
- Evidence upload (documents, images)
- Source link input (URLs)
- Related node selector
- AI preliminary assessment

## Dashboard
\`\`\`
Active Inquiries              [Filter ▼]
├─ 🔴 CRITICAL: JFK Assassination Date
│  ├─ Challenger: @user123
│  ├─ Type: Factual Error
│  ├─ Evidence: 15 supporting, 2 refuting
│  ├─ AI Confidence: 0.45 (Low)
│  ├─ Status: Evaluating
│  └─ [View] [Submit Evidence]
└─ ...
\`\`\`

## Features
- Challenge submission form
- Dashboard with filters (status, severity, type)
- Real-time updates via WebSocket
- Color-coded by severity
- Click to view full details
- Evidence submission for existing challenges
- Voting interface (separate from confidence)

## Tasks
- [ ] Create ChallengeForm component
- [ ] Build challenge dashboard page
- [ ] Add filtering and sorting
- [ ] Implement evidence upload
- [ ] Wire up AI evaluation
- [ ] Add real-time subscriptions
- [ ] Create challenge detail view
- [ ] Add voting UI
- [ ] Unit tests

## Files
- \`frontend/src/components/challenge-form.tsx\` (enhance existing)
- \`frontend/src/app/inquiries/page.tsx\` (new)
- \`frontend/src/components/inquiry-card.tsx\` (new)

## GraphQL
\`\`\`graphql
mutation SubmitChallenge(\$input: ChallengeInput!) {
  submitChallenge(input: \$input) {
    id
    status
    aiEvaluation {
      confidence
      estimatedImpact
      summary
    }
  }
}
\`\`\`

## Acceptance Criteria
- Form validates all fields
- AI provides preliminary assessment
- Dashboard shows all challenges
- Filters work correctly
- Real-time updates
- Mobile responsive

## Priority
High

## Estimate
3 days"

echo ""
echo "✅ Phase 2 Issues Created!"
echo ""

# Implementation tasks
echo "📋 Creating Immediate Implementation Issues..."

gh issue create \
  --title "[IMPLEMENT] Day 1: Remove Article button and restructure" \
  --body "## Tasks
- [ ] Remove 'Create Article' button from home page
- [ ] Add 'Propose New Topic' link with modal placeholder
- [ ] Move article editor to node detail page
- [ ] Update navigation
- [ ] Test changes
- [ ] Rebuild frontend Docker container

## Files
- \`frontend/src/app/page.tsx\`
- \`frontend/src/app/nodes/[id]/page.tsx\`

## Acceptance Criteria
- Home page has no create button
- Editor accessible from node detail page
- Navigation updated
- App still functional

## Estimate
3-4 hours"

gh issue create \
  --title "[IMPLEMENT] Day 2: Credibility visibility across UI" \
  --body "## Tasks
- [ ] Create CredibilityBadge component
- [ ] Add to node cards in lists
- [ ] Add to node detail page header
- [ ] Update GraphQL queries to include veracity scores
- [ ] Test on all pages
- [ ] Document component in Storybook

## Files
- \`frontend/src/components/credibility-badge.tsx\`
- Various page components

## Acceptance Criteria
- Badge visible on all nodes
- Shows correct tier (gold/silver/bronze)
- Tooltip works
- Accessible

## Estimate
6-8 hours"

gh issue create \
  --title "[IMPLEMENT] Day 3: Reference wizard prototype" \
  --body "## Tasks
- [ ] Create ReferenceWizard component
- [ ] Implement type selector (Person/Event/Place/Thing)
- [ ] Build PersonForm as first example
- [ ] Add form validation
- [ ] Wire up to backend node creation
- [ ] Test end-to-end
- [ ] Document usage

## Files
- \`frontend/src/components/reference-wizard/\`

## Acceptance Criteria
- Can create Person nodes with structured data
- Form validates required fields
- Successfully saves to database
- Returns to graph view after creation

## Estimate
6-8 hours"

echo ""
echo "✅ All Issues Created!"
echo ""
echo "📊 Summary:"
echo "  - Phase 1 Foundation: 6 issues"
echo "  - Phase 2 Workflows: 2 issues"
echo "  - Immediate Implementation: 3 issues"
echo ""
echo "🔗 View all issues: gh issue list"
echo ""
