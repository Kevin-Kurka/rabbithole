import axios from 'axios';
import { Pool } from 'pg';
import { InquiryStatus } from '../entities/Inquiry';

/**
 * Verification result for a claim
 */
export interface VerificationResult {
  claimText: string;
  sourceNodeId: string;
  overallVeracity: number; // 0.0 to 1.0
  confidence: number; // 0.0 to 1.0
  supportingEvidence: Evidence[];
  conflictingEvidence: Evidence[];
  neutralEvidence: Evidence[];
  reasoning: string;
  shouldCreateInquiry: boolean;
  suggestedInquiryQuestions: string[];
  generatedAt: Date;
}

/**
 * Evidence found in the knowledge graph
 */
export interface Evidence {
  nodeId: string;
  nodeTitle: string;
  nodeType?: string;
  content: string;
  veracity?: number;
  sourceReliability: number; // 0.0 to 1.0
  semanticSimilarity: number; // 0.0 to 1.0
  evidenceType: 'supporting' | 'conflicting' | 'neutral';
  relationshipPath?: string[]; // Path from source node to evidence node
  timestamp?: Date;
}

/**
 * Claim analysis request
 */
export interface ClaimAnalysis {
  claim: string;
  context?: string;
  sourceNodeId?: string;
  graphId?: string;
}

/**
 * Semantic search result from pgvector
 */
interface VectorSearchResult {
  id: string;
  title: string;
  node_type?: string;
  props: any;
  meta: any;
  veracity_score?: number;
  similarity: number;
  created_at: Date;
}

/**
 * Ollama API interfaces
 */
interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

/**
 * FactCheckingService
 *
 * Comprehensive fact-checking service that:
 * 1. Verifies claims against database evidence
 * 2. Cross-references sources to find corroborating/conflicting evidence
 * 3. Generates verification reports with supporting/opposing evidence
 * 4. Triggers formal inquiries for unverified claims
 * 5. Updates veracity scores based on verification results
 *
 * Uses Ollama reasoning model for semantic analysis and logical inference.
 */
export class FactCheckingService {
  private ollamaUrl: string;
  private reasoningModel: string;
  private embeddingModel: string;
  private readonly SEMANTIC_SIMILARITY_THRESHOLD = 0.7;
  private readonly HIGH_VERACITY_THRESHOLD = 0.8;
  private readonly LOW_VERACITY_THRESHOLD = 0.4;
  private readonly EVIDENCE_SEARCH_LIMIT = 20;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.reasoningModel = process.env.OLLAMA_MODEL || 'deepseek-r1:1.5b';
    this.embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

