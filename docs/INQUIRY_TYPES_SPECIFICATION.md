# Inquiry Types Specification

## Executive Summary

This document formalizes the inquiry type system for Project Rabbit Hole, providing structured, transparent evaluation processes for different types of evidence-based investigations. Each inquiry type includes step-by-step workflows with AI-guided critical evaluation.

---

## Current State Analysis

### What We Have

1. **Methodologies System** (`MethodologyResolver.ts`):
   - Scientific Method
   - Legal Discovery
   - Toulmin Argumentation
   - Node/Edge type definitions
   - Workflow management
   - Template application

2. **Basic Inquiry System** (`InquiryResolver.ts`):
   - Simple question/answer threads
   - Status tracking (open, answered, resolved, challenged)
   - Hierarchical replies
   - Node/Edge targeting

3. **AI Assistant** (`AIAssistantResolver.ts`):
   - Basic question answering
   - Inconsistency detection
   - Evidence suggestions
   - Conversation management

### Critical Gaps

1. **No Formal Inquiry Process Types**:
   - Missing structured inquiry workflows beyond basic methodologies
   - No evaluation criteria per inquiry type
   - No step-by-step validation

2. **Missing Evidence Evaluation Framework**:
   - No admissibility criteria
   - No primary vs secondary source determination
   - No chain of custody tracking
   - No authentication protocols

3. **No Argument Analysis Framework**:
   - No logical fallacy detection
   - No argument structure validation
   - No burden of proof tracking
   - No premise/conclusion mapping

4. **Limited AI Integration**:
   - AI doesn't guide through formal processes
   - No step-by-step critical evaluation
   - No structured questioning

5. **No Data Analysis Framework**:
   - No statistical methodology validation
   - No data quality assessment
   - No reproducibility tracking

---

## Proposed Inquiry Type System

### 1. Evidence Admissibility Inquiry

**Purpose**: Determine if evidence meets standards for inclusion in Level 0 (immutable truth layer)

**Steps**:
1. **Source Identification**
   - Who created the evidence?
   - When was it created?
   - What is the provenance?

   *AI Evaluation*: Verify source exists, check for conflicts of interest, assess credibility history

2. **Authenticity Verification**
   - Is the evidence genuine?
   - Has it been altered?
   - Chain of custody documented?

   *AI Evaluation*: Check for manipulation markers, verify digital signatures, analyze metadata

3. **Relevance Assessment**
   - Does it directly relate to the claim?
   - Is it material to the inquiry?
   - Does it meet temporal requirements?

   *AI Evaluation*: Analyze logical connection to claim, assess probative value

4. **Reliability Evaluation**
   - Is the source credible?
   - Are there corroborating sources?
   - Are there contradicting sources?

   *AI Evaluation*: Cross-reference with other evidence, identify biases, assess methodology

5. **Final Admissibility Determination**
   - Score: 0.0-1.0 (admissibility threshold)
   - Rationale with citations
   - Conditions for admission

### 2. Primary vs Secondary Source Classification

**Purpose**: Classify evidence by proximity to the event

**Steps**:
1. **Temporal Analysis**
   - When was source created relative to event?
   - Was creator present during event?

   *AI Evaluation*: Timeline analysis, presence verification

2. **Creator Analysis**
   - Is creator an eyewitness or participant?
   - Or is creator reporting from other sources?

   *AI Evaluation*: Relationship mapping, citation analysis

3. **Intermediation Assessment**
   - How many degrees of separation from event?
   - What interpretations/filters have been applied?

   *AI Evaluation*: Chain analysis, bias detection

4. **Source Type Classification**
   - Primary: Direct, unfiltered evidence
   - Secondary: Analysis/interpretation of primary
   - Tertiary: Synthesis of secondary sources

5. **Confidence Score**
   - Classification confidence: 0.0-1.0
   - Supporting evidence
   - Dissenting evidence

### 3. Logical Argument Analysis

**Purpose**: Evaluate structure and validity of arguments

**Argument Types to Detect**:
- Deductive (syllogism, modus ponens, modus tollens)
- Inductive (generalization, analogy, causation)
- Abductive (inference to best explanation)

**Fallacy Types to Detect**:
- **Formal Fallacies**: Affirming the consequent, denying the antecedent, undistributed middle
- **Informal Fallacies**:
  - Ad Hominem (attacking person not argument)
  - Straw Man (misrepresenting argument)
  - False Dichotomy (false either/or)
  - Slippery Slope (unfounded chain reaction)
  - Circular Reasoning (assuming conclusion)
  - Appeal to Authority (inappropriate)
  - Appeal to Emotion
  - Red Herring (distraction)
  - Post Hoc Ergo Propter Hoc (false causation)
  - Hasty Generalization
  - Cherry Picking

