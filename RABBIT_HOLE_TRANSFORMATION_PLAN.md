# Rabbit Hole Transformation Plan
**Making the Corpus of Truth Vision a Reality**

---

## Executive Summary

Rabbit Hole is ~65-70% complete toward its vision as a **corpus of truth** - a dynamic, verifiable knowledge graph superior to Wikipedia. The backend infrastructure (85% complete) is sophisticated with credibility scoring, formal inquiries, and AI-powered fact-checking. The frontend (45% complete) needs development to expose these powerful features to users.

**This plan prioritizes the most impactful changes to make the application immediately useful while staying true to the vision.**

---

## Core Vision Principles

1. **Article Nodes are Primary Citizens** - Encyclopedia-like topics with references
2. **Reference Nodes Provide Credibility** - People, Events, Places, Things verified by primary sources
3. **Everything is Traversable** - Click any reference to "go down the rabbit hole"
4. **Credibility is Algorithmic** - Function of reference node quality, not popularity
5. **Truth is Not Democratic** - Formal inquiries use AI + evidence, not votes
6. **Users Curate and Challenge** - Collaborative editing with formal dispute resolution

---

## Immediate Actions (Remove/Move)

### 1. Remove Article Button from Home Page ✓
**Rationale**: Articles should be created through deliberate workflow, not impulsive button clicks. Force users to think through the topic structure.

**Implementation**:
```typescript
// frontend/src/app/page.tsx
// Remove: <Button>Create Article</Button>
// Keep: Search, Graph View, and Discovery features
```

### 2. Move Article Edit to Node Detail Pages ✓
**Rationale**: Editing should happen in context, viewing the node's connections and credibility.

**Implementation**:
- Move markdown editor to `/nodes/[id]` page
- Add "Edit" button (permission-gated)
- Show connected nodes while editing
- Display credibility score prominently
- Inline reference picker

---

## Phase 1: Foundation (Weeks 1-2)
**Goal**: Make the existing powerful backend visible and usable

### 1.1 Enhanced Home Page - Discovery Over Creation
**User Story**: Users arrive and immediately see high-quality, credible articles they can explore.

**Features**:
- **Featured Articles** section (highest credibility scores)
- **Recently Updated** articles with credibility trend indicators
- **Topic Categories** (Science, History, Current Events, etc.)
- **Search Bar** prominently placed
- **"Browse by Credibility"** filter
- Remove "Create Article" button
- Add "Propose New Topic" link (leads to formal submission process)

**Technical**:
```typescript
// frontend/src/app/page.tsx
- Query articles sorted by veracity_score DESC
- Display credibility badges (Gold: >0.9, Silver: >0.7, Bronze: >0.5)
- Add topic filter dropdown (query NodeTypes for categories)
- Implement search integration
```

### 1.2 Comprehensive Node Detail Page
**User Story**: Clicking any node shows everything - content, references, credibility, challenges, edit options.

**Layout**:
```
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
│  → [Source] Academic Paper (credibility: 0.95)  │
│                                                  │
├─────────────────────────────────────────────────┤
│ Tabs:                                            │
│ [Content] [References] [Evidence] [Challenges]  │
│ [History] [Discussions] [Edit]                  │
└─────────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// frontend/src/app/nodes/[id]/page.tsx

interface NodeDetailPage {
  tabs: {
    content: MarkdownViewer | SchemaRenderer,
    references: ReferenceList,  // Click to traverse
    evidence: EvidenceExplorer,  // Supporting/refuting
    challenges: ChallengeList,   // Active inquiries
    history: VersionHistory,     // Track changes
    discussions: CommentThread,  // Q&A
    edit: NodeEditor            // Permission-gated
  }
}

// Key features:
- Display veracity score with visual indicator
- Show evidence chain (supporting vs refuting)
- List active challenges with status
- Reference links are clickable (traverse graph)
- Type-specific rendering (Article vs Person vs Event)
```

### 1.3 Reference Node Creation Wizard
**User Story**: Create a Person/Event/Place/Thing with structured data and source verification.

**Flow**:
1. User clicks "Add Reference" in article editor
2. Wizard asks: "What type of reference?"
   - Person
   - Event
   - Place
   - Thing
   - Source Document
   - Other Article
3. Type-specific form appears
4. User fills structured fields + provides primary sources
5. AI suggests credibility score based on source quality
6. Reference created and linked

