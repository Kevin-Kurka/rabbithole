# FORMAL INQUIRY SYSTEM - AI-Guided Truth-Seeking
## Complete Architecture & User Experience Flow

**Vision**: An AI-facilitated court-like process where the AI acts as objective judge, research clerk, and devil's advocate to ensure every inquiry is fact-based, rigorous, and leads to truth.

---

## 🎯 THE VISION: AI as Truth-Seeking Partner

### Your Unique Approach
Unlike traditional fact-checking where AI just validates claims, your system has the AI **actively participate** as:

1. **Research Clerk**: Automatically finds relevant facts, sources, and evidence
2. **Devil's Advocate**: Presents counter-arguments to sharpen claims
3. **Judge**: Guides the process, points out logical fallacies, ensures rigor
4. **Facilitator**: Helps both sides build the strongest possible arguments

**Result**: Every challenge becomes a comprehensive investigation where truth emerges through rigorous examination.

---

## 📊 CURRENT STATE vs. VISION

### What Exists Now (Simplified Schema)

**Database Schema** ✅:
- `Challenges` table with **Toulmin argumentation model**
  - Claim, Grounds, Warrant, Backing, Qualifier (challenger)
  - Rebuttal fields (defender)
  - AI analysis and recommendations fields
  - Status tracking
- `ChallengeEvidence` - Evidence submissions
- `ChallengeParticipants` - Community participation
- `ChallengeVotes` - Voting on outcomes

**Backend** ⚠️ (Needs Enhancement):
- `ChallengeResolver` - References old schema (needs updating)
- `AIAssistantResolver` - Basic AI features
- AI service stubs exist but need enhancement

**Frontend** ✅:
- `ChallengeForm` - UI to create challenges
- `ChallengeCard`, `ChallengePanel` - Display challenges
- `ChallengeVotingWidget` - Voting interface
- `VeracityBreakdown` - Show credibility impact

### What Needs to Be Built (Your Vision)

**Enhanced AI Features** (Core Innovation):
1. **AI Fact-Checking** - Automatically verify claims
2. **Counter-Argument Generation** - AI presents opposing views
3. **Evidence Discovery** - AI finds relevant sources
4. **Logical Fallacy Detection** - AI identifies weak reasoning
5. **Process Guidance** - AI suggests next steps
6. **Research Summaries** - AI synthesizes findings

---

## 🔄 COMPLETE USER FLOW: How It Works

### Stage 1: Initiate Formal Inquiry

**User Action**: User sees a claim in an article they want to challenge

**Example**:
```
Article: "JFK Assassination"
Claim in Article: "Lee Harvey Oswald acted alone"
```

**User clicks**: "Challenge This Claim" button next to the statement

---

#### **Challenge Form UI (Already Exists)**

**Modal appears with**:

```
┌──────────────────────────────────────────────┐
│  Create Formal Inquiry                    [X]│
├──────────────────────────────────────────────┤
│                                              │
│  What are you challenging?                   │
│  ┌──────────────────────────────────────┐   │
│  │ "Lee Harvey Oswald acted alone"      │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  Your Claim (What you believe is true):     │
│  ┌──────────────────────────────────────┐   │
│  │ Evidence suggests multiple shooters  │   │
│  │ based on acoustic analysis and       │   │
│  │ witness testimony                    │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  Grounds (Initial Evidence):                 │
│  ┌──────────────────────────────────────┐   │
│  │ - Acoustic analysis by HSCA 1978     │   │
│  │ - Multiple witness accounts          │   │
│  │ - Trajectory analysis contradicts    │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  Warrant (Why this evidence matters):        │
│  ┌──────────────────────────────────────┐   │
│  │ The HSCA acoustic analysis showed a  │   │
│  │ 95% probability of a second shooter  │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  [Ask AI to Research This] [Submit Inquiry] │
└──────────────────────────────────────────────┘
```

---

### Stage 2: AI Initial Research (NEW - YOUR VISION)

**User clicks**: "Ask AI to Research This"

**AI Automatically**:

1. **Fact-Checks the Original Claim**:
```json
{
  "original_claim": "Lee Harvey Oswald acted alone",
  "ai_analysis": {
    "sources_supporting": [
      "Warren Commission Report (1964)",
      "FBI Investigation (1963-1964)",
      "Autopsy findings"
    ],
    "sources_contradicting": [
      "HSCA Final Report (1979) - acoustic evidence",
      "Witness testimony compilation",
      "Trajectory analysis studies"
    ],
    "consensus": "Highly debated - no scientific consensus",
    "credibility_score": 0.45
  }
}
```

2. **Researches the Challenge**:
```json
{
  "challenge_claim": "Evidence suggests multiple shooters",
  "ai_research": {
    "supporting_evidence": [
      {
        "source": "HSCA Acoustic Analysis (1978)",
        "strength": "high",
        "summary": "95% probability of 4 shots, not 3"
      },
      {
        "source": "Dealey Plaza witnesses (1963)",
        "strength": "medium",
        "summary": "Multiple witnesses reported shots from grassy knoll"
      }
    ],
    "counter_evidence": [
      {
        "source": "National Academy of Sciences (1982)",
        "strength": "high",
        "summary": "Debunked HSCA acoustic analysis - timing errors"
      },
      {
        "source": "Ballistics analysis",
        "strength": "high",
        "summary": "All bullets traced to Oswald's rifle"
      }
    ],
    "logical_issues": [
      "Appeal to Authority - relying heavily on single study",
      "Cherry-picking - ignoring contradicting acoustic studies"
    ]
  }
}
```

3. **AI Presents Findings to User**:

```
┌──────────────────────────────────────────────┐
│  🤖 AI Research Assistant                    │
├──────────────────────────────────────────────┤
│                                              │
│  I've researched your claim. Here's what    │
│  I found:                                    │
│                                              │
│  ✅ SUPPORTING YOUR CHALLENGE:              │
│  • HSCA Acoustic Analysis (1978)            │
│    95% probability of 4 shots               │
│                                              │
│  • Multiple eyewitness accounts             │
│    Reported shots from grassy knoll         │
│                                              │
│  ⚠️  COUNTER-ARGUMENTS (Devil's Advocate):   │
│  • National Academy of Sciences (1982)      │
│    Debunked HSCA acoustic analysis          │
│    Found timing errors in methodology       │
│                                              │
│  • Ballistics Analysis                      │
│    All bullets traced to Oswald's rifle     │
│                                              │
│  🎯 LOGICAL ISSUES DETECTED:                 │
│  • Your argument relies heavily on the      │
│    HSCA study which was later debunked      │
│                                              │
│  • You may be cherry-picking evidence       │
│    Consider addressing the NAS rebuttal     │
│                                              │
│  💡 RECOMMENDATIONS:                         │
│  1. Strengthen your warrant by addressing   │
│     the NAS critique directly               │
│                                              │
│  2. Add alternative evidence (trajectory    │
│     analysis, medical findings)             │
│                                              │
│  3. Clarify: Are you claiming conspiracy    │
│     or just multiple shooters?              │
│                                              │
│  [Revise Challenge] [Proceed Anyway]        │
└──────────────────────────────────────────────┘
```

---

### Stage 3: User Refines Challenge

**User**: Reviews AI feedback and strengthens their argument

**Revised Challenge**:
```
Claim: Multiple shooters were involved in JFK assassination

Grounds (Updated with AI help):
1. HSCA Acoustic Analysis (1978) - acknowledging later critique
2. Multiple trajectory studies show impossible angles for single shooter
3. Medical evidence: Entry/exit wounds inconsistent with single shooter
4. Dealey Plaza geometry analysis

Warrant (Strengthened):
While the HSCA acoustic analysis was later questioned on timing,
the physical trajectory analysis from multiple studies (1965-2003)
demonstrates shots from different angles, which is physically
impossible from a single location.

Backing (Added):
- Dealey Plaza geometry measurements
- Autopsy reports from multiple pathologists
- Photographic evidence analysis

Qualifier:
Based on physical evidence, highly probable (not certain) that
multiple shooters were involved.
```