    console.log(`FactCheckingService initialized with Ollama at ${this.ollamaUrl}`);
    console.log(`- Reasoning model: ${this.reasoningModel}`);
    console.log(`- Embedding model: ${this.embeddingModel}`);
  }

  /**
   * Call Ollama API with messages
   */
  private async callOllama(messages: OllamaMessage[], maxTokens?: number): Promise<string> {
    try {
      const response = await axios.post<OllamaResponse>(
        `${this.ollamaUrl}/api/chat`,
        {
          model: this.reasoningModel,
          messages,
          stream: false,
          options: {
            temperature: 0.3, // Lower temperature for more deterministic fact-checking
            num_predict: maxTokens || 1500,
          }
        },
        {
          timeout: 90000 // 90 second timeout for complex reasoning
        }
      );

      return response.data.message.content;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Ollama is not running. Please start Ollama with: ollama serve');
        }
        throw new Error(`Ollama API error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate embedding for text using Ollama
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post(
        `${this.ollamaUrl}/api/embeddings`,
        {
          model: this.embeddingModel,
          prompt: text,
        },
        {
          timeout: 30000
        }
      );

      return response.data.embedding;
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        throw new Error('Ollama is not running. Please start Ollama with: ollama serve');
      }
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Search for semantically similar nodes using pgvector
   */
  private async findSimilarNodes(
    pool: Pool,
    claimText: string,
    graphId?: string,
    limit: number = this.EVIDENCE_SEARCH_LIMIT
  ): Promise<VectorSearchResult[]> {
    try {
      // Generate embedding for the claim
      const claimEmbedding = await this.generateEmbedding(claimText);
      const embeddingVector = `[${claimEmbedding.join(',')}]`;

      // Build query with optional graph filter
      let sql = `
        SELECT
          n.id,
          n.title,
          n.props,
          n.meta,
          n.node_type_id,
          mnt.name as node_type,
          vs.veracity_score,
          n.created_at,
          1 - (n.ai <=> $1::vector) as similarity
        FROM public."Nodes" n
        LEFT JOIN public."MethodologyNodeTypes" mnt ON n.node_type_id = mnt.id
        LEFT JOIN public."VeracityScores" vs ON vs.target_node_id = n.id
        WHERE n.ai IS NOT NULL
      `;

      const params: any[] = [embeddingVector];

      if (graphId) {
        params.push(graphId);
        sql += ` AND n.graph_id = $${params.length}`;
      }

      sql += `
        ORDER BY n.ai <=> $1::vector
        LIMIT $${params.length + 1}
      `;
      params.push(limit);

      const result = await pool.query(sql, params);

      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        node_type: row.node_type,
        props: typeof row.props === 'string' ? JSON.parse(row.props) : row.props,
        meta: typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta,
        veracity_score: row.veracity_score,
        similarity: parseFloat(row.similarity),
        created_at: row.created_at,
      }));
    } catch (error) {
      console.error('Error in vector similarity search:', error);
      throw new Error('Failed to search for similar evidence');
    }
  }

  /**
   * Find path between two nodes using recursive CTE
   */
  private async findRelationshipPath(
    pool: Pool,
    sourceNodeId: string,
    targetNodeId: string
  ): Promise<string[] | undefined> {
    try {
      const sql = `
        WITH RECURSIVE path AS (
          SELECT
            source_node_id,
            target_node_id,
            ARRAY[source_node_id::text] as path,
            1 as depth
          FROM public."Edges"
          WHERE source_node_id = $1

          UNION ALL

          SELECT
            e.source_node_id,
            e.target_node_id,
            p.path || e.source_node_id::text,
            p.depth + 1
          FROM public."Edges" e
          INNER JOIN path p ON e.source_node_id = p.target_node_id
          WHERE p.depth < 5 -- Limit to 5 hops
            AND NOT e.source_node_id = ANY(p.path) -- Prevent cycles
        )
        SELECT path || target_node_id::text as full_path
        FROM path
        WHERE target_node_id = $2
        ORDER BY array_length(path, 1)
        LIMIT 1
      `;

      const result = await pool.query(sql, [sourceNodeId, targetNodeId]);

      if (result.rows.length > 0) {
        return result.rows[0].full_path;
      }

      return undefined;
    } catch (error) {
      console.error('Error finding relationship path:', error);
      return undefined;
    }
  }

  /**
   * Assess source reliability based on veracity score and metadata
   */
  private assessSourceReliability(node: VectorSearchResult): number {
    let reliability = 0.5; // Default neutral reliability

    // Factor in veracity score if available
    if (node.veracity_score !== null && node.veracity_score !== undefined) {
      reliability = node.veracity_score;
    }

    // Boost reliability for Level 0 nodes (immutable truth layer)
    if (node.meta?.is_level_0 === true) {
      reliability = Math.max(reliability, 0.9);
    }

    // Reduce reliability for very old nodes (temporal decay)
    const ageInDays = (Date.now() - new Date(node.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays > 365) {
      const decayFactor = Math.max(0.7, 1 - (ageInDays - 365) / 3650); // Decay over 10 years
      reliability *= decayFactor;
    }

    return Math.max(0, Math.min(1, reliability));
  }

  /**
   * Use AI to determine if evidence supports, conflicts, or is neutral to claim
   */
  private async categorizeEvidence(
    claim: string,
    evidenceContent: string,
    context?: string
  ): Promise<{ category: 'supporting' | 'conflicting' | 'neutral'; reasoning: string }> {
    const systemPrompt = `You are a precise fact-checking AI. Your job is to analyze whether a piece of evidence SUPPORTS, CONFLICTS with, or is NEUTRAL to a given claim.

RULES:
1. SUPPORTING: Evidence directly confirms or corroborates the claim
2. CONFLICTING: Evidence directly contradicts or refutes the claim
3. NEUTRAL: Evidence is related but neither confirms nor contradicts

Be conservative - if you're unsure, choose NEUTRAL.

Respond in this exact JSON format:
{
  "category": "supporting" | "conflicting" | "neutral",
  "reasoning": "Brief explanation (1-2 sentences)"
}`;

    const userPrompt = `CLAIM: ${claim}

EVIDENCE: ${evidenceContent}
${context ? `\nCONTEXT: ${context}` : ''}

Does this evidence SUPPORT, CONFLICT with, or is NEUTRAL to the claim?`;

    try {
      const response = await this.callOllama([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], 300);

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          category: parsed.category || 'neutral',
          reasoning: parsed.reasoning || 'Unable to determine relationship',
        };
      }

      // Fallback parsing
      if (response.toLowerCase().includes('support')) {
        return { category: 'supporting', reasoning: 'Evidence appears to support the claim' };
      } else if (response.toLowerCase().includes('conflict') || response.toLowerCase().includes('contradict')) {
        return { category: 'conflicting', reasoning: 'Evidence appears to conflict with the claim' };
      }

      return { category: 'neutral', reasoning: 'Evidence relationship unclear' };
    } catch (error) {
      console.error('Error categorizing evidence:', error);
      return { category: 'neutral', reasoning: 'Failed to analyze evidence' };
    }
  }

  /**
   * Find corroborating evidence for a claim
   */
  async findCorroboratingEvidence(
    pool: Pool,
    claim: string,
    graphId?: string,
    context?: string
  ): Promise<Evidence[]> {
    const similarNodes = await this.findSimilarNodes(pool, claim, graphId);
    const corroboratingEvidence: Evidence[] = [];

    for (const node of similarNodes) {
      if (node.similarity < this.SEMANTIC_SIMILARITY_THRESHOLD) {
        continue;
      }

      const evidenceContent = `${node.title}\n${JSON.stringify(node.props)}`;
      const categorization = await this.categorizeEvidence(claim, evidenceContent, context);

      if (categorization.category === 'supporting') {
        corroboratingEvidence.push({
          nodeId: node.id,
          nodeTitle: node.title,
          nodeType: node.node_type,
          content: evidenceContent,
          veracity: node.veracity_score,
          sourceReliability: this.assessSourceReliability(node),
          semanticSimilarity: node.similarity,
          evidenceType: 'supporting',
          timestamp: node.created_at,
        });
      }
    }

    return corroboratingEvidence;
  }

  /**
   * Find conflicting evidence for a claim
   */
  async findConflictingEvidence(
    pool: Pool,
    claim: string,
    graphId?: string,
    context?: string
  ): Promise<Evidence[]> {
    const similarNodes = await this.findSimilarNodes(pool, claim, graphId);
    const conflictingEvidence: Evidence[] = [];

    for (const node of similarNodes) {
      if (node.similarity < this.SEMANTIC_SIMILARITY_THRESHOLD) {
        continue;
      }

      const evidenceContent = `${node.title}\n${JSON.stringify(node.props)}`;
      const categorization = await this.categorizeEvidence(claim, evidenceContent, context);

      if (categorization.category === 'conflicting') {
        conflictingEvidence.push({
          nodeId: node.id,
          nodeTitle: node.title,
          nodeType: node.node_type,
          content: evidenceContent,
          veracity: node.veracity_score,
          sourceReliability: this.assessSourceReliability(node),
          semanticSimilarity: node.similarity,
          evidenceType: 'conflicting',
          timestamp: node.created_at,
        });
      }
    }

    return conflictingEvidence;
  }

  /**
   * Verify a claim against the knowledge graph
   */
  async verifyClaim(
    pool: Pool,
    claimText: string,
    sourceNodeId?: string,
    graphId?: string,
    context?: string
  ): Promise<VerificationResult> {
    console.log(`Verifying claim: "${claimText}"`);

    // Find similar nodes
    const similarNodes = await this.findSimilarNodes(pool, claimText, graphId);

    // Categorize all evidence
    const supportingEvidence: Evidence[] = [];
    const conflictingEvidence: Evidence[] = [];
    const neutralEvidence: Evidence[] = [];

    for (const node of similarNodes) {
      if (node.similarity < this.SEMANTIC_SIMILARITY_THRESHOLD) {
        continue;
      }

      const evidenceContent = `${node.title}\n${JSON.stringify(node.props)}`;
      const categorization = await this.categorizeEvidence(claimText, evidenceContent, context);

      // Find relationship path if source node provided
      let relationshipPath: string[] | undefined;
      if (sourceNodeId) {
        relationshipPath = await this.findRelationshipPath(pool, sourceNodeId, node.id);
      }

      const evidence: Evidence = {
        nodeId: node.id,
        nodeTitle: node.title,
        nodeType: node.node_type,
        content: evidenceContent,
        veracity: node.veracity_score,
        sourceReliability: this.assessSourceReliability(node),
        semanticSimilarity: node.similarity,
        evidenceType: categorization.category,
        relationshipPath,
        timestamp: node.created_at,
      };

      if (categorization.category === 'supporting') {
        supportingEvidence.push(evidence);
      } else if (categorization.category === 'conflicting') {
        conflictingEvidence.push(evidence);
      } else {
        neutralEvidence.push(evidence);
      }
    }

    // Calculate overall veracity using weighted evidence
    const veracity = this.calculateVeracity(supportingEvidence, conflictingEvidence);

    // Generate reasoning using AI
    const reasoning = await this.generateReasoning(
      claimText,
      supportingEvidence,
      conflictingEvidence,
      neutralEvidence,
      veracity
    );

    // Determine if inquiry should be created
    const shouldCreateInquiry = this.shouldCreateInquiry(
      supportingEvidence,
      conflictingEvidence,
      veracity
    );

    // Generate suggested inquiry questions
    const suggestedInquiryQuestions = shouldCreateInquiry
      ? await this.generateInquiryQuestions(claimText, supportingEvidence, conflictingEvidence)
      : [];

    return {
      claimText,
      sourceNodeId: sourceNodeId || '',
      overallVeracity: veracity.score,
      confidence: veracity.confidence,
      supportingEvidence,
      conflictingEvidence,
      neutralEvidence,
      reasoning,
      shouldCreateInquiry,
      suggestedInquiryQuestions,
      generatedAt: new Date(),
    };
  }

  /**
   * Calculate veracity score based on evidence
   */
  private calculateVeracity(
    supportingEvidence: Evidence[],
    conflictingEvidence: Evidence[]
  ): { score: number; confidence: number } {
    if (supportingEvidence.length === 0 && conflictingEvidence.length === 0) {
      return { score: 0.5, confidence: 0.1 }; // No evidence, low confidence
    }

    // Calculate weighted support
    const supportWeight = supportingEvidence.reduce(
      (sum, e) => sum + e.sourceReliability * e.semanticSimilarity,
      0
    );

    // Calculate weighted conflict
    const conflictWeight = conflictingEvidence.reduce(
      (sum, e) => sum + e.sourceReliability * e.semanticSimilarity,
      0
    );

    const totalWeight = supportWeight + conflictWeight;

    if (totalWeight === 0) {
      return { score: 0.5, confidence: 0.2 };
    }

    // Veracity score based on relative weights
    const score = supportWeight / totalWeight;

    // Confidence based on amount of evidence
    const totalEvidence = supportingEvidence.length + conflictingEvidence.length;
    const confidence = Math.min(0.95, 0.3 + (totalEvidence * 0.1));

    return { score, confidence };
  }

  /**
   * Generate human-readable reasoning for verification result
   */
  private async generateReasoning(
    claim: string,
    supporting: Evidence[],
    conflicting: Evidence[],
    neutral: Evidence[],
    veracity: { score: number; confidence: number }
  ): Promise<string> {
    const systemPrompt = `You are a fact-checking expert. Generate a clear, concise summary explaining the verification result for a claim.

Focus on:
1. What evidence was found
2. How reliable the sources are
3. Why the veracity score makes sense
4. What remains uncertain

Be objective and precise. Use 2-3 sentences.`;

    const userPrompt = `CLAIM: ${claim}

VERACITY SCORE: ${(veracity.score * 100).toFixed(1)}% (confidence: ${(veracity.confidence * 100).toFixed(1)}%)

SUPPORTING EVIDENCE: ${supporting.length} pieces
${supporting.slice(0, 3).map(e => `- ${e.nodeTitle} (reliability: ${(e.sourceReliability * 100).toFixed(0)}%)`).join('\n')}

CONFLICTING EVIDENCE: ${conflicting.length} pieces
${conflicting.slice(0, 3).map(e => `- ${e.nodeTitle} (reliability: ${(e.sourceReliability * 100).toFixed(0)}%)`).join('\n')}

NEUTRAL EVIDENCE: ${neutral.length} pieces

Explain the verification result:`;

    try {
      const response = await this.callOllama([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], 400);

      return response.trim();
    } catch (error) {
      console.error('Error generating reasoning:', error);
      return `Found ${supporting.length} supporting and ${conflicting.length} conflicting pieces of evidence. Veracity score: ${(veracity.score * 100).toFixed(1)}% with ${(veracity.confidence * 100).toFixed(1)}% confidence.`;
    }
  }

  /**
   * Determine if a formal inquiry should be created
   */
  shouldCreateInquiry(
    supporting: Evidence[],
    conflicting: Evidence[],
    veracity: { score: number; confidence: number }
  ): boolean {
    // Create inquiry if:
    // 1. Low confidence (< 50%)
    // 2. Conflicting evidence exists
    // 3. Veracity is in the uncertain range (0.3-0.7)
    // 4. No evidence at all

    if (veracity.confidence < 0.5) {
      return true;
    }

    if (conflicting.length > 0 && supporting.length > 0) {
      return true; // Contradictory evidence
    }

    if (veracity.score > 0.3 && veracity.score < 0.7) {
      return true; // Uncertain veracity
    }

    if (supporting.length === 0 && conflicting.length === 0) {
      return true; // No evidence
    }

    return false;
  }

  /**
   * Generate suggested inquiry questions
   */
  private async generateInquiryQuestions(
    claim: string,
    supporting: Evidence[],
    conflicting: Evidence[]
  ): Promise<string[]> {
    const systemPrompt = `You are a critical thinking expert. Generate 3-5 specific inquiry questions that would help clarify an uncertain or disputed claim.

Questions should:
1. Address gaps in evidence
2. Resolve conflicts between sources
3. Request specific types of evidence
4. Be actionable and clear

Return as JSON array of strings.`;

    const userPrompt = `CLAIM: ${claim}

SUPPORTING EVIDENCE: ${supporting.length} pieces
CONFLICTING EVIDENCE: ${conflicting.length} pieces

Generate inquiry questions:`;

    try {
      const response = await this.callOllama([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], 400);

      // Extract JSON array
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        return questions.slice(0, 5);
      }

      // Fallback questions
      return [
        `What additional evidence exists to support or refute: "${claim}"?`,
        'What are the primary sources for this claim?',
        'Are there any contradicting perspectives from reliable sources?',
      ];
    } catch (error) {
      console.error('Error generating inquiry questions:', error);
      return [
        `What evidence supports or refutes: "${claim}"?`,
        'What are the primary sources?',
      ];
    }
  }

  /**
   * Generate a comprehensive verification report
   */
  async generateVerificationReport(
    pool: Pool,
    claim: string,
    sourceNodeId?: string,
    graphId?: string
  ): Promise<VerificationResult> {
    return this.verifyClaim(pool, claim, sourceNodeId, graphId);
  }

  /**
   * Update veracity score for a node based on verification result
   */
  async updateVeracityScore(
    pool: Pool,
    nodeId: string,
    verificationResult: VerificationResult,
    userId: string
  ): Promise<void> {
    try {
      // Calculate evidence counts
      const evidenceCount =
        verificationResult.supportingEvidence.length +
        verificationResult.conflictingEvidence.length;

      const supportingWeight = verificationResult.supportingEvidence.reduce(
        (sum, e) => sum + e.sourceReliability,
        0
      );

      const refutingWeight = verificationResult.conflictingEvidence.reduce(
        (sum, e) => sum + e.sourceReliability,
        0
      );

      const evidenceWeightSum = supportingWeight + refutingWeight;

      // Check if veracity score already exists
      const existingScore = await pool.query(
        `SELECT id FROM public."VeracityScores" WHERE target_node_id = $1`,
        [nodeId]
      );

      if (existingScore.rows.length > 0) {
        // Update existing score
        await pool.query(
          `UPDATE public."VeracityScores"
           SET
             veracity_score = $1,
             confidence_interval_lower = $2,
             confidence_interval_upper = $3,
             evidence_weight_sum = $4,
             evidence_count = $5,
             supporting_evidence_weight = $6,
             refuting_evidence_weight = $7,
             calculated_at = NOW(),
             updated_at = NOW()
           WHERE target_node_id = $8`,
          [
            verificationResult.overallVeracity,
            Math.max(0, verificationResult.overallVeracity - (1 - verificationResult.confidence) * 0.5),
            Math.min(1, verificationResult.overallVeracity + (1 - verificationResult.confidence) * 0.5),
            evidenceWeightSum,
            evidenceCount,
            supportingWeight,
            refutingWeight,
            nodeId,
          ]
        );
      } else {
        // Insert new score
        await pool.query(
          `INSERT INTO public."VeracityScores" (
             target_node_id,
             veracity_score,
             confidence_interval_lower,
             confidence_interval_upper,
             evidence_weight_sum,
             evidence_count,
             supporting_evidence_weight,
             refuting_evidence_weight,
             consensus_score,
             source_count,
             source_agreement_ratio,
             challenge_count,
             open_challenge_count,
             challenge_impact,
             temporal_decay_factor,
             calculation_method,
             calculated_at,
             calculated_by,
             updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), $17, NOW()
           )`,
          [
            nodeId,
            verificationResult.overallVeracity,
            Math.max(0, verificationResult.overallVeracity - (1 - verificationResult.confidence) * 0.5),
            Math.min(1, verificationResult.overallVeracity + (1 - verificationResult.confidence) * 0.5),
            evidenceWeightSum,
            evidenceCount,
            supportingWeight,
            refutingWeight,
            verificationResult.confidence, // consensus_score
            evidenceCount, // source_count
            evidenceCount > 0 ? supportingWeight / evidenceWeightSum : 0.5, // source_agreement_ratio
            verificationResult.conflictingEvidence.length, // challenge_count
            verificationResult.shouldCreateInquiry ? 1 : 0, // open_challenge_count
            refutingWeight / Math.max(1, evidenceWeightSum), // challenge_impact
            1.0, // temporal_decay_factor
            'ai_fact_checking', // calculation_method
            userId,
          ]
        );
      }

      console.log(`Updated veracity score for node ${nodeId}: ${verificationResult.overallVeracity.toFixed(3)}`);
    } catch (error) {
      console.error('Error updating veracity score:', error);
      throw new Error('Failed to update veracity score');
    }
  }

  /**
   * Create a formal inquiry based on verification result
   */
  async createInquiryFromVerification(
    pool: Pool,
    verificationResult: VerificationResult,
    userId: string
  ): Promise<string[]> {
    const inquiryIds: string[] = [];

    if (!verificationResult.shouldCreateInquiry) {
      return inquiryIds;
    }

    try {
      for (const question of verificationResult.suggestedInquiryQuestions) {
        const result = await pool.query(
          `INSERT INTO public."Inquiries" (
             target_node_id,
             user_id,
             content,
             status,
             created_at,
             updated_at
           ) VALUES ($1, $2, $3, $4, NOW(), NOW())
           RETURNING id`,
          [
            verificationResult.sourceNodeId || null,
            userId,
            question,
            InquiryStatus.OPEN,
          ]
        );

        inquiryIds.push(result.rows[0].id);
      }

      console.log(`Created ${inquiryIds.length} inquiries for claim: "${verificationResult.claimText}"`);
    } catch (error) {
      console.error('Error creating inquiries:', error);
      throw new Error('Failed to create inquiries from verification');
    }

    return inquiryIds;
  }
}

// Export singleton instance
export const factCheckingService = new FactCheckingService();
