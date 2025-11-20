import { Pool } from 'pg';
import { ConversationalAIService } from './ConversationalAIService';

/**
 * Evidence item for AI evaluation
 */
export interface Evidence {
  id?: string;
  type: string;
  url?: string;
  content: string;
  source?: string;
  dateCreated?: Date;
}

/**
 * Inquiry position for evaluation
 */
export interface InquiryPosition {
  id?: string;
  stance: 'supporting' | 'opposing' | 'neutral';
  argument: string;
  evidence: Evidence[];
  inquiryType: string;
}

/**
 * AI evaluation result
 */
export interface EvaluationResult {
  evidenceQualityScore: number;  // 0.0-1.0
  coherenceScore: number;        // 0.0-1.0
  overallScore: number;          // 0.0-1.0
  strengths: string[];           // What makes this position strong
  weaknesses: string[];          // What makes this position weak
  suggestions: string[];         // How to improve credibility
}

/**
 * AIEvaluationService
 *
 * Provides type-specific AI evaluation for each of the 12 inquiry types.
 * Each inquiry type has custom evaluation criteria tailored to its domain.
 *
 * Challenge Types (7):
 * - factual_accuracy: Verify claims against primary sources
 * - logical_fallacy: Detect reasoning errors
 * - missing_context: Identify omitted information
 * - source_reliability: Assess source credibility
 * - bias_detection: Identify framing bias
 * - statistical_validity: Check methodology
 * - causal_relationship: Evaluate causation vs correlation
 *
 * Inquiry Types (5):
 * - scientific_inquiry: Assess hypothesis and methodology
 * - historical_interpretation: Evaluate sources and context
 * - legal_analysis: Check precedent and reasoning
 * - ethical_evaluation: Assess moral frameworks
 * - definition_dispute: Clarify terminology
 */
export class AIEvaluationService {
  constructor(
    private pool: Pool,
    private aiService: ConversationalAIService
  ) {}

  /**
   * Main evaluation entry point - routes to type-specific evaluator
   *
   * @param position - Position to evaluate
   * @returns Evaluation result with scores and feedback
   */
  async evaluatePosition(position: InquiryPosition): Promise<EvaluationResult> {
    const inquiryType = position.inquiryType;

    switch (inquiryType) {
      // Challenge Types (7)
      case 'factual_accuracy':
        return this.evaluateFactualAccuracy(position);
      case 'logical_fallacy':
        return this.evaluateLogicalFallacy(position);
      case 'missing_context':
        return this.evaluateMissingContext(position);
      case 'source_reliability':
        return this.evaluateSourceReliability(position);
      case 'bias_detection':
        return this.evaluateBiasDetection(position);
      case 'statistical_validity':
        return this.evaluateStatisticalValidity(position);
      case 'causal_relationship':
        return this.evaluateCausalRelationship(position);

      // Inquiry Types (5)
      case 'scientific_inquiry':
        return this.evaluateScientificInquiry(position);
      case 'historical_interpretation':
        return this.evaluateHistoricalInterpretation(position);
      case 'legal_analysis':
        return this.evaluateLegalAnalysis(position);
      case 'ethical_evaluation':
        return this.evaluateEthicalEvaluation(position);
      case 'definition_dispute':
        return this.evaluateDefinitionDispute(position);

      default:
        // Generic evaluation for unknown types
        return this.evaluateGeneric(position);
    }
  }

  // =========================================================================
  // CHALLENGE TYPES (7)
  // =========================================================================

