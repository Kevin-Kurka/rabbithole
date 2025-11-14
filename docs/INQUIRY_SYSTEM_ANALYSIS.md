# Inquiry System Analysis & Gap Assessment

## Current State

### ✅ What We Have

1. **Methodology Framework**
   - 3 base methodologies (Scientific Method, Legal Discovery, Toulmin)
   - Node/Edge type definitions per methodology
   - Workflow step management
   - Template application system
   - Fork/share capabilities

2. **Basic Inquiries**
   - Question/answer threads
   - Status tracking (open, answered, resolved, challenged)
   - Hierarchical replies
   - Targeting of nodes/edges

3. **AI Assistant**
   - Basic Q&A
   - Inconsistency detection
   - Evidence suggestions
   - Rate limiting (requests/day)

### ❌ Critical Gaps

1. **No Formal Inquiry Workflows**
   - Methodologies exist but lack structured step-by-step processes
   - No validation criteria per step
   - No progress tracking through multi-step processes
   - No AI-guided evaluation at each step

2. **Missing Evidence Evaluation**
   - No admissibility framework
   - No primary/secondary/tertiary classification
   - No chain of custody
   - No authentication protocols
   - No reliability scoring

3. **No Argument Analysis**
   - No fallacy detection (15+ fallacy types needed)
   - No logical structure validation
   - No premise-conclusion mapping
   - No burden of proof tracking

4. **Limited AI Integration**
   - AI doesn't guide through formal processes
   - No critical questioning per step
   - No structured evaluation prompts
   - AI is reactive, not proactive guide

5. **No Data Analysis Framework**
   - No statistical validation
   - No data quality checks
   - No reproducibility assessment
   - No methodology verification

6. **Missing Inquiry Types**
   - Evidence Admissibility
   - Source Classification
   - Logical Argument Analysis
   - Data Analysis Inquiry
   - Historical Source Criticism

---

## Proposed Solution: Formal Inquiry Type System

### Core Concept

Transform inquiries from simple Q&A to **structured, transparent evaluation processes** where:
- Each inquiry type has defined steps
- AI critically evaluates each step
- Users build evidence-based arguments
- Final determinations have calculated confidence scores
- Process is auditable and reproducible

### 8 Formal Inquiry Types

1. **Evidence Admissibility** - Determine if evidence qualifies for Level 0
2. **Source Classification** - Primary vs Secondary vs Tertiary
3. **Logical Argument Analysis** - Detect fallacies, validate structure
4. **Scientific Method** (Enhanced) - Rigorous hypothesis testing
5. **Legal Discovery** (Enhanced) - Evidence gathering with legal standards
6. **Data Analysis** - Statistical claims evaluation
7. **Toulmin Argumentation** (Enhanced) - Structured argument building
8. **Historical Source Criticism** - Historical document evaluation

---

## Example: Evidence Admissibility Inquiry

### User Flow

1. **Start Inquiry**: "I want to add this witness testimony to Level 0"

2. **Step 1: Source Identification**
   - User provides: Who, when, where, context
   - AI asks: "What is this person's relationship to the event? Do they have conflicts of interest? What is their credibility history?"
   - AI evaluates: Cross-references against known sources, checks for biases

3. **Step 2: Authenticity Verification**
   - User provides: Original document, metadata, provenance
   - AI asks: "Has this been altered? Can you provide the chain of custody? Are there digital signatures?"
   - AI evaluates: Checks for manipulation, analyzes metadata consistency

4. **Step 3: Relevance Assessment**
   - User explains: How this relates to the claim
   - AI asks: "Is this directly material? Is it temporally relevant? What specific claim does it support?"
   - AI evaluates: Logical connection strength, materiality score

5. **Step 4: Reliability Evaluation**
   - User provides: Corroborating sources
   - AI asks: "Are there contradicting sources? How reliable is the source type? Has this source been impeached?"
   - AI evaluates: Cross-reference analysis, contradiction identification

6. **Final Determination**
   - **Admissibility Score**: 0.85/1.00
   - **Recommendation**: Admissible with conditions
   - **Conditions**: "Must be corroborated by at least one additional independent source"
   - **Rationale**: Detailed explanation with citations

---

## Technical Architecture

### Database Schema

```
InquiryTypes (8 formal types)
  ├── workflow_steps (JSON)
  ├── ai_evaluation_prompts (JSON per step)
  ├── validation_rules (JSON)
  └── scoring_rubric (JSON)

FormalInquiries (instances)
  ├── current_step (progress tracker)
  ├── step_data (collected data per step)
  ├── ai_evaluations (AI feedback per step)
  └── final_score (calculated result)

Arguments (logical analysis)
  ├── premises (JSON array)
  ├── conclusion (text)
  ├── detected_fallacies (JSON array)
  └── validity_score (0.00-1.00)

EvidenceChain (provenance tracking)
  ├── source_node_id
  ├── derived_from_id (chain link)
  ├── chain_level (0=primary, 1=secondary...)
  └── integrity_hash (SHA-256)
```