**AI Response**:
```
✅ Much stronger argument!
✅ Acknowledges counter-arguments
✅ Backs up claims with multiple sources
✅ Appropriate qualifier (avoiding overstatement)

Ready to submit formal inquiry.
```

---

### Stage 4: Challenge Published & Notification

**System Actions**:
1. Challenge is created with status: "open"
2. Original article author is notified
3. Challenge appears on article page
4. Community can see and participate

**Article Page Updates**:
```
┌────────────────────────────────────────────────────┐
│  JFK Assassination                    [Credibility: 68%] │
├────────────────────────────────────────────────────┤
│                                                    │
│  ⚠️  ACTIVE CHALLENGE (1)                          │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ 🔍 Formal Inquiry #12345                     │ │
│  │                                              │ │
│  │ Challenger: @researcher_john                 │ │
│  │ Status: Open (3 days)                        │ │
│  │                                              │ │
│  │ Claim being challenged:                      │ │
│  │ "Lee Harvey Oswald acted alone"              │ │
│  │                                              │ │
│  │ Challenge claim:                             │ │
│  │ "Multiple shooters were involved"            │ │
│  │                                              │ │
│  │ Evidence: 4 sources | AI Analysis: Available │ │
│  │                                              │ │
│  │ Community Votes: 12 Sustain | 8 Dismiss      │ │
│  │                                              │ │
│  │ [View Full Inquiry] [Join Discussion]       │ │
│  │ [Submit Counter-Evidence]                    │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

---

### Stage 5: AI Guides the Process (Ongoing)

**AI Continuously**:

#### 5a. Monitors for New Evidence
```
🤖 AI Alert: New evidence submitted

User @historian_mary submitted:
"National Academy of Sciences 2023 Review"

AI Analysis:
- This is a credible source (peer-reviewed)
- Contradicts challenger's trajectory analysis
- Recommends challenger address this in rebuttal

[Notify Challenger]
```

#### 5b. Suggests Missing Evidence
```
💡 AI Suggestion for Defender:

I noticed the defense hasn't addressed:
1. The trajectory analysis studies (1965-2003)
2. The Dealey Plaza geometry measurements

Suggested counter-evidence:
- FBI Ballistics Report (2013) - modern analysis
- 3D reconstruction studies
- Expert testimony from modern forensic analysis

[Research These] [Dismiss]
```

#### 5c. Detects Logical Fallacies
```
⚠️  AI Analysis: Potential Issue Detected

Participant @witness_bob made an argument that:
"Most people believe there were multiple shooters"

Logical Fallacy: Argumentum ad Populum
- Truth is not determined by popularity
- Recommend focusing on physical evidence

[Flag for Review] [Ignore]
```

#### 5d. Provides Process Guidance
```
📋 AI Process Update:

Challenge Status: In Review (Day 5)

Progress:
✅ Initial evidence submitted
✅ Counter-evidence submitted
⚠️  Awaiting challenger's rebuttal to NAS 2023 study
⚠️  No expert opinions submitted yet

Recommended Next Steps:
1. Challenger: Address the 2023 NAS review
2. Defender: Submit expert forensic analysis
3. Community: Vote on evidence credibility

Timeline: Recommend resolution vote in 3-5 days

[Extend Inquiry] [Proceed to Vote]
```

---

### Stage 6: Community Participation (Amicus Brief)

**Any User Can**:

1. **Submit Evidence**:
```
┌──────────────────────────────────────────┐
│  Join Inquiry as Participant             │
├──────────────────────────────────────────┤
│                                          │
│  Which side are you supporting?          │
│  ○ Challenger (multiple shooters)        │
│  ● Defender (single shooter)             │
│  ○ Neutral (just providing evidence)     │
│                                          │
│  Evidence Type:                          │
│  ▼ Expert Opinion                        │
│                                          │
│  Your Contribution:                      │
│  ┌────────────────────────────────────┐ │
│  │ As a forensic ballistics expert,   │ │
│  │ I analyzed the 3D reconstructions  │ │
│  │ and can confirm...                 │ │
│  └────────────────────────────────────┘ │
│                                          │
│  🤖 AI will fact-check your submission  │
│                                          │
│  [Submit] [Cancel]                       │
└──────────────────────────────────────────┘
```

2. **AI Validates Participant Contribution**:
```
🤖 Reviewing submission from @expert_jane...