  /**
   * Evaluate Factual Accuracy Challenge
   *
   * Criteria:
   * - Primary source verification (40%)
   * - Cross-reference check (30%)
   * - Temporal relevance (15%)
   * - Expert consensus (15%)
   */
  private async evaluateFactualAccuracy(position: InquiryPosition): Promise<EvaluationResult> {
    const prompt = `Evaluate this factual accuracy challenge:

Argument: ${position.argument}
Stance: ${position.stance}
Evidence Count: ${position.evidence.length}

Evaluate based on:
1. PRIMARY SOURCE VERIFICATION (40%): Are primary sources provided and credible?
2. CROSS-REFERENCE CHECK (30%): Are claims independently verified by multiple sources?
3. TEMPORAL RELEVANCE (15%): Are sources recent and relevant to the time period?
4. EXPERT CONSENSUS (15%): Do domain experts agree with this assessment?

For each criterion, score 0.0-1.0 and explain.

Evidence provided:
${position.evidence.map((e, i) => `${i + 1}. ${e.type}: ${e.content.substring(0, 200)}...`).join('\n')}

Return JSON:
{
  "primarySourceScore": 0.0-1.0,
  "crossReferenceScore": 0.0-1.0,
  "temporalRelevanceScore": 0.0-1.0,
  "expertConsensusScore": 0.0-1.0,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestions": ["..."]
}`;

    const response = await this.aiService.chat(prompt, 'inquiry-evaluation');
    const result = this.parseJSONResponse(response);

    const evidenceQualityScore = (
      (result.primarySourceScore || 0.5) * 0.40 +
      (result.crossReferenceScore || 0.5) * 0.30 +
      (result.temporalRelevanceScore || 0.5) * 0.15 +
      (result.expertConsensusScore || 0.5) * 0.15
    );

    const coherenceScore = await this.evaluateCoherence(position.argument);

    return {
      evidenceQualityScore: Math.min(1.0, Math.max(0.0, evidenceQualityScore)),
      coherenceScore,
      overallScore: (evidenceQualityScore + coherenceScore) / 2,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      suggestions: result.suggestions || []
    };
  }

  /**
   * Evaluate Logical Fallacy Challenge
   *
   * Criteria:
   * - Fallacy identification accuracy (40%)
   * - Explanation clarity (30%)
   * - Counter-examples provided (20%)
   * - Logical structure (10%)
   */
  private async evaluateLogicalFallacy(position: InquiryPosition): Promise<EvaluationResult> {
    const prompt = `Evaluate this logical fallacy challenge:

Argument: ${position.argument}
Stance: ${position.stance}

Evaluate based on:
1. FALLACY IDENTIFICATION (40%): Is the identified fallacy correctly named and explained?
   Common fallacies: ad hominem, straw man, false dilemma, slippery slope, appeal to authority, etc.
2. EXPLANATION CLARITY (30%): Is the explanation of why this is a fallacy clear and convincing?
3. COUNTER-EXAMPLES (20%): Are counter-examples or correct reasoning provided?
4. LOGICAL STRUCTURE (10%): Is the argument itself logically structured?

Return JSON:
{
  "fallacyIdentificationScore": 0.0-1.0,
  "explanationClarityScore": 0.0-1.0,
  "counterExamplesScore": 0.0-1.0,
  "logicalStructureScore": 0.0-1.0,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestions": ["..."]
}`;

    const response = await this.aiService.chat(prompt, 'inquiry-evaluation');
    const result = this.parseJSONResponse(response);

    const evidenceQualityScore = (
      (result.fallacyIdentificationScore || 0.5) * 0.40 +
      (result.explanationClarityScore || 0.5) * 0.30 +
      (result.counterExamplesScore || 0.5) * 0.20 +
      (result.logicalStructureScore || 0.5) * 0.10
    );

    const coherenceScore = await this.evaluateCoherence(position.argument);

    return {
      evidenceQualityScore,
      coherenceScore,
      overallScore: (evidenceQualityScore + coherenceScore) / 2,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      suggestions: result.suggestions || []
    };
  }

  /**
   * Evaluate Missing Context Challenge
   *
   * Criteria:
   * - Context identification (35%)
   * - Relevance of omitted info (35%)
   * - Sources for context (20%)
   * - Impact assessment (10%)
   */
  private async evaluateMissingContext(position: InquiryPosition): Promise<EvaluationResult> {
    const prompt = `Evaluate this missing context challenge:

Argument: ${position.argument}
Evidence: ${position.evidence.map(e => e.content).join(' | ')}

Evaluate based on:
1. CONTEXT IDENTIFICATION (35%): What context is claimed to be missing, and is it clearly identified?
2. RELEVANCE (35%): Is the allegedly missing context actually relevant and significant?
3. SOURCES (20%): Are sources provided to support the claim that this context exists?
4. IMPACT ASSESSMENT (10%): Does the analysis explain how this missing context changes interpretation?

Return JSON with scores 0.0-1.0 for each criterion and feedback.`;

    const response = await this.aiService.chat(prompt, 'inquiry-evaluation');
    const result = this.parseJSONResponse(response);

    const evidenceQualityScore = (
      (result.contextIdentificationScore || 0.5) * 0.35 +
      (result.relevanceScore || 0.5) * 0.35 +
      (result.sourcesScore || 0.5) * 0.20 +
      (result.impactAssessmentScore || 0.5) * 0.10
    );

    const coherenceScore = await this.evaluateCoherence(position.argument);

    return {
      evidenceQualityScore,
      coherenceScore,
      overallScore: (evidenceQualityScore + coherenceScore) / 2,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      suggestions: result.suggestions || []
    };
  }