**Implementation**:
```typescript
// frontend/src/components/reference-wizard.tsx

interface ReferenceWizard {
  steps: [
    SelectType,
    FillSchema,    // Dynamic based on type
    AddSources,    // Primary source verification
    ReviewCreate   // Show AI credibility suggestion
  ]
}

// Type-specific forms:
PersonForm: {
  fullName: string;
  birthDate?: Date;
  deathDate?: Date;
  nationality?: string;
  occupation?: string;
  bio: string;
  primarySources: Source[];  // Birth certificates, bios, etc.
}

EventForm: {
  name: string;
  startDate: Date;
  endDate?: Date;
  location: Place;  // Reference to Place node
  description: string;
  participants: Person[];  // References to Person nodes
  primarySources: Source[];
}

PlaceForm: {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  description: string;
  primarySources: Source[];
}

SourceForm: {
  type: 'academic_paper' | 'news_article' | 'government_report' | ...;
  title: string;
  authors: Person[];
  publicationDate: Date;
  publisher: string;
  doi?: string;
  isbn?: string;
  url?: string;
  content: string;
  credibilityScore: number;  // AI-calculated
}
```

### 1.4 Credibility Visualization
**User Story**: Users instantly understand why a node has its credibility score.

**Components**:

**A. Credibility Badge**
```typescript
// frontend/src/components/credibility-badge.tsx
<CredibilityBadge score={0.85}>
  <Icon tier="gold" />  // Gold: >0.9, Silver: >0.7, Bronze: >0.5
  <Score>85%</Score>
  <Tooltip>
    Based on 12 supporting evidences from 8 highly credible sources.
    2 refuting evidences from lower credibility sources.
    0 active challenges.
  </Tooltip>
</CredibilityBadge>
```

**B. Evidence Explorer**
```typescript
// frontend/src/components/evidence-explorer.tsx
<EvidenceExplorer nodeId="...">
  <Section type="supporting">
    <Evidence source="Academic Paper XYZ" weight={0.9} />
    <Evidence source="Government Report ABC" weight={0.85} />
  </Section>

  <Section type="refuting">
    <Evidence source="Blog Post" weight={0.3} />
  </Section>

  <Summary>
    Net credibility: 0.85
    Source agreement: 92%
    Temporal decay: -0.02 (information is 5 years old)
  </Summary>
</EvidenceExplorer>
```

**C. Reference Chain Visualization**
```typescript
// frontend/src/components/reference-chain.tsx
<ReferenceChain nodeId="...">
  Article: "Climate Change Effects" (0.85)
    → Event: "2020 Wildfires" (0.92)
      → Source: "NOAA Report 2020" (0.95) ✓ Primary
    → Person: "Dr. Jane Smith" (0.88)
      → Source: "University Profile" (0.90) ✓ Primary
    → Claim: "Temperature increase 1.5°C" (0.78) ⚠ Challenged
      → Challenge: "Data methodology questioned"
</ReferenceChain>
```

---

## Phase 2: User Workflows (Weeks 3-4)
**Goal**: Enable users to create, edit, challenge, and verify content

### 2.1 Formal Topic Proposal Process
**User Story**: User wants to create a new article but must justify its importance.

**Flow**:
1. User clicks "Propose New Topic"
2. Form appears:
   - Topic title
   - Why does this deserve an article?
   - What makes this different from existing topics?
   - Initial references you plan to use
3. AI analyzes for:
   - Duplication (similar articles exist?)
   - Verifiability (are references credible?)
   - Scope (too broad/narrow?)
4. If approved: Article created in draft mode
5. If rejected: Suggestions for improvement or existing articles to expand

**Implementation**:
```typescript
// frontend/src/components/topic-proposal-form.tsx
interface TopicProposal {
  title: string;
  justification: string;
  scope: string;
  plannedReferences: string[];  // URLs or node IDs
  category: NodeType;
}

// Backend: AI evaluation
async function evaluateProposal(proposal: TopicProposal) {
  // Check for duplicates using semantic search
  const similar = await searchService.semanticSearch(proposal.title);

  // Analyze reference quality
  const refQuality = await factCheckingService.assessReferences(
    proposal.plannedReferences
  );

  // Scope analysis
  const scopeAnalysis = await aiAssistant.analyzeScopeAppropriate(
    proposal.justification
  );

  return {
    approved: boolean,
    score: number,
    reasons: string[],
    suggestions: string[]
  };
}
```

