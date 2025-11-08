# Truth-Seeking Gaps - Quick Reference Guide

## Critical Gaps (Fix First!)

### 1. AI Fact-Checking Not Exposed to API
- **Service**: `AIAssistantService.factCheckClaim()` exists but NOT in GraphQL
- **Impact**: Cannot fact-check claims from frontend
- **Fix**: Create `FactCheckingResolver.ts` 
- **Effort**: 2-4 hours

### 2. Vector Search Not Integrated  
- **Code**: `AIAssistantService.ts:818` TODO comment
- **Impact**: Fact-checking uses text matching, not semantic similarity
- **Fix**: Integrate pgvector + EmbeddingService
- **Effort**: 6-8 hours

### 3. AI Orchestrator Not Implemented
- **File**: `backend/src/services/AIOrchestrator.ts`
- **Status**: 8 agents designed, 0 working
- **Impact**: Cannot validate evidence (FRE), assess sources, etc.
- **Fix**: Implement all 8 agent types
- **Effort**: 2-3 weeks

### 4. GraphRAG Incomplete
- **File**: `backend/src/services/GraphRAGService.ts`
- **Status**: Design only, all methods TODO
- **Impact**: Cannot perform advanced graph reasoning
- **Fix**: Implement vector search + traversal + prompt gen
- **Effort**: 2-3 weeks

### 5. Source Credibility Service Missing
- **Schema**: Exists in database
- **Service**: No calculation logic
- **Impact**: Cannot assess source reliability
- **Fix**: Create `SourceCredibilityService.ts`
- **Effort**: 8-10 hours

## Major Implementation Gaps

| Gap | Service | Status | Impact | Effort |
|-----|---------|--------|--------|--------|
| Expert Verification | None | Missing | Claims unchecked by experts | 2+ weeks |
| Contradiction Detection | Partial | Passive only | No warnings | 1 week |
| Claim Canonicalization | None | Missing | Duplicates scattered | 1-2 weeks |
| Temporal Fact-Checking | None | Missing | Date-based claims unchecked | 1 week |
| Audit Trail | None | Missing | No verification proof | 1 week |
| Consensus Mechanisms | Partial | Basic voting only | No supermajority | 3-4 days |
| Evidence Validation (FRE) | Designed | Agent not used | No legal checks | 1-2 weeks |
| Process Guidance | Implemented | Not exposed | No step-by-step help | 4-6 hours |

## Quick Wins (1 day each)

```
☐ Expose FactCheckClaim to GraphQL
☐ Expose ProcessGuidance to GraphQL  
☐ Create Source Credibility Dashboard
☐ Create Contradiction Search Query
☐ Create Evidence Quality Report
☐ Add AI readiness score to challenges
☐ Expose Counter-Argument generation
☐ Expose Evidence Discovery
```

## Implementation Priority Order

### Phase 1: Foundation (2 weeks)
1. Expose fact-checking API
2. Integrate vector search
3. Build source credibility service
4. Expose process guidance

### Phase 2: Intelligence (3 weeks)
5. Implement evidence validator (FRE)
6. Build expert verification system
7. Add contradiction detection
8. Implement claim canonicalization

### Phase 3: Advanced (3 weeks)
9. Complete GraphRAG
10. Complete AI Orchestrator
11. Add temporal fact-checking
12. Build consensus mechanisms

### Phase 4: Polish (2 weeks)
13. Implement audit trail
14. Add analytics dashboard
15. Batch fact-checking API

## Files to Create/Modify

### New Services to Build
```
backend/src/services/
  ☐ FactCheckingService.ts (new)
  ☐ SourceCredibilityService.ts (new)
  ☐ EvidenceValidationService.ts (new)
  ☐ ExpertVerificationService.ts (new)
  ☐ ContradictionDetectionService.ts (new)
  ☐ ClaimNormalizationService.ts (new)
  ☐ TemporalFactCheckService.ts (new)
  ☐ ConsensusService.ts (new)
  ☐ AuditLogService.ts (new)
```

### New Resolvers to Build
```
backend/src/resolvers/
  ☐ FactCheckingResolver.ts (new)
  ☐ ExpertVerificationResolver.ts (new)
  ☐ ContradictionResolver.ts (new)
  ☐ ConsensusResolver.ts (new)
  ☐ AuditResolver.ts (new)
```

### Services to Complete
```
backend/src/services/
  ✓ AIOrchestrator.ts - Complete all agent implementations
  ✓ GraphRAGService.ts - Implement all TODO methods
  ✓ AIAssistantService.ts - Integrate vector search (line 818)
```

### Resolvers to Update
```
backend/src/resolvers/
  ✓ ChallengeResolver.ts - Add AI readiness checks
  ✓ AIAssistantResolver.ts - Expose missing queries
```

## Database Changes Needed