  /**
   * Evaluate Source Reliability Challenge
   *
   * Criteria:
   * - Track record analysis (40%)
   * - Bias assessment (30%)
   * - Cross-referencing (20%)
   * - Expertise verification (10%)
   */
  private async evaluateSourceReliability(position: InquiryPosition): Promise<EvaluationResult> {
    const prompt = `Evaluate this source reliability challenge:

Argument: ${position.argument}
Evidence: ${position.evidence.map(e => `${e.type}: ${e.source || e.url}`).join(' | ')}

Evaluate based on:
1. TRACK RECORD (40%): Does the challenge provide evidence of the source's past accuracy/inaccuracy?
2. BIAS ASSESSMENT (30%): Is potential bias identified and explained with examples?
3. CROSS-REFERENCING (20%): Are alternative sources compared for verification?
4. EXPERTISE VERIFICATION (10%): Is the source's domain expertise evaluated?

Return JSON with scores and feedback.`;

    const response = await this.aiService.chat(prompt, 'inquiry-evaluation');
    const result = this.parseJSONResponse(response);

    const evidenceQualityScore = (
      (result.trackRecordScore || 0.5) * 0.40 +
      (result.biasAssessmentScore || 0.5) * 0.30 +
      (result.crossReferencingScore || 0.5) * 0.20 +
      (result.expertiseVerificationScore || 0.5) * 0.10
    );

    const coherenceScore = await this.evaluateCoherence(position.argument);

    return {
      evidenceQualityScore,
      coherenceScore,
      overallScore: (evidenceQualityScore + coherenceScore) / 2,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      suggestions: result.suggestions || []
    };
  }

  /**
   * Evaluate Bias Detection Challenge
   *
   * Criteria:
   * - Bias type identification (30%)
   * - Language analysis (30%)
   * - Frame comparison (25%)
   * - Evidence of bias (15%)
   */
  private async evaluateBiasDetection(position: InquiryPosition): Promise<EvaluationResult> {
    const prompt = `Evaluate this bias detection challenge:

Argument: ${position.argument}

Evaluate based on:
1. BIAS TYPE (30%): Is the type of bias clearly identified (framing, selection, language, etc.)?
2. LANGUAGE ANALYSIS (30%): Are biased words/phrases identified with neutral alternatives?
3. FRAME COMPARISON (25%): Is the biased framing compared to alternative frames?
4. EVIDENCE (15%): Is there concrete evidence showing the bias?

Types of bias to consider:
- Framing bias (how story is presented)
- Selection bias (what facts are included/excluded)
- Language bias (loaded words, emotional appeals)
- Source bias (who is quoted, who is ignored)

Return JSON with scores and feedback.`;

    const response = await this.aiService.chat(prompt, 'inquiry-evaluation');
    const result = this.parseJSONResponse(response);

    const evidenceQualityScore = (
      (result.biasTypeScore || 0.5) * 0.30 +
      (result.languageAnalysisScore || 0.5) * 0.30 +
      (result.frameComparisonScore || 0.5) * 0.25 +
      (result.evidenceScore || 0.5) * 0.15
    );

    const coherenceScore = await this.evaluateCoherence(position.argument);

    return {
      evidenceQualityScore,
      coherenceScore,
      overallScore: (evidenceQualityScore + coherenceScore) / 2,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      suggestions: result.suggestions || []
    };
  }

  /**
   * Evaluate Statistical Validity Challenge
   *
   * Criteria:
   * - Methodology assessment (35%)
   * - Sample size evaluation (25%)
   * - Statistical significance (25%)
   * - Replication/peer review (15%)
   */
  private async evaluateStatisticalValidity(position: InquiryPosition): Promise<EvaluationResult> {
    const prompt = `Evaluate this statistical validity challenge:

Argument: ${position.argument}
Evidence: ${position.evidence.map(e => e.content).join(' | ')}

Evaluate based on:
1. METHODOLOGY (35%): Is the research methodology sound and appropriate?
2. SAMPLE SIZE (25%): Is the sample size adequate for the claims made?
3. STATISTICAL SIGNIFICANCE (25%): Are p-values, confidence intervals, and effect sizes reported and appropriate?
4. REPLICATION (15%): Is there evidence of peer review or independent replication?

Common issues to check:
- Confounding variables not controlled
- Correlation presented as causation
- Cherry-picked data
- Inappropriate statistical tests
- Lack of control group

Return JSON with scores and feedback.`;

    const response = await this.aiService.chat(prompt, 'inquiry-evaluation');
    const result = this.parseJSONResponse(response);

    const evidenceQualityScore = (
      (result.methodologyScore || 0.5) * 0.35 +
      (result.sampleSizeScore || 0.5) * 0.25 +
      (result.statisticalSignificanceScore || 0.5) * 0.25 +
      (result.replicationScore || 0.5) * 0.15
    );

    const coherenceScore = await this.evaluateCoherence(position.argument);

    return {
      evidenceQualityScore,
      coherenceScore,
      overallScore: (evidenceQualityScore + coherenceScore) / 2,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      suggestions: result.suggestions || []
    };
  }