### AI Service Extensions

```typescript
AIInquiryEvaluationService:
  - evaluateStep(inquiryId, stepNumber, data)
  - suggestNextSteps(inquiryId)
  - detectFallacies(argument)
  - evaluateAdmissibility(evidenceId)
  - classifySource(nodeId)
  - assessDataQuality(dataset)
  - provideGuidance(inquiryId, question)
```

### Frontend Components

```
<FormalInquiryWizard>
  <InquiryTypeSelector />
  <StepProgressBar />
  <StepForm currentStep={N}>
    <FieldInputs />
    <AIGuidance />
    <ValidationErrors />
  </StepForm>
  <AIEvaluation>
    <CriticalQuestions />
    <WeaknessesIdentified />
    <ImprovementSuggestions />
  </AIEvaluation>
  <FinalScoreCard>
    <ConfidenceScore />
    <Determination />
    <Rationale />
  </FinalScoreCard>
</FormalInquiryWizard>
```

---

## Implementation Phases

### Phase 1: Core Evidence Framework (2 weeks)
**Goal**: Enable evidence evaluation for Level 0 promotion

- Database: InquiryTypes, FormalInquiries tables
- Backend: Evidence Admissibility + Source Classification
- AI: Basic evaluation prompts
- Frontend: Simple wizard UI
- **Deliverable**: Users can formally evaluate evidence

### Phase 2: Argument Analysis (2 weeks)
**Goal**: Detect logical fallacies and validate arguments

- Database: Arguments table
- Backend: Logical Argument Analysis inquiry type
- AI: 15+ fallacy detection algorithms
- Frontend: Argument structure visualizer
- **Deliverable**: Users can analyze argument validity

### Phase 3: Enhanced Methodologies (2 weeks)
**Goal**: Upgrade existing methodologies with formal evaluation

- Backend: Enhanced Scientific Method, Legal Discovery, Data Analysis
- Database: EvidenceChain table
- AI: Step-by-step evaluation for each methodology
- Frontend: Methodology-specific wizards
- **Deliverable**: Existing methodologies have AI-guided workflows

### Phase 4: Historical & Specialized (2 weeks)
**Goal**: Complete inquiry type system

- Backend: Historical Source Criticism
- Backend: Enhanced Toulmin Argumentation
- AI: Specialized evaluation prompts
- Frontend: Complete template library
- **Deliverable**: Full suite of 8 inquiry types

### Phase 5: Polish & Integration (2 weeks)
**Goal**: Production-ready system

- AI: Comprehensive prompt engineering
- Frontend: Polished UX, progress saving
- Features: Export reports, recommendation engine
- Testing: Full test coverage, user testing
- **Deliverable**: Production deployment

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Inquiry Adoption | 50+ formal inquiries/week | Count FormalInquiries created |
| Completion Rate | >70% complete all steps | % reaching final_score |
| Quality Score | Avg score >0.75 | Mean(final_score) |
| AI Guidance Rating | >4/5 stars | User satisfaction survey |
| Level 0 Promotions | 10+ nodes/week | Count Level 1→0 promotions |
| Fallacy Detection | 5+ fallacies/day | Count detected_fallacies |

---

## Key Benefits

1. **Transparency**: Every determination is auditable step-by-step
2. **Rigor**: AI enforces critical evaluation at each step
3. **Education**: Users learn proper evaluation methods
4. **Quality**: Higher confidence in Level 0 (truth layer)
5. **Collaboration**: Multiple users can review/challenge inquiries
6. **Scalability**: Template system allows new inquiry types

---

## Questions for Consideration

1. **Scoring Algorithms**: How should we weight different factors in final scores?
2. **AI Model Selection**: Continue with Ollama, or integrate GPT-4 for complex evaluation?
3. **Human Review**: Should all high-stakes determinations require curator approval?
4. **Appeal Process**: How do users challenge determinations?
5. **Versioning**: How do we handle inquiry type evolution?
6. **Access Control**: Who can create different inquiry types?

---

## Next Immediate Actions

1. Review this specification document
2. Prioritize inquiry types for Phase 1
3. Design AI evaluation prompts for Evidence Admissibility
4. Create database migration for InquiryTypes and FormalInquiries
5. Build basic inquiry wizard UI prototype
6. Test with JFK assassination case study

---

## References

- [Full Specification](./INQUIRY_TYPES_SPECIFICATION.md)
- [Logical Fallacies Reference](https://owl.purdue.edu/owl/general_writing/academic_writing/logic_in_argumentative_writing/fallacies.html)
- [Federal Rules of Evidence](https://www.law.cornell.edu/rules/fre)
- [Scientific Method Standards](https://www.nature.com/articles/d41586-019-03930-3)