### 2.2 Collaborative Node Editing with Review
**User Story**: Multiple users can suggest edits; changes require review before publication.

**Workflow**:
```
Draft Mode → Suggested Edits → Peer Review → Published
```

**Features**:
- Track changes view (diff between versions)
- Inline comments on specific paragraphs
- Approval workflow (requires X reviewers with credibility >0.8)
- Automatic credibility recalculation on publish
- Notification to watchers when node updated

**Implementation**:
```typescript
// backend/src/resolvers/NodeEditResolver.ts
mutation proposeEdit(nodeId: ID!, changes: EditProposal!) {
  // Create edit proposal
  const proposal = await EditProposal.create({
    nodeId,
    proposedBy: userId,
    changes: {
      title: changes.title,
      narrative: changes.narrative,
      addedReferences: changes.addedRefs,
      removedReferences: changes.removedRefs
    },
    status: 'pending_review'
  });

  // Notify reviewers (high-credibility users)
  await notificationService.notifyReviewers(proposal);

  return proposal;
}

mutation reviewEdit(proposalId: ID!, decision: 'approve' | 'reject', feedback?: string) {
  const proposal = await EditProposal.findById(proposalId);

  // Record review
  await EditReview.create({
    proposalId,
    reviewerId: userId,
    decision,
    feedback
  });

  // Check if threshold met (e.g., 3 approvals)
  const approvals = await EditReview.count({ proposalId, decision: 'approve' });

  if (approvals >= 3) {
    // Apply changes
    await applyEdit(proposal);

    // Recalculate credibility
    await recalculateVeracity(proposal.nodeId);

    proposal.status = 'approved';
  }

  return proposal;
}
```

### 2.3 Formal Inquiry Dashboard
**User Story**: Users can see all active challenges/inquiries and participate.

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ Active Inquiries                    [Filter ▼]  │
├─────────────────────────────────────────────────┤
│ 🔴 CRITICAL: "JFK Assassination Date"          │
│    Challenger: @user123                         │
│    Type: Factual Error                          │
│    Evidence: 15 supporting, 2 refuting          │
│    AI Confidence: 0.45 (Low)                    │
│    Status: Evaluating                           │
│    [View Details] [Submit Evidence]             │
├─────────────────────────────────────────────────┤
│ 🟡 HIGH: "Climate Data Methodology"            │
│    Challenger: @scientist456                    │
│    Type: Methodological Flaw                    │
│    Evidence: 8 supporting, 12 refuting          │
│    AI Confidence: 0.72 (Moderate)               │
│    Status: Voting (78% reject)                  │
│    [View Details] [Vote]                        │
└─────────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// frontend/src/app/inquiries/page.tsx
<InquiryDashboard>
  <Filters>
    <Select name="status" options={['open', 'evaluating', 'voting', 'resolved']} />
    <Select name="severity" options={['critical', 'high', 'medium', 'low']} />
    <Select name="type" options={challengeTypes} />
  </Filters>

  <InquiryList>
    {inquiries.map(inquiry => (
      <InquiryCard
        severity={inquiry.severity}
        title={inquiry.targetNode.title}
        challenger={inquiry.challenger}
        evidenceCount={inquiry.evidenceCount}
        aiConfidence={inquiry.formalInquiry?.aiConfidence}
        status={inquiry.status}
        votes={inquiry.votes}
      />
    ))}
  </InquiryList>
</InquiryDashboard>