  /**
   * Evaluate Causal Relationship Challenge
   *
   * Criteria:
   * - Causation evidence (40%)
   * - Confounding factors (30%)
   * - Mechanism explanation (20%)
   * - Alternative explanations (10%)
   */
  private async evaluateCausalRelationship(position: InquiryPosition): Promise<EvaluationResult> {
    const prompt = `Evaluate this causal relationship challenge:

Argument: ${position.argument}
Evidence: ${position.evidence.map(e => e.content).join(' | ')}

Evaluate based on:
1. CAUSATION EVIDENCE (40%): Is there evidence of causation (not just correlation)?
   - Temporal precedence (cause before effect)
   - Controlled studies or natural experiments
   - Dose-response relationship
2. CONFOUNDING FACTORS (30%): Are confounding variables identified and addressed?
3. MECHANISM (20%): Is there a plausible mechanism explaining how X causes Y?
4. ALTERNATIVE EXPLANATIONS (10%): Are alternative causal explanations considered and ruled out?

Return JSON with scores and feedback.`;

    const response = await this.aiService.chat(prompt, 'inquiry-evaluation');
    const result = this.parseJSONResponse(response);

    const evidenceQualityScore = (
      (result.causationEvidenceScore || 0.5) * 0.40 +
      (result.confoundingFactorsScore || 0.5) * 0.30 +
      (result.mechanismScore || 0.5) * 0.20 +
      (result.alternativeExplanationsScore || 0.5) * 0.10
    );

    const coherenceScore = await this.evaluateCoherence(position.argument);

    return {
      evidenceQualityScore,
      coherenceScore,
      overallScore: (evidenceQualityScore + coherenceScore) / 2,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      suggestions: result.suggestions || []
    };
  }

  // =========================================================================
  // INQUIRY TYPES (5) - Part 2 in next message due to length
  // =========================================================================

  /**
   * Evaluate Scientific Inquiry
   *
   * Criteria:
   * - Methodology soundness (35%)
   * - Evidence quality (30%)
   * - Reproducibility (20%)
   * - Statistical rigor (15%)
   */
  private async evaluateScientificInquiry(position: InquiryPosition): Promise<EvaluationResult> {
    const prompt = `Evaluate this scientific inquiry position:

Argument: ${position.argument}
Stance: ${position.stance}
Evidence: ${position.evidence.map(e => `${e.type}: ${e.content.substring(0, 150)}`).join(' | ')}

Evaluate based on:
1. METHODOLOGY (35%): Is the research methodology sound, appropriate, and clearly described?
2. EVIDENCE QUALITY (30%): Are peer-reviewed studies or experimental data provided?
3. REPRODUCIBILITY (20%): Can the results be independently replicated?
4. STATISTICAL RIGOR (15%): Are statistical methods appropriate and properly applied?

Return JSON with scores 0.0-1.0 and feedback.`;

    const response = await this.aiService.chat(prompt, 'inquiry-evaluation');
    const result = this.parseJSONResponse(response);

    const evidenceQualityScore = (
      (result.methodologyScore || 0.5) * 0.35 +
      (result.evidenceQualityScore || 0.5) * 0.30 +
      (result.reproducibilityScore || 0.5) * 0.20 +
      (result.statisticalRigorScore || 0.5) * 0.15
    );

    const coherenceScore = await this.evaluateCoherence(position.argument);

    return {
      evidenceQualityScore,
      coherenceScore,
      overallScore: (evidenceQualityScore + coherenceScore) / 2,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      suggestions: result.suggestions || []
    };
  }