Credentials Check:
✅ PhD in Forensic Ballistics (verified)
✅ Published in peer-reviewed journals
✅ No conflicts of interest detected

Content Check:
✅ Cites specific studies
✅ No logical fallacies detected
⚠️  Recommendation: Add source citation for "3D reconstruction"

Contribution accepted with high credibility weight (0.9)
```

---

### Stage 7: AI-Facilitated Resolution

**After sufficient evidence/debate** (typically 7-14 days):

#### 7a. AI Generates Comprehensive Summary
```
🤖 AI Summary of Inquiry #12345

CLAIM CHALLENGED:
"Lee Harvey Oswald acted alone"

CHALLENGER'S POSITION:
Multiple shooters were involved

EVIDENCE SUBMITTED:
Total: 23 pieces of evidence
- 12 supporting challenger
- 11 supporting defender

CREDIBILITY ANALYSIS:
Challenger's strongest evidence:
• Trajectory analysis (credibility: 0.82)
• Dealey Plaza geometry (credibility: 0.78)

Defender's strongest evidence:
• Ballistics analysis (credibility: 0.91)
• NAS 2023 Review (credibility: 0.95)

EXPERT PARTICIPATION:
• 3 forensic experts (2 support defender, 1 neutral)
• 2 historians (both support challenger)

LOGICAL ISSUES IDENTIFIED:
• Challenger: Some cherry-picking of older studies
• Defender: Dismissed some credible trajectory analysis

AI ASSESSMENT:
The physical evidence remains inconclusive. While ballistics
clearly point to Oswald's rifle, trajectory analysis raises
valid questions that haven't been fully addressed by modern
forensic methods.

RECOMMENDATION:
Partial sustain - Original claim should be modified to:
"Current evidence suggests Oswald fired shots, but complete
certainty about additional shooters remains elusive"

Suggested article credibility adjustment: -5% (now 63%)
```

#### 7b. Community Votes (Guided by AI)
```
┌─────────────────────────────────────────────────┐
│  Resolution Vote: Inquiry #12345                │
├─────────────────────────────────────────────────┤
│                                                 │
│  After reviewing all evidence and AI analysis:  │
│                                                 │
│  How should this challenge be resolved?         │
│                                                 │
│  ○ Sustain Challenge (multiple shooters)        │
│     Claim should be removed/modified            │
│                                                 │
│  ● Partial Sustain (evidence inconclusive)      │
│     Claim should include uncertainty            │
│                                                 │
│  ○ Dismiss Challenge (single shooter)           │
│     Original claim stands                       │
│                                                 │
│  ○ Needs More Evidence                          │
│     Extend inquiry                              │
│                                                 │
│  Your Reasoning (optional):                     │
│  ┌───────────────────────────────────────────┐ │
│  │ AI analysis is compelling - both sides    │ │
│  │ have valid evidence but no smoking gun    │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  🤖 AI suggests: Partial Sustain               │
│     Based on evidence quality and expert input │
│                                                 │
│  [Submit Vote] [View Full Analysis]             │
└─────────────────────────────────────────────────┘
```

#### 7c. Resolution Applied
```
✅ Inquiry #12345 Resolved

Final Vote: 68% Partial Sustain
(AI recommendation: Partial Sustain)

Resolution:
The challenge has been partially sustained. The original
claim "Lee Harvey Oswald acted alone" has been modified to:

"Current evidence suggests Lee Harvey Oswald fired the fatal
shots, though complete certainty about whether additional
shooters were involved remains a subject of ongoing debate."

Article Credibility Impact:
• Was: 68%
• Now: 63% (-5% for unresolved uncertainty)