// Key features:
- Real-time updates via WebSocket
- Color-coded by severity
- AI confidence score prominent
- Separate "votes" from "confidence" (truth ≠ democracy)
- Click to view full evidence + submit new evidence
```

### 2.4 Challenge Submission Form
**User Story**: User spots an error and wants to formally challenge it.

**Flow**:
1. User viewing node clicks "Challenge This"
2. Form appears:
   - What type of issue? (dropdown: factual error, bias, outdated, etc.)
   - Severity? (critical/high/medium/low)
   - Detailed explanation
   - Supporting evidence (upload docs, link sources)
   - Specific section if applicable
3. AI performs preliminary evaluation:
   - Analyzes evidence quality
   - Checks for similar past challenges
   - Suggests credibility impact if accepted
4. Challenge submitted → enters formal inquiry process
5. Notifications sent to node author + watchers

**Implementation**:
```typescript
// frontend/src/components/challenge-form.tsx
<ChallengeForm nodeId="...">
  <Select label="Issue Type" options={[
    'factual_error',
    'missing_context',
    'bias',
    'source_credibility',
    'logical_fallacy',
    'outdated_information',
    'misleading_representation'
  ]} />

  <Select label="Severity" options={[
    'critical',  // Entire node invalid
    'high',      // Major claims affected
    'medium',    // Minor claims affected
    'low'        // Clarification needed
  ]} />

  <TextArea label="Detailed Explanation" required />

  <EvidenceUpload
    label="Supporting Evidence"
    accept=".pdf,.doc,.docx,image/*"
    multiple
  />

  <SourceLinkInput
    label="Reference URLs"
    multiple
  />

  <NodeSelector
    label="Related Reference Nodes"
    help="Link to existing nodes that support your challenge"
  />

  <AIAnalysis>
    {aiEvaluation && (
      <Alert severity={aiEvaluation.severity}>
        <strong>AI Preliminary Assessment:</strong>
        <p>{aiEvaluation.summary}</p>
        <p>Estimated impact on credibility: {aiEvaluation.estimatedImpact}%</p>
      </Alert>
    )}
  </AIAnalysis>

  <Button type="submit">Submit Challenge</Button>
</ChallengeForm>
```

---

## Phase 3: Intelligence Layer (Weeks 5-6)
**Goal**: Leverage existing AI services to automate quality and credibility

### 3.1 Automated Fact-Checking on Save
**User Story**: When user adds content, AI immediately flags potential issues.

**Implementation**:
```typescript
// backend/src/resolvers/ArticleResolver.ts
async updateArticle(input: UpdateArticleInput) {
  const article = await Article.findById(input.articleId);

  // Extract new claims
  const claims = await claimExtractionService.extractClaims(input.narrative);

  // Fact-check each claim against existing evidence
  const factCheckResults = await Promise.all(
    claims.map(claim => factCheckingService.verifyClaim(claim))
  );

  // Flag low-confidence claims
  const warnings = factCheckResults
    .filter(result => result.confidence < 0.6)
    .map(result => ({
      claim: result.claim,
      confidence: result.confidence,
      conflictingEvidence: result.refutingEvidence
    }));

  // Save article with warnings
  article.narrative = input.narrative;
  article.meta.factCheckWarnings = warnings;
  await article.save();

  // Notify author of issues
  if (warnings.length > 0) {
    await notificationService.notify(article.authorId, {
      type: 'fact_check_warning',
      articleId: article.id,
      warnings
    });
  }

  return article;
}
```

**Frontend Integration**:
```typescript
// frontend/src/components/markdown-editor.tsx
<MarkdownEditor>
  <Editor onChange={handleChange} />

  {factCheckWarnings.length > 0 && (
    <WarningPanel>
      {factCheckWarnings.map(warning => (
        <Warning severity="medium">
          <Text highlight={warning.claim}>
            "{warning.claim}"
          </Text>
          <p>AI Confidence: {warning.confidence * 100}%</p>
          <p>Conflicting evidence found. Consider adding sources.</p>
          <Button>View Evidence</Button>
        </Warning>
      ))}
    </WarningPanel>
  )}
</MarkdownEditor>
```

### 3.2 AI-Powered Reference Suggestions
**User Story**: When writing an article, AI suggests relevant reference nodes to link.

**Implementation**:
```typescript
// backend/src/services/ReferenceSuggestionService.ts
async suggestReferences(articleId: string, narrative: string) {
  // Extract entities (people, places, events)
  const entities = await claimExtractionService.extractEntities(narrative);

  // For each entity, search for matching reference nodes
  const suggestions = await Promise.all(
    entities.map(async entity => {
      const matches = await searchService.semanticSearch(
        entity.text,
        { nodeTypes: [entity.type], limit: 3 }
      );

      return {
        entity,
        suggestedNodes: matches.map(match => ({
          nodeId: match.id,
          title: match.title,
          credibility: match.veracityScore,
          relevance: match.similarity
        }))
      };
    })
  );

  return suggestions;
}
```

**Frontend**:
```typescript
// Inline suggestions while typing
<MarkdownEditor>
  <Editor onChange={handleChange} />

  {typedText.includes('@') && (
    <AutocompletePopup>
      {referenceSuggestions.map(ref => (
        <Suggestion onClick={() => insertReference(ref)}>
          <Icon type={ref.nodeType} />
          <Title>{ref.title}</Title>
          <Badge credibility={ref.credibility} />
        </Suggestion>
      ))}
    </AutocompletePopup>
  )}