  /**
   * Evaluate Historical Interpretation
   *
   * Criteria:
   * - Primary source usage (30%)
   * - Scholarly consensus (25%)
   * - Contextual understanding (25%)
   * - Historiographic awareness (20%)
   */
  private async evaluateHistoricalInterpretation(position: InquiryPosition): Promise<EvaluationResult> {
    const prompt = `Evaluate this historical interpretation position:

Argument: ${position.argument}
Evidence: ${position.evidence.map(e => `${e.type}: ${e.content.substring(0, 150)}`).join(' | ')}

Evaluate based on:
1. PRIMARY SOURCES (30%): Are primary historical sources cited and analyzed?
2. SCHOLARLY CONSENSUS (25%): Does the interpretation align with or thoughtfully challenge scholarly consensus?
3. CONTEXTUAL UNDERSTANDING (25%): Is the historical context (political, social, economic) properly understood?
4. HISTORIOGRAPHIC AWARENESS (20%): Does the position show awareness of how interpretations have evolved?

Return JSON with scores 0.0-1.0 and feedback.`;

    const response = await this.aiService.chat(prompt, 'inquiry-evaluation');
    const result = this.parseJSONResponse(response);

    const evidenceQualityScore = (
      (result.primarySourcesScore || 0.5) * 0.30 +
      (result.scholarlyConsensusScore || 0.5) * 0.25 +
      (result.contextualUnderstandingScore || 0.5) * 0.25 +
      (result.historiographicAwarenessScore || 0.5) * 0.20
    );

    const coherenceScore = await this.evaluateCoherence(position.argument);

    return {
      evidenceQualityScore,
      coherenceScore,
      overallScore: (evidenceQualityScore + coherenceScore) / 2,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      suggestions: result.suggestions || []
    };
  }

  /**
   * Evaluate Legal Analysis
   *
   * Criteria:
   * - Precedent citation (35%)
   * - Statutory interpretation (30%)
   * - Legal reasoning (25%)
   * - Procedural correctness (10%)
   */
  private async evaluateLegalAnalysis(position: InquiryPosition): Promise<EvaluationResult> {
    const prompt = `Evaluate this legal analysis position:

Argument: ${position.argument}
Evidence: ${position.evidence.map(e => `${e.type}: ${e.content.substring(0, 150)}`).join(' | ')}

Evaluate based on:
1. PRECEDENT CITATION (35%): Are relevant case precedents cited and distinguished?
2. STATUTORY INTERPRETATION (30%): Is statutory language analyzed and interpreted correctly?
3. LEGAL REASONING (25%): Is the legal reasoning sound and persuasive?
4. PROCEDURAL CORRECTNESS (10%): Are procedural rules and standards properly applied?

Return JSON with scores 0.0-1.0 and feedback.`;

    const response = await this.aiService.chat(prompt, 'inquiry-evaluation');
    const result = this.parseJSONResponse(response);

    const evidenceQualityScore = (
      (result.precedentCitationScore || 0.5) * 0.35 +
      (result.statutoryInterpretationScore || 0.5) * 0.30 +
      (result.legalReasoningScore || 0.5) * 0.25 +
      (result.proceduralCorrectnessScore || 0.5) * 0.10
    );

    const coherenceScore = await this.evaluateCoherence(position.argument);

    return {
      evidenceQualityScore,
      coherenceScore,
      overallScore: (evidenceQualityScore + coherenceScore) / 2,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      suggestions: result.suggestions || []
    };
  }

  /**
   * Evaluate Ethical Evaluation
   *
   * Criteria:
   * - Moral framework clarity (30%)
   * - Consistency of reasoning (30%)
   * - Consequences consideration (25%)
   * - Stakeholder analysis (15%)
   */
  private async evaluateEthicalEvaluation(position: InquiryPosition): Promise<EvaluationResult> {
    const prompt = `Evaluate this ethical evaluation position:

Argument: ${position.argument}
Stance: ${position.stance}

Evaluate based on:
1. MORAL FRAMEWORK (30%): Is the ethical framework (utilitarian, deontological, virtue ethics, etc.) clearly stated?
2. CONSISTENCY (30%): Is the reasoning internally consistent with the stated framework?
3. CONSEQUENCES (25%): Are consequences (harms/benefits) thoroughly considered?
4. STAKEHOLDER ANALYSIS (15%): Are all affected parties and their interests considered?

Common ethical frameworks:
- Utilitarianism (maximize good outcomes)
- Deontology (duty/rules-based)
- Virtue Ethics (character-based)
- Care Ethics (relationships/empathy)
- Rights-based (individual liberties)

Return JSON with scores 0.0-1.0 and feedback.`;

    const response = await this.aiService.chat(prompt, 'inquiry-evaluation');
    const result = this.parseJSONResponse(response);

    const evidenceQualityScore = (
      (result.moralFrameworkScore || 0.5) * 0.30 +
      (result.consistencyScore || 0.5) * 0.30 +
      (result.consequencesScore || 0.5) * 0.25 +
      (result.stakeholderAnalysisScore || 0.5) * 0.15
    );

    const coherenceScore = await this.evaluateCoherence(position.argument);

    return {
      evidenceQualityScore,
      coherenceScore,
      overallScore: (evidenceQualityScore + coherenceScore) / 2,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      suggestions: result.suggestions || []
    };
  }