**Steps**:
1. **Argument Identification**
   - Extract premises
   - Extract conclusion
   - Identify reasoning type

   *AI Evaluation*: Natural language processing, logical structure extraction

2. **Premise Evaluation**
   - Are premises true/supported?
   - Are premises relevant?
   - Are premises sufficient?

   *AI Evaluation*: Fact-check premises, assess evidentiary support

3. **Logical Structure Analysis**
   - Does conclusion follow from premises?
   - Identify logical form
   - Check for formal fallacies

   *AI Evaluation*: Symbolic logic translation, validity checking

4. **Informal Fallacy Scan**
   - Scan for each fallacy type
   - Identify rhetorical tricks
   - Assess emotional appeals

   *AI Evaluation*: Pattern matching, context analysis

5. **Strength Assessment**
   - Valid/Invalid (deductive)
   - Strong/Weak (inductive)
   - Plausible/Implausible (abductive)
   - Fallacy-free score: 0.0-1.0

6. **Improvement Suggestions**
   - How to strengthen argument
   - Additional evidence needed
   - Logical repairs needed

### 4. Scientific Method Inquiry (Enhanced)

**Purpose**: Rigorously test hypotheses through empirical investigation

**Steps**:
1. **Observation & Question**
   - What phenomenon is being studied?
   - What specific question is being asked?

   *AI Evaluation*: Assess question clarity, testability, novelty

2. **Background Research**
   - What prior research exists?
   - What theories are relevant?
   - What is the current state of knowledge?

   *AI Evaluation*: Literature search, gap analysis, citation recommendations

3. **Hypothesis Formation**
   - Clear, testable prediction
   - Variables identified (independent, dependent, controlled)
   - Expected outcome stated

   *AI Evaluation*: Check falsifiability, assess clarity, identify confounds

4. **Experiment Design**
   - Methodology described
   - Sample size justified
   - Controls identified
   - Measurement methods specified

   *AI Evaluation*: Assess validity (internal/external), check for biases, suggest improvements

5. **Data Collection**
   - Data gathering protocol
   - Raw data documentation
   - Anomalies noted

   *AI Evaluation*: Check for data quality issues, missing data, outliers

6. **Statistical Analysis**
   - Appropriate statistical tests
   - Significance levels
   - Effect sizes
   - Confidence intervals

   *AI Evaluation*: Verify test appropriateness, check assumptions, validate calculations

7. **Interpretation**
   - Do results support hypothesis?
   - Alternative explanations?
   - Limitations acknowledged?

   *AI Evaluation*: Check for overinterpretation, identify alternative explanations

8. **Peer Review**
   - Reproducibility assessment
   - Methodology critique
   - Conclusion validity

   *AI Evaluation*: Reproducibility checklist, methodology standards check

9. **Final Veracity Score**
   - 0.0-1.0 based on evidence strength
   - Confidence intervals
   - Conditions and limitations

### 5. Legal Discovery Inquiry (Enhanced)

**Purpose**: Systematic evidence gathering following legal standards

**Steps**:
1. **Identification**
   - Scope definition
   - Custodian identification
   - Data sources mapped

   *AI Evaluation*: Completeness check, relevance assessment

2. **Preservation**
   - Legal hold implemented
   - Chain of custody established
   - Integrity verification (hashes)

   *AI Evaluation*: Verify preservation standards, check for spoliation risk

3. **Collection**
   - Forensically sound methods
   - Metadata preserved
   - Documentation complete

   *AI Evaluation*: Assess collection methodology, identify gaps

4. **Processing & Review**
   - Duplicates removed
   - Relevance filtering
   - Privilege review

   *AI Evaluation*: Check for over-collection, identify privilege issues

5. **Analysis**
   - Timeline construction
   - Relationship mapping
   - Key evidence identification

   *AI Evaluation*: Identify inconsistencies, suggest follow-up questions

6. **Admissibility Evaluation**
   - Hearsay analysis
   - Authentication assessment
   - Relevance/materiality check
   - Prejudice vs probative value

   *AI Evaluation*: Apply evidentiary rules, flag admissibility issues

7. **Production Decision**
   - Responsive/non-responsive determination
   - Redaction requirements
   - Production format

   *AI Evaluation*: Completeness verification

### 6. Data Analysis Inquiry

**Purpose**: Evaluate data-driven claims and statistical arguments