</MarkdownEditor>

// Markdown syntax for references
// User types: "The [[Person: Albert Einstein]] published..."
// Renders as: "The <Link to="/nodes/123">Albert Einstein</Link> published..."
```

### 3.3 Credibility Auto-Recalculation
**User Story**: When reference nodes are updated, dependent article credibility updates automatically.

**Implementation**:
```typescript
// backend/src/services/CredibilityPropagationService.ts
async propagateCredibilityChange(nodeId: string) {
  const node = await Node.findById(nodeId);

  // Find all nodes that reference this node
  const dependentEdges = await Edge.find({ targetNodeId: nodeId });
  const dependentNodeIds = dependentEdges.map(e => e.sourceNodeId);

  // Recalculate credibility for each dependent node
  for (const depNodeId of dependentNodeIds) {
    await recalculateVeracity(depNodeId);
  }

  // Publish update event
  pubSub.publish('CREDIBILITY_CHANGED', {
    nodeIds: dependentNodeIds,
    triggerNodeId: nodeId
  });
}

// Called whenever:
- A node's evidence changes
- A challenge is resolved
- A source credibility is updated
- Referenced nodes are modified
```

---

## Phase 4: User Experience Polish (Weeks 7-8)
**Goal**: Make the application delightful to use

### 4.1 Inline Citation in Markdown
**Syntax**:
```markdown
The Battle of Gettysburg [[Event:123]] was fought from [[Date:456]]
to [[Date:789]] in [[Place:321]]. General [[Person:654]] commanded
the Union forces.

Source: [[Source:987]]
```

**Rendering**:
```
The Battle of Gettysburg [1] was fought from July 1 [2] to July 3, 1863 [3]
in Gettysburg, Pennsylvania [4]. General George Meade [5] commanded the
Union forces.

References:
[1] Battle of Gettysburg (Event) • Credibility: 95%
[2] July 1, 1863 (Date) • Verified
[3] July 3, 1863 (Date) • Verified
[4] Gettysburg, Pennsylvania (Place) • Credibility: 98%
[5] George Meade (Person) • Credibility: 92%

Source:
[6] "The Gettysburg Campaign" (Academic Paper) • Credibility: 96%
```

**Implementation**:
```typescript
// frontend/src/components/markdown-renderer.tsx
function renderMarkdown(text: string) {
  // Parse [[Type:ID]] syntax
  const refPattern = /\[\[(\w+):(\d+)\]\]/g;

  return text.replace(refPattern, (match, type, id) => {
    const node = nodes[id];
    return `<Reference
      nodeId="${id}"
      type="${type}"
      title="${node.title}"
      credibility="${node.veracityScore}"
    />`;
  });
}
```

### 4.2 Graph View Enhancements
**Features**:
- **Color-coded nodes by credibility**:
  - Green: >0.9 (highly credible)
  - Blue: 0.7-0.9 (credible)
  - Yellow: 0.5-0.7 (moderate)
  - Orange: 0.3-0.5 (questionable)
  - Red: <0.3 (disputed)

- **Node icons by type**:
  - Article: 📄
  - Person: 👤
  - Event: 📅
  - Place: 📍
  - Source: 📚
  - Thing: 🔷

- **Challenge indicators**:
  - ⚠️ badge on nodes with active challenges
  - Pulsing animation for critical challenges

- **Edge thickness by strength**:
  - Thicker edges = stronger evidence connection
  - Dashed edges = disputed connections

**Implementation**:
```typescript
// frontend/src/components/graph/enhanced-node.tsx
<Node
  style={{
    backgroundColor: getCredibilityColor(node.veracityScore),
    borderColor: node.activeChallenges > 0 ? 'red' : 'gray',
    borderWidth: node.activeChallenges > 0 ? 3 : 1
  }}
>
  <NodeIcon type={node.nodeType} />
  <NodeTitle>{node.title}</NodeTitle>
  <CredibilityBadge score={node.veracityScore} />
  {node.activeChallenges > 0 && (
    <ChallengeIndicator count={node.activeChallenges} />
  )}