  /**
   * Evaluate Definition Dispute
   *
   * Criteria:
   * - Authoritative sources (35%)
   * - Usage examples (30%)
   * - Etymology/history (20%)
   * - Domain specificity (15%)
   */
  private async evaluateDefinitionDispute(position: InquiryPosition): Promise<EvaluationResult> {
    const prompt = `Evaluate this definition dispute position:

Argument: ${position.argument}
Evidence: ${position.evidence.map(e => `${e.type}: ${e.content.substring(0, 150)}`).join(' | ')}

Evaluate based on:
1. AUTHORITATIVE SOURCES (35%): Are dictionaries, scholarly works, or domain experts cited?
2. USAGE EXAMPLES (30%): Are real-world usage examples provided to support the definition?
3. ETYMOLOGY/HISTORY (20%): Is the word's origin and evolution explained?
4. DOMAIN SPECIFICITY (15%): Is it clear whether this is a general or domain-specific definition?

Return JSON with scores 0.0-1.0 and feedback.`;

    const response = await this.aiService.chat(prompt, 'inquiry-evaluation');
    const result = this.parseJSONResponse(response);

    const evidenceQualityScore = (
      (result.authoritativeSourcesScore || 0.5) * 0.35 +
      (result.usageExamplesScore || 0.5) * 0.30 +
      (result.etymologyHistoryScore || 0.5) * 0.20 +
      (result.domainSpecificityScore || 0.5) * 0.15
    );

    const coherenceScore = await this.evaluateCoherence(position.argument);

    return {
      evidenceQualityScore,
      coherenceScore,
      overallScore: (evidenceQualityScore + coherenceScore) / 2,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      suggestions: result.suggestions || []
    };
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  /**
   * Evaluate coherence (internal consistency) of an argument
   *
   * @private
   */
  private async evaluateCoherence(argument: string): Promise<number> {
    const prompt = `Evaluate the internal coherence and consistency of this argument:

"${argument}"

Check for:
- Internal contradictions
- Logical flow
- Clarity of reasoning
- Consistent use of terms

Return a single number between 0.0 (incoherent) and 1.0 (perfectly coherent).
Just the number, nothing else.`;

    const response = await this.aiService.chat(prompt, 'coherence-check');
    const score = parseFloat(response.trim());

    return isNaN(score) ? 0.5 : Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Generic evaluation for unknown inquiry types
   *
   * @private
   */
  private async evaluateGeneric(position: InquiryPosition): Promise<EvaluationResult> {
    const prompt = `Evaluate this inquiry position:

Argument: ${position.argument}
Stance: ${position.stance}
Evidence Count: ${position.evidence.length}

Provide:
1. Evidence quality score (0.0-1.0)
2. Coherence score (0.0-1.0)
3. Strengths (list)
4. Weaknesses (list)
5. Suggestions for improvement (list)

Return JSON format.`;

    const response = await this.aiService.chat(prompt, 'inquiry-evaluation');
    const result = this.parseJSONResponse(response);

    return {
      evidenceQualityScore: result.evidenceQualityScore || 0.5,
      coherenceScore: result.coherenceScore || 0.5,
      overallScore: ((result.evidenceQualityScore || 0.5) + (result.coherenceScore || 0.5)) / 2,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      suggestions: result.suggestions || []
    };
  }

  /**
   * Parse JSON response from AI (handles various formats)
   *
   * @private
   */
  private parseJSONResponse(response: string): any {
    try {
      // Try direct JSON parse
      return JSON.parse(response);
    } catch {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = response.match(/```json?\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try finding JSON object
      const objMatch = response.match(/\{[\s\S]*\}/);
      if (objMatch) {
        return JSON.parse(objMatch[0]);
      }

      // Return empty object if parsing fails
      console.warn('Failed to parse AI response as JSON:', response);
      return {};
    }
  }
}