**Steps**:
1. **Data Source Evaluation**
   - Where did data come from?
   - How was it collected?
   - What is the sample size?
   - Is the sample representative?

   *AI Evaluation*: Assess sampling methodology, check for selection bias

2. **Data Quality Assessment**
   - Missing data percentage
   - Outlier detection
   - Data consistency checks
   - Measurement reliability

   *AI Evaluation*: Run quality checks, identify problematic patterns

3. **Methodology Validation**
   - Are statistical tests appropriate?
   - Are assumptions met?
   - Is the analysis plan pre-registered?
   - P-hacking risks?

   *AI Evaluation*: Check statistical power, validate test selection

4. **Results Interpretation**
   - Statistical significance vs practical significance
   - Effect sizes reported?
   - Confidence intervals provided?
   - Correlation vs causation

   *AI Evaluation*: Check for overinterpretation, identify confounds

5. **Reproducibility**
   - Raw data available?
   - Code/scripts provided?
   - Analysis documented?
   - Can results be replicated?

   *AI Evaluation*: Reproducibility checklist

6. **Transparency**
   - Conflicts of interest disclosed?
   - Funding sources disclosed?
   - Negative results reported?

   *AI Evaluation*: Transparency scorecard

### 7. Toulmin Argumentation Inquiry (Enhanced)

**Purpose**: Structured argument construction and evaluation

**Components**:
1. **Claim**
   - Central assertion being made
   - Clear and specific?

   *AI Evaluation*: Assess clarity, scope, falsifiability

2. **Grounds (Data)**
   - Evidence supporting the claim
   - Sufficient? Reliable? Relevant?

   *AI Evaluation*: Evidence quality assessment, source verification

3. **Warrant**
   - Reasoning linking grounds to claim
   - Logical? Valid?

   *AI Evaluation*: Logical structure analysis, gap identification

4. **Backing**
   - Support for the warrant
   - Theoretical foundation? Prior precedent?

   *AI Evaluation*: Check authority, assess relevance

5. **Qualifier**
   - Strength of claim (always, probably, generally)
   - Appropriate given evidence?

   *AI Evaluation*: Assess if qualifier matches evidence strength

6. **Rebuttal**
   - Conditions under which claim doesn't hold
   - Counterarguments addressed?

   *AI Evaluation*: Identify unaddressed counterarguments

7. **Argument Strength Score**
   - Overall coherence: 0.0-1.0
   - Weakest component identified
   - Improvement recommendations

### 8. Historical Source Criticism

**Purpose**: Evaluate historical evidence reliability

**Steps**:
1. **External Criticism** (Authenticity)
   - Is document genuine or forgery?
   - Has it been altered?
   - Date verification

   *AI Evaluation*: Anachronism detection, stylistic analysis

2. **Internal Criticism** (Reliability)
   - Was author in position to know?
   - What was author's purpose?
   - Bias detection
   - Corroboration check

   *AI Evaluation*: Cross-reference with contemporary sources, bias analysis

3. **Contextualization**
   - Historical context understood?
   - Language/terminology appropriate?
   - Cultural factors considered?

   *AI Evaluation*: Provide historical context, flag presentism

4. **Reliability Score**
   - Authenticity: 0.0-1.0
   - Reliability: 0.0-1.0
   - Overall trustworthiness

---

## Database Schema Extensions

### New Tables Required