### New Tables
```sql
ExpertProfiles
ExpertVerifications
ExpertConsensus
ContradictionRecords
ClaimCanonical
FactCheckAuditLog
VerificationTimeline
```

### Schema Additions
```sql
ALTER TABLE "Challenges" ADD COLUMN ai_readiness_score FLOAT;
ALTER TABLE "Challenges" ADD COLUMN evidence_quality_score FLOAT;
ALTER TABLE "Challenges" ADD COLUMN expert_consensus_score FLOAT;
ALTER TABLE "ChallengeEvidence" ADD COLUMN fre_compliance_score FLOAT;
```

## Known TODOs in Code

```
AIAssistantService.ts:818
  TODO: Use vector similarity search when embeddings are available

GraphRAGService.ts (entire file)
  TODO: vectorSearch()
  TODO: traverseGraph()
  TODO: generatePrompt()
  TODO: callLLM()
  TODO: Cache management

AIOrchestrator.ts
  TODO: Implement all agent execution methods

VectorizationWorker.ts
  TODO: Dead letter queue for failed messages

GraphResolver.ts
  TODO: Check user access to graph
  TODO: Include shared graphs
```

## System Integration Map

```
Current State (Disconnected):
┌─────────────────────┐
│   AI Services       │
│  (Not Integrated)   │
├─────────────────────┤
│ Fact-Checking       │─┐
│ GraphRAG            │ │ (Services exist but
│ AI Orchestrator     │ │  not in GraphQL)
│ Source Credibility  │ │
└─────────────────────┘ │
                        │
┌─────────────────────┐ │
│   GraphQL API       │◄┘
│  (Missing Resolvers)│
└─────────────────────┘

Desired State (Connected):
┌─────────────────────┐
│   AI Services       │
│  (Fully Used)       │
├─────────────────────┤
│ Fact-Checking       │─┐
│ GraphRAG            │ │
│ AI Orchestrator     │ │
│ Source Credibility  │ │ (Connected
│ Evidence Validator  │ │  through
│ Expert Verification │ │  GraphQL)
│ Contradiction Detect│ │
└─────────────────────┘ │
                        │
┌─────────────────────┐ │
│   GraphQL API       │◄┘
│  (Full Coverage)    │
└─────────────────────┘
         │
         │
┌─────────────────────┐
│  Frontend App       │
│  (Can use all AI)   │
└─────────────────────┘
```

## Success Metrics

After implementing all recommendations:

| Metric | Current | Target |
|--------|---------|--------|
| AI Services Implemented | 35% | 100% |
| Services Exposed in API | 40% | 100% |
| Fact-checking Capability | Basic text | Semantic + expert |
| Expert Involvement | None | Multi-level |
| Contradiction Detection | Passive | Proactive |
| Audit Trail | None | Complete |
| Claims Fact-Checked per Day | 0 | Unlimited |
| False Claims Prevented | 0% | 70%+ |

## Testing Checklist

### Unit Tests Needed
- FactCheckingService
- SourceCredibilityService
- EvidenceValidationService
- ExpertVerificationService
- ContradictionDetectionService
- ClaimNormalizationService
- ConsensusService
- AuditLogService

### Integration Tests Needed
- AI Orchestrator full workflow
- GraphRAG end-to-end
- Challenge resolution with AI
- Vector search integration
- Expert review workflow

### E2E Tests Needed
- Complete fact-checking flow
- Challenge with expert review
- Contradiction detection & resolution
- Source credibility updating

## Cost-Benefit Analysis

### Quick Wins (Implement First)
- Effort: 1-2 days each
- Benefit: Immediate API exposure
- Examples: Expose fact-check, process guidance, contradiction search

### Medium-Term (Foundation)
- Effort: 1-2 weeks each
- Benefit: Core capabilities
- Examples: Vector search, source credibility, evidence validation

### Long-Term (Intelligence)
- Effort: 2-3 weeks each  
- Benefit: Advanced reasoning
- Examples: GraphRAG, AI Orchestrator, consensus mechanisms

## Risk Mitigation

**High Risk Areas:**
- Incomplete GraphRAG + AI Orchestrator
- Vector search integration
- Expert verification system

**Mitigation:**
- Start with quick wins to build momentum
- Complete one agent type at a time (not all at once)
- Test vector search with small dataset first
- Use stub implementation for experts initially

## Resources & References

- Federal Rules of Evidence: https://www.law.cornell.edu/rules/fre
- Toulmin Model: https://en.wikipedia.org/wiki/Toulmin_model_of_argumentation
- pgvector Documentation: https://github.com/pgvector/pgvector
- Ollama Models: https://ollama.com/library

## Support & Documentation

All recommendations are detailed in:
- **TRUTH_SEEKING_GAPS_ANALYSIS.md** - Comprehensive analysis
- **GAPS_QUICK_REFERENCE.md** - This file

Create issues for each recommendation and track in GitHub projects.