Actions Taken:
✅ Article updated with modified claim
✅ Challenge marked as "Resolved - Partial"
✅ All participants notified
✅ Credibility scores updated

This inquiry is now part of the permanent record and can
be referenced in future challenges.
```

---

## 🧠 AI FEATURES REQUIRED (Implementation Guide)

### 1. AI Fact-Checker
**GraphQL Mutation**:
```graphql
mutation FactCheckClaim {
  factCheckClaim(
    claim: "Lee Harvey Oswald acted alone"
    context: "JFK Assassination"
  ) {
    credibilityScore
    sourcesSupporting {
      title
      credibility
      summary
    }
    sourcesContradicting {
      title
      credibility
      summary
    }
    consensus
    uncertainties
  }
}
```

**Backend Implementation**:
```typescript
// backend/src/services/AIFactChecker.ts
async factCheckClaim(claim: string, context: string) {
  // 1. Search knowledge graph for related nodes
  const relatedNodes = await this.vectorSearch(claim);

  // 2. Call OpenAI/Claude with context
  const aiAnalysis = await this.llm.analyze({
    claim,
    context,
    sources: relatedNodes
  });

  // 3. Fact-check against trusted sources
  const externalSources = await this.searchExternalSources(claim);

  // 4. Compile results
  return {
    credibilityScore: aiAnalysis.score,
    sourcesSupporting: aiAnalysis.supporting,
    sourcesContradicting: aiAnalysis.contradicting,
    consensus: aiAnalysis.consensus
  };
}
```

---

### 2. Counter-Argument Generator
**GraphQL Query**:
```graphql
query GenerateCounterArguments {
  generateCounterArguments(
    challengeId: "12345"
  ) {
    arguments {
      claim
      evidence
      strength
      sources
    }
    logicalFallacies {
      type
      description
      location
    }
  }
}
```

**Backend Implementation**:
```typescript
// backend/src/services/AIDevilsAdvocate.ts
async generateCounterArguments(challenge: Challenge) {
  const prompt = `
You are a devil's advocate in a formal inquiry.
The challenger claims: "${challenge.claim}"
Their evidence: ${challenge.grounds}

Generate the strongest possible counter-arguments:
1. What evidence contradicts this claim?
2. What are the logical weaknesses?
3. What have they overlooked?

Be rigorous but fair.
`;

  const aiResponse = await this.llm.generate(prompt);

  // Parse and structure response
  return {
    arguments: aiResponse.counterArgs,
    logicalFallacies: this.detectFallacies(challenge)
  };
}
```

---

### 3. Evidence Discovery
**GraphQL Query**:
```graphql
query DiscoverEvidence {
  discoverEvidence(
    challengeId: "12345"
    side: "challenger"
  ) {
    suggestedSources {
      type
      title
      relevance
      url
      summary
    }
    searchQueries
    relatedNodes {
      id
      title
      relevance
    }
  }
}
```

**Backend Implementation**:
```typescript
// backend/src/services/AIEvidenceDiscovery.ts
async discoverEvidence(challenge: Challenge, side: string) {
  // 1. Analyze what evidence is needed
  const gapsAnalysis = await this.analyzeEvidenceGaps(challenge);

  // 2. Search internal knowledge graph
  const internalEvidence = await this.searchGraph(gapsAnalysis.keywords);

  // 3. Search external sources (Web, academic databases)
  const externalEvidence = await this.searchExternal(gapsAnalysis.keywords);

  // 4. Rank by relevance
  return this.rankEvidence(internalEvidence, externalEvidence, side);
}
```

---

### 4. Process Guidance
**GraphQL Query**:
```graphql
query GetProcessGuidance {
  getProcessGuidance(challengeId: "12345") {
    currentStage
    nextSteps {
      action
      actor
      deadline
      priority
    }
    missingElements
    recommendations
    timelineEstimate
  }
}
```

**Backend Implementation**:
```typescript
// backend/src/services/AIProcessGuide.ts
async getProcessGuidance(challenge: Challenge) {
  // Analyze challenge state
  const analysis = {
    hasInitialEvidence: challenge.evidence.length > 0,
    hasRebuttal: !!challenge.rebuttal_claim,
    hasExpertOpinion: this.hasExpertParticipants(challenge),
    daysActive: this.getDaysActive(challenge),
    voteCount: challenge.votes.length
  };

  // Generate recommendations
  const nextSteps = [];

  if (!analysis.hasRebuttal && analysis.daysActive > 3) {
    nextSteps.push({
      action: "Defender should submit rebuttal",
      actor: "defender",
      deadline: "2 days",
      priority: "high"
    });
  }

  if (!analysis.hasExpertOpinion && analysis.daysActive > 7) {
    nextSteps.push({
      action: "Seek expert opinion",
      actor: "community",
      deadline: "5 days",
      priority: "medium"
    });
  }

  return {
    currentStage: this.determineStage(analysis),
    nextSteps,
    timelineEstimate: this.estimateResolution(analysis)
  };
}
```

---

## 🎨 COMPLETE UI FLOW DIAGRAM

```
User sees article claim
         │
         ▼
   [Challenge This]
         │
         ▼