</Node>
```

### 4.3 User Reputation & Gamification
**User Story**: Users gain reputation for quality contributions; high-reputation users get more privileges.

**Reputation Factors**:
- +10: Article created and maintained >0.8 credibility for 30 days
- +5: Reference node created with >0.9 credibility
- +3: Evidence submitted and accepted
- +15: Challenge submitted and accepted
- -5: Challenge submitted and rejected (spam penalty)
- +2: Quality edit approved by reviewers
- -10: Content removed for inaccuracy

**Privileges by Reputation**:
- 0-99: Can view, comment, propose edits
- 100-499: Can edit articles, create reference nodes
- 500-999: Can review edits, vote on challenges
- 1000+: Can initiate formal inquiries, curator permissions

**Implementation**:
```typescript
// backend/src/entities/UserReputation.ts
@Entity()
class UserReputation {
  @Column() userId: string;
  @Column() totalPoints: number;
  @Column() articlesCreated: number;
  @Column() challengesAccepted: number;
  @Column() challengesRejected: number;
  @Column() editsApproved: number;
  @Column() evidenceSubmitted: number;

  get reputationTier() {
    if (this.totalPoints >= 1000) return 'curator';
    if (this.totalPoints >= 500) return 'reviewer';
    if (this.totalPoints >= 100) return 'contributor';
    return 'reader';
  }

  canCreateArticle() { return this.totalPoints >= 100; }
  canReviewEdits() { return this.totalPoints >= 500; }
  canInitiateFormalInquiry() { return this.totalPoints >= 1000; }
}
```

**Frontend**:
```typescript
// User profile page
<UserProfile>
  <ReputationScore points={user.reputation.totalPoints} />
  <ReputationTier tier={user.reputation.tier} />

  <Achievements>
    <Achievement icon="🏆" title="Truth Seeker">
      Submitted 10 accepted challenges
    </Achievement>
    <Achievement icon="📝" title="Prolific Author">
      Created 50 high-credibility articles
    </Achievement>
  </Achievements>

  <Contributions>
    <Stat label="Articles" value={user.reputation.articlesCreated} />
    <Stat label="References" value={user.referencesCreated} />
    <Stat label="Evidence" value={user.evidenceSubmitted} />
    <Stat label="Challenges" value={user.challengesAccepted} />
  </Contributions>
</UserProfile>
```

### 4.4 Search with Faceted Filters
**User Story**: User searches "climate change" and can filter by credibility, type, date, challenges.

**UI**:
```
┌─────────────────────────────────────────────────┐
│ 🔍 [climate change____________] [Search]        │
├─────────────────────────────────────────────────┤
│ Filters:                                         │
│ ☑ Articles  ☑ Events  ☐ People  ☐ Places       │
│                                                  │
│ Credibility: [======··] 0.7 - 1.0               │
│                                                  │
│ Date Range: [2020] to [2024]                    │
│                                                  │
│ Status: ☐ Challenged ☑ Verified                │
│                                                  │
│ Sort: ⚪ Relevance ⦿ Credibility ⚪ Date        │
├─────────────────────────────────────────────────┤
│ Results (248):                                   │
│                                                  │
│ 📄 Climate Change: Causes and Effects (0.92)   │
│    Updated 3 days ago • 45 references           │
│    Evidence: 123 supporting, 5 refuting         │
│    [View] [Drill Down]                          │
│                                                  │
│ 📅 2023 Global Temperature Records (0.88)      │
│    Created 2 months ago • 12 references         │
│    ⚠️ 1 active challenge (low severity)         │
│    [View] [Drill Down]                          │
└─────────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// frontend/src/app/search/page.tsx
<SearchPage>
  <SearchBar onSearch={handleSearch} />

  <Filters>
    <CheckboxGroup label="Type" options={nodeTypes} />
    <RangeSlider label="Credibility" min={0} max={1} step={0.1} />
    <DateRange label="Date Range" />
    <CheckboxGroup label="Status" options={['challenged', 'verified']} />
    <Radio label="Sort" options={['relevance', 'credibility', 'date']} />
  </Filters>

  <Results>
    {results.map(node => (
      <SearchResult
        node={node}
        highlightedMatches={node.matches}
        credibility={node.veracityScore}
        challenges={node.activeChallenges}
      />
    ))}
  </Results>