```sql
-- Inquiry Types with formal processes
CREATE TABLE "InquiryTypes" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- evidence, argument, scientific, legal, data, historical
  workflow_steps JSONB NOT NULL, -- Step-by-step process
  ai_evaluation_prompts JSONB, -- AI prompts for each step
  required_fields JSONB, -- Required data fields per step
  validation_rules JSONB, -- Validation criteria
  scoring_rubric JSONB, -- How to calculate final score
  icon VARCHAR(50),
  color VARCHAR(50),
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Formal inquiry instances
CREATE TABLE "FormalInquiries" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_type_id UUID REFERENCES "InquiryTypes"(id),
  target_node_id UUID REFERENCES "Nodes"(id),
  target_edge_id UUID REFERENCES "Edges"(id),
  user_id UUID REFERENCES "Users"(id),
  title VARCHAR(500),
  description TEXT,
  current_step INT DEFAULT 0,
  steps_completed JSONB DEFAULT '[]', -- Array of completed step objects
  step_data JSONB DEFAULT '{}', -- Data collected at each step
  ai_evaluations JSONB DEFAULT '{}', -- AI analysis per step
  final_score DECIMAL(3,2), -- 0.00 to 1.00
  final_determination TEXT,
  status VARCHAR(50) DEFAULT 'in_progress',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Argument components (for logical analysis)
CREATE TABLE "Arguments" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formal_inquiry_id UUID REFERENCES "FormalInquiries"(id),
  argument_type VARCHAR(50), -- deductive, inductive, abductive
  premises JSONB NOT NULL, -- Array of premise objects
  conclusion TEXT NOT NULL,
  logical_form TEXT,
  detected_fallacies JSONB, -- Array of detected fallacy objects
  validity_score DECIMAL(3,2),
  soundness_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Evidence chain tracking
CREATE TABLE "EvidenceChain" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id UUID REFERENCES "Nodes"(id),
  derived_from_id UUID REFERENCES "EvidenceChain"(id), -- For tracking derivation chain
  chain_level INT DEFAULT 0, -- 0 = primary, 1 = secondary, 2 = tertiary
  classification VARCHAR(50), -- primary, secondary, tertiary
  classification_confidence DECIMAL(3,2),
  custodian VARCHAR(200),
  collection_date TIMESTAMP,
  authentication_method TEXT,
  integrity_hash VARCHAR(255), -- SHA-256 of content
  created_by UUID REFERENCES "Users"(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## AI Integration Specification

### AI Evaluation Service Extension

```typescript
interface AIInquiryEvaluationService {
  // Evaluate current step in inquiry
  evaluateStep(
    inquiryId: string,
    stepNumber: number,
    stepData: Record<string, any>
  ): Promise<StepEvaluation>;

  // Suggest next actions
  suggestNextSteps(
    inquiryId: string
  ): Promise<string[]>;

  // Detect logical fallacies
  detectFallacies(
    argument: string
  ): Promise<Fallacy[]>;

  // Evaluate evidence admissibility
  evaluateAdmissibility(
    evidenceNodeId: string
  ): Promise<AdmissibilityScore>;

  // Classify source type
  classifySource(
    nodeId: string
  ): Promise<SourceClassification>;

  // Assess data quality
  assessDataQuality(
    dataset: any
  ): Promise<DataQualityReport>;

  // Guide user through inquiry
  provideGuidance(
    inquiryId: string,
    userQuestion: string
  ): Promise<string>;
}
```

### AI Prompts Per Inquiry Type

Each step in each inquiry type needs carefully crafted AI prompts that:
1. **Ask critical questions**
2. **Identify weaknesses**
3. **Suggest improvements**
4. **Provide relevant examples**
5. **Reference standards/criteria**

---

## Implementation Priority

### Phase 1: Core Evidence Framework (Weeks 1-2)
- [ ] Create InquiryTypes table and seed basic types
- [ ] Implement Evidence Admissibility inquiry type
- [ ] Implement Primary/Secondary Source classification
- [ ] Build FormalInquiries table
- [ ] Create basic AI evaluation service

### Phase 2: Argument Analysis (Weeks 3-4)
- [ ] Implement Logical Argument Analysis inquiry
- [ ] Create Arguments table
- [ ] Build fallacy detection system
- [ ] Integrate argument visualization

### Phase 3: Enhanced Methodologies (Weeks 5-6)
- [ ] Enhance Scientific Method inquiry
- [ ] Enhance Legal Discovery inquiry
- [ ] Implement Data Analysis inquiry
- [ ] Create EvidenceChain table

### Phase 4: Historical & Specialized (Weeks 7-8)
- [ ] Implement Historical Source Criticism
- [ ] Enhanced Toulmin Argumentation
- [ ] Create inquiry templates library
- [ ] Build inquiry recommendation engine

### Phase 5: AI Integration & UX (Weeks 9-10)
- [ ] Comprehensive AI prompts for all types
- [ ] Step-by-step guided workflows
- [ ] Progress visualization
- [ ] Final scoring dashboards
- [ ] Export/reporting features

---

## Success Metrics

1. **Adoption**: Number of formal inquiries created
2. **Completion Rate**: % of inquiries completed through all steps
3. **Quality**: Average final scores per inquiry type
4. **AI Effectiveness**: User satisfaction with AI guidance
5. **Evidence Promotion**: % of Level 1 nodes promoted to Level 0
6. **Fallacy Detection**: Number of fallacies identified and corrected

---

## Next Steps

1. **Review & Approval**: Stakeholder review of specification
2. **Database Migration**: Create new tables
3. **Seed Data**: Populate InquiryTypes with definitions
4. **Backend Implementation**: Build resolvers and services
5. **Frontend Components**: Build inquiry workflow UI
6. **AI Prompt Engineering**: Craft evaluation prompts
7. **Testing & Iteration**: User testing and refinement