┌──────────────────┐
│ Challenge Form   │
│ (Toulmin model)  │
└────────┬─────────┘
         │
         ▼
    AI Research ◄──── Automatically triggered
    ├─ Fact-check claim
    ├─ Find counter-evidence
    ├─ Detect logical issues
    └─ Suggest improvements
         │
         ▼
    User Refines ◄──── Based on AI feedback
         │
         ▼
   Submit Challenge
         │
         ├──► Notify article author
         ├──► Publish on article page
         └──► Open for community
                     │
                     ▼
         ┌───────────────────────┐
         │ Ongoing AI Monitoring │
         ├───────────────────────┤
         │ • New evidence alerts │
         │ • Counter-args        │
         │ • Fallacy detection   │
         │ • Process guidance    │
         └───────┬───────────────┘
                 │
                 ▼
    Community Participates
    ├─ Submit evidence
    ├─ Expert opinions
    └─ Discussions
                 │
                 ▼
    AI Generates Summary
    ├─ Evidence analysis
    ├─ Credibility scores
    ├─ Expert consensus
    └─ Recommendation
                 │
                 ▼
    Community Votes ◄──── Guided by AI
    (Sustain/Dismiss/Partial)
                 │
                 ▼
       Resolution Applied
       ├─ Article updated
       ├─ Credibility adjusted
       └─ Permanent record
```

---

## 📝 IMPLEMENTATION PRIORITY

### Phase 1: Core Challenge Flow (2-3 days)
1. ✅ Database schema (DONE)
2. Update ChallengeResolver to match new schema
3. Wire up ChallengeForm to backend
4. Display challenges on article pages

### Phase 2: Basic AI Integration (3-5 days)
1. Implement AI fact-checking
2. Add "Ask AI to Research" button
3. Display AI analysis in modal
4. Store AI analysis in challenge record

### Phase 3: Counter-Arguments (3-4 days)
1. Implement counter-argument generation
2. Add "AI Devil's Advocate" panel
3. Show counter-evidence to users
4. Let users address counter-arguments

### Phase 4: Evidence Discovery (2-3 days)
1. Implement evidence search
2. Suggest missing evidence
3. Auto-link related nodes
4. External source integration

### Phase 5: Process Guidance (2-3 days)
1. Stage detection
2. Next steps recommendations
3. Timeline estimation
4. Automated notifications

### Phase 6: Resolution (3-4 days)
1. AI summary generation
2. Voting interface with AI guidance
3. Credibility calculation
4. Article update automation

**Total Estimate**: 15-22 days for complete AI-guided formal inquiry system

---

## 🚀 NEXT IMMEDIATE STEPS

1. **Update ChallengeResolver** to match new simplified schema
2. **Implement basic AI fact-checking** endpoint
3. **Add "Ask AI" button** to ChallengeForm
4. **Test end-to-end**: Create challenge → AI research → Submit → Display

Would you like me to start implementing any of these features?