</SearchPage>

// Backend query
async function search(query, filters) {
  return await searchService.hybridSearch(query, {
    nodeTypes: filters.types,
    minCredibility: filters.credibilityRange[0],
    maxCredibility: filters.credibilityRange[1],
    dateRange: filters.dateRange,
    excludeChallenged: !filters.showChallenged,
    sortBy: filters.sortBy
  });
}
```

---

## Phase 5: Advanced Features (Weeks 9-12)
**Goal**: Unique features that set Rabbit Hole apart from Wikipedia

### 5.1 Evidence Chain Visualization
**User Story**: User wants to understand the full provenance of a claim.

**Visualization**:
```
Article: "JFK Assassination" (Credibility: 0.78)
  └─ Claim: "Lee Harvey Oswald acted alone" (0.65) ⚠️ Challenged
      ├─ [Supporting] Warren Commission Report (0.92)
      │   └─ Source: Government Archive (0.95) ✓ Primary
      │
      ├─ [Supporting] FBI Investigation (0.88)
      │   └─ Source: FBI Records (0.93) ✓ Primary
      │
      └─ [Refuting] Multiple Gunmen Theory (0.45)
          ├─ Source: Witness Testimony (0.60)
          └─ Source: Acoustic Analysis (0.35) ⚠️ Disputed

Net Credibility: 0.65
Reason: Strong official support, but unresolved acoustics challenge
```

**Implementation**: D3.js tree visualization with interactive drill-down

### 5.2 Temporal Credibility View
**User Story**: See how node credibility has changed over time.

**Graph**:
```
Credibility Score
1.0 ─┐
     │         ╱───╲
0.8 ─┤       ╱       ╲
     │     ╱           ╲___________
0.6 ─┤   ╱
     │ ╱
0.4 ─┴─────────────────────────────▶ Time
    2020   2021   2022   2023   2024

Events:
↓ 2020: Created with initial evidence
↓ 2021: Challenge accepted, score dropped
↓ 2022: New supporting evidence added
↓ 2023: Another challenge, rejected
↓ 2024: Temporal decay applied
```

### 5.3 Cross-Article Consistency Checking
**User Story**: AI detects when multiple articles make conflicting claims.

**Example**:
```
⚠️ Consistency Warning

Article A: "World War II ended in 1945"
Article B: "World War II ended in September 1945"
Article C: "Japan surrendered on August 15, 1945"

Conflict: Precise end date inconsistent
Suggestion: Create definitive Event node "End of WWII"
with exact date and link all articles to it
```

### 5.4 Collaborative Challenges (Group Inquiries)
**User Story**: Multiple users can pool evidence for a single challenge.

**Features**:
- Create "Challenge Group"
- Invite contributors
- Shared evidence repository
- Collaborative argumentation
- Joint submission when ready

---

## Technical Architecture Recommendations

### Frontend State Management
```typescript
// Use Zustand for client state
// frontend/src/stores/nodeStore.ts
interface NodeStore {
  currentNode: Node | null;
  credibilityData: VeracityScore | null;
  evidence: Evidence[];
  challenges: Challenge[];

  loadNode: (nodeId: string) => Promise<void>;
  refreshCredibility: () => Promise<void>;
}

// React Query for server state
const { data: node } = useQuery(['node', nodeId], fetchNode);
const { data: challenges } = useQuery(['challenges', nodeId], fetchChallenges);
```

### Real-Time Updates
```typescript
// WebSocket subscriptions for live collaboration
useSubscription(NODE_UPDATED_SUBSCRIPTION, {
  variables: { nodeId },
  onSubscriptionData: ({ data }) => {
    // Update node in cache
    queryClient.setQueryData(['node', nodeId], data.nodeUpdated);
  }
});

useSubscription(CHALLENGE_SUBMITTED_SUBSCRIPTION, {
  variables: { nodeId },
  onSubscriptionData: ({ data }) => {
    // Show notification
    toast.warning(`New challenge on ${node.title}`);
  }
});
```

### Performance Optimizations
```typescript
// Pagination for large lists
const { data, fetchMore } = useInfiniteQuery(
  ['articles'],
  ({ pageParam = 0 }) => fetchArticles({ offset: pageParam, limit: 20 }),
  {
    getNextPageParam: (lastPage, pages) => pages.length * 20
  }
);

// Virtual scrolling for graph view
<VirtualizedGraph
  nodeCount={10000}
  renderNode={renderNode}
  viewport={{ width, height }}
/>

// Code splitting by route
const NodeDetail = lazy(() => import('./pages/NodeDetail'));
const InquiryDashboard = lazy(() => import('./pages/InquiryDashboard'));
```

---

## Success Metrics

### Usage Metrics
- **Daily Active Users**: Target 1000+ within 3 months
- **Articles Created**: Target 500+ high-quality articles
- **Reference Nodes**: Target 5000+ (10x articles)
- **Avg Credibility Score**: Target >0.75 across all nodes
- **Active Challenges**: Target 50+ ongoing inquiries

### Quality Metrics
- **Challenge Resolution Time**: <7 days average
- **Edit Approval Rate**: >80%
- **Fact-Check Warning Rate**: <10% of articles
- **User Retention**: >60% return after 7 days

### Community Health
- **Curator Growth**: 50+ users with 1000+ reputation
- **Collaboration Rate**: >3 contributors per article on average
- **Evidence Submissions**: >10 per article
- **Positive Inquiry Outcomes**: >70% of challenges resolved constructively

---

## Development Prioritization Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Node Detail Page Overhaul | HIGH | MEDIUM | 1 |
| Credibility Badge Display | HIGH | LOW | 1 |
| Reference Node Creation Wizard | HIGH | MEDIUM | 1 |
| Remove Home "Create Article" | LOW | LOW | 1 |
| Challenge Submission Form | HIGH | MEDIUM | 2 |
| Evidence Explorer | HIGH | MEDIUM | 2 |
| Inline Citations | MEDIUM | HIGH | 2 |
| Automated Fact-Checking | HIGH | LOW | 2 |
| Search with Filters | MEDIUM | MEDIUM | 3 |
| Reference Suggestions | MEDIUM | MEDIUM | 3 |
| Graph View Enhancements | MEDIUM | LOW | 3 |
| User Reputation System | MEDIUM | MEDIUM | 3 |
| Topic Proposal Process | MEDIUM | MEDIUM | 4 |
| Collaborative Editing Review | MEDIUM | HIGH | 4 |
| Evidence Chain Viz | LOW | HIGH | 5 |
| Temporal Credibility | LOW | MEDIUM | 5 |

---

## Roadmap Summary

**Phase 1 (Weeks 1-2): Make Backend Visible**
- Home page redesign (discovery focus)
- Node detail page implementation
- Reference creation wizard
- Credibility visualization

**Phase 2 (Weeks 3-4): Enable User Workflows**
- Topic proposal process
- Collaborative editing with review
- Formal inquiry dashboard
- Challenge submission form

**Phase 3 (Weeks 5-6): Automate Intelligence**
- Auto fact-checking on save
- Reference suggestions
- Credibility auto-recalculation

**Phase 4 (Weeks 7-8): Polish Experience**
- Inline citation syntax
- Graph view enhancements
- User reputation system
- Search with faceted filters

**Phase 5 (Weeks 9-12): Advanced Features**
- Evidence chain visualization
- Temporal credibility view
- Cross-article consistency
- Collaborative challenges

---

## Getting Started (Next 3 Days)

### Day 1: Remove/Restructure
1. Remove "Create Article" button from home page
2. Add "Propose New Topic" link with modal
3. Move article editor to node detail page
4. Update navigation

### Day 2: Credibility Visibility
1. Create CredibilityBadge component
2. Add to node cards in lists
3. Add to node detail page header
4. Query veracity scores in GraphQL

### Day 3: Reference Wizard Prototype
1. Create ReferenceWizard component
2. Implement type selector
3. Build PersonForm as first example
4. Wire up to backend node creation

---

## Conclusion

Rabbit Hole has an **exceptional foundation** with sophisticated backend systems already in place. The path forward is clear:

1. **Expose the Intelligence** - Make veracity scores, evidence chains, and AI analysis visible
2. **Enable the Workflows** - Let users create references, challenge content, and collaborate
3. **Trust the System** - Let algorithms determine truth, not popularity

By following this plan, Rabbit Hole will evolve from a promising knowledge graph into a **true corpus of truth** - verifiable, traversable, and superior to Wikipedia.

The technology is ready. The vision is clear. Let's make it real.
