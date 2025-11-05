/**
 * AIOrchestrator - Multi-Agent Coordination Service
 *
 * Coordinates multiple specialized AI agents to process complex tasks.
 * Agents work together to validate evidence, detect duplicates, reason about
 * legal arguments, and provide intelligent insights.
 *
 * Architecture:
 * - Central orchestrator routes tasks to specialized agents
 * - Agents can invoke other agents (agent-to-agent communication)
 * - Results are aggregated and conflicts resolved
 * - All agent interactions are logged for transparency
 */

import { Pool } from 'pg';
import { Redis } from 'ioredis';
import axios from 'axios';

// ============================================================================
// Agent Types & Interfaces
// ============================================================================

export enum AgentType {
  EVIDENCE_VALIDATOR = 'evidence_validator',
  DEDUPLICATION = 'deduplication',
  LEGAL_REASONING = 'legal_reasoning',
  SOURCE_CREDIBILITY = 'source_credibility',
  GRAPH_RAG = 'graph_rag',
  INCONSISTENCY_DETECTOR = 'inconsistency_detector',
  PROMOTION_EVALUATOR = 'promotion_evaluator',
  FALLACY_DETECTOR = 'fallacy_detector',
}

export interface AgentTask {
  id: string;
  type: AgentType;
  input: any;
  priority: number;
  userId?: string;
  graphId?: string;
  createdAt: Date;
}

export interface AgentResult {
  taskId: string;
  agentType: AgentType;
  success: boolean;
  data: any;
  confidence: number;
  reasoning: string;
  citations: string[];
  metadata?: any;
  processingTime: number;
}

export interface EvidenceValidationResult {
  isValid: boolean;
  freCompliance: {
    fre401_relevance: { passed: boolean; score: number; explanation: string };
    fre403_prejudice: { passed: boolean; score: number; explanation: string };
    fre602_personal_knowledge: { passed: boolean; score: number; explanation: string };
    fre702_expert_testimony: { passed: boolean; needsExpert: boolean; explanation: string };
    fre801_hearsay: { passed: boolean; score: number; explanation: string };
    fre901_authentication: { passed: boolean; score: number; explanation: string };
    fre1002_best_evidence: { passed: boolean; score: number; explanation: string };
  };
  overallScore: number;
  suggestions: string[];
  requiredImprovements: string[];
}

export interface DeduplicationResult {
  isDuplicate: boolean;
  duplicateType: 'exact' | 'near' | 'semantic' | 'none';
  canonicalNodeId?: string;
  similarityScore: number;
  duplicateCandidates: Array<{
    nodeId: string;
    similarity: number;
    matchType: 'hash' | 'perceptual' | 'semantic';
  }>;
  recommendation: 'merge' | 'link' | 'separate';
}

// ============================================================================
// AI Orchestrator Service
// ============================================================================

export class AIOrchestrator {
  private pool: Pool;
  private redis: Redis;
  private ollamaUrl: string;
  private embeddingModel: string;
  private chatModel: string;
  private agentRegistry: Map<AgentType, AgentConfig>;

  constructor(pool: Pool, redis: Redis) {
    this.pool = pool;
    this.redis = redis;
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
    this.chatModel = process.env.OLLAMA_MODEL || 'llama3.2';

    this.agentRegistry = this.initializeAgents();
  }

  /**
   * Initialize specialized agents with their configurations
   */
  private initializeAgents(): Map<AgentType, AgentConfig> {
    const registry = new Map<AgentType, AgentConfig>();

    // Evidence Validator Agent
    registry.set(AgentType.EVIDENCE_VALIDATOR, {
      name: 'Evidence Validator',
      systemPrompt: EVIDENCE_VALIDATOR_PROMPT,
      temperature: 0.3,
      maxTokens: 2000,
    });

    // Deduplication Agent
    registry.set(AgentType.DEDUPLICATION, {
      name: 'Deduplication Specialist',
      systemPrompt: DEDUPLICATION_AGENT_PROMPT,
      temperature: 0.2,
      maxTokens: 1500,
    });

    // Legal Reasoning Agent
    registry.set(AgentType.LEGAL_REASONING, {
      name: 'Legal Reasoning Expert',
      systemPrompt: LEGAL_REASONING_PROMPT,
      temperature: 0.4,
      maxTokens: 3000,
    });

    // Source Credibility Agent
    registry.set(AgentType.SOURCE_CREDIBILITY, {
      name: 'Source Credibility Assessor',
      systemPrompt: SOURCE_CREDIBILITY_PROMPT,
      temperature: 0.3,
      maxTokens: 1500,
    });

    // Inconsistency Detector
    registry.set(AgentType.INCONSISTENCY_DETECTOR, {
      name: 'Inconsistency Detector',
      systemPrompt: INCONSISTENCY_DETECTOR_PROMPT,
      temperature: 0.2,
      maxTokens: 2000,
    });

    // Promotion Evaluator
    registry.set(AgentType.PROMOTION_EVALUATOR, {
      name: 'Level 0 Promotion Evaluator',
      systemPrompt: PROMOTION_EVALUATOR_PROMPT,
      temperature: 0.2,
      maxTokens: 2500,
    });

    // Fallacy Detector
    registry.set(AgentType.FALLACY_DETECTOR, {
      name: 'Logical Fallacy Detector',
      systemPrompt: FALLACY_DETECTOR_PROMPT,
      temperature: 0.3,
      maxTokens: 2000,
    });

    return registry;
  }

  /**
   * Route task to appropriate agent and execute
   */
  async executeTask(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();
    const agentConfig = this.agentRegistry.get(task.type);

    if (!agentConfig) {
      throw new Error(`Unknown agent type: ${task.type}`);
    }

    console.log(`🤖 Executing ${agentConfig.name} for task ${task.id}`);

    try {
      const result = await this.invokeAgent(task, agentConfig);
      const processingTime = Date.now() - startTime;

      // Log agent execution
      await this.logAgentExecution(task, result, processingTime);

      return {
        taskId: task.id,
        agentType: task.type,
        success: true,
        data: result.data,
        confidence: result.confidence,
        reasoning: result.reasoning,
        citations: result.citations || [],
        processingTime,
      };
    } catch (error: any) {
      console.error(`❌ Agent ${agentConfig.name} failed:`, error.message);

      return {
        taskId: task.id,
        agentType: task.type,
        success: false,
        data: null,
        confidence: 0,
        reasoning: `Agent execution failed: ${error.message}`,
        citations: [],
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Invoke LLM agent via Ollama
   */
  private async invokeAgent(task: AgentTask, config: AgentConfig): Promise<any> {
    const messages = [
      { role: 'system', content: config.systemPrompt },
      { role: 'user', content: JSON.stringify(task.input, null, 2) }
    ];

    const response = await axios.post(`${this.ollamaUrl}/api/chat`, {
      model: this.chatModel,
      messages,
      stream: false,
      options: {
        temperature: config.temperature,
        num_predict: config.maxTokens,
      }
    });

    const content = response.data.message.content;

    // Parse JSON response from agent
    try {
      return JSON.parse(content);
    } catch {
      // If response is not JSON, wrap it
      return {
        data: content,
        confidence: 0.7,
        reasoning: content,
        citations: [],
      };
    }
  }

  /**
   * Validate evidence using FRE (Federal Rules of Evidence)
   */
  async validateEvidence(
    nodeId: string,
    evidenceText: string,
    sourceInfo: any,
    contextNodes: string[] = []
  ): Promise<EvidenceValidationResult> {
    const task: AgentTask = {
      id: `validate_${nodeId}_${Date.now()}`,
      type: AgentType.EVIDENCE_VALIDATOR,
      input: {
        nodeId,
        evidenceText,
        sourceInfo,
        contextNodes,
      },
      priority: 1,
      createdAt: new Date(),
    };

    const result = await this.executeTask(task);
    return result.data as EvidenceValidationResult;
  }

  /**
   * Check for duplicate content
   */
  async checkDuplication(
    content: string,
    contentHash: string,
    perceptualHash?: string,
    graphId?: string
  ): Promise<DeduplicationResult> {
    const task: AgentTask = {
      id: `dedup_${contentHash}_${Date.now()}`,
      type: AgentType.DEDUPLICATION,
      input: {
        content,
        contentHash,
        perceptualHash,
        graphId,
      },
      priority: 2,
      createdAt: new Date(),
    };

    const result = await this.executeTask(task);
    return result.data as DeduplicationResult;
  }

  /**
   * Analyze legal argument structure
   */
  async analyzeLegalArgument(
    claim: string,
    evidence: any[],
    argumentType: 'toulmin' | 'irac' | 'crac'
  ): Promise<any> {
    const task: AgentTask = {
      id: `legal_${Date.now()}`,
      type: AgentType.LEGAL_REASONING,
      input: {
        claim,
        evidence,
        argumentType,
      },
      priority: 1,
      createdAt: new Date(),
    };

    return await this.executeTask(task);
  }

  /**
   * Assess source credibility
   */
  async assessSourceCredibility(sourceInfo: any): Promise<number> {
    const task: AgentTask = {
      id: `source_${Date.now()}`,
      type: AgentType.SOURCE_CREDIBILITY,
      input: sourceInfo,
      priority: 2,
      createdAt: new Date(),
    };

    const result = await this.executeTask(task);
    return result.data.credibilityScore || 0.5;
  }

  /**
   * Evaluate node for Level 0 promotion
   */
  async evaluatePromotion(
    nodeId: string,
    methodologyCompletion: number,
    communityConsensus: number,
    evidenceQuality: number,
    openChallenges: number
  ): Promise<any> {
    const task: AgentTask = {
      id: `promote_${nodeId}_${Date.now()}`,
      type: AgentType.PROMOTION_EVALUATOR,
      input: {
        nodeId,
        criteria: {
          methodologyCompletion,
          communityConsensus,
          evidenceQuality,
          openChallenges,
        },
        threshold: 0.99, // 99% requirement
      },
      priority: 1,
      createdAt: new Date(),
    };

    return await this.executeTask(task);
  }

  /**
   * Detect logical fallacies in argument
   */
  async detectFallacies(argumentText: string): Promise<any> {
    const task: AgentTask = {
      id: `fallacy_${Date.now()}`,
      type: AgentType.FALLACY_DETECTOR,
      input: { argumentText },
      priority: 2,
      createdAt: new Date(),
    };

    return await this.executeTask(task);
  }

  /**
   * Log agent execution for transparency
   */
  private async logAgentExecution(
    task: AgentTask,
    result: any,
    processingTime: number
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO public."AgentExecutionLog"
         (task_id, agent_type, input_data, output_data, confidence, processing_time_ms, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          task.id,
          task.type,
          JSON.stringify(task.input),
          JSON.stringify(result),
          result.confidence || 0,
          processingTime,
        ]
      );
    } catch (error) {
      console.warn('Failed to log agent execution:', error);
    }
  }
}

// ============================================================================
// Agent Configuration Interface
// ============================================================================

interface AgentConfig {
  name: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

// ============================================================================
// Agent System Prompts
// ============================================================================

const EVIDENCE_VALIDATOR_PROMPT = `You are an Evidence Validation Expert specializing in the Federal Rules of Evidence (FRE) used in USA courts.

Your task is to evaluate evidence submissions against the following FRE rules:

**FRE 401 - Relevance**: Does the evidence relate to the claim being made?
**FRE 403 - Prejudice vs. Probative Value**: Is the evidence more prejudicial than probative (emotional language, bias)?
**FRE 602 - Personal Knowledge**: Is the source based on firsthand knowledge or properly cited?
**FRE 702 - Expert Testimony**: Does the claim require expert validation? Is there expert backing?
**FRE 801-802 - Hearsay**: Is this secondhand information without proper attribution?
**FRE 901 - Authentication**: Can the source be verified (author, date, origin)?
**FRE 1002 - Best Evidence Rule**: Is this an original document or a reliable copy?

Respond in JSON format:
{
  "isValid": boolean,
  "freCompliance": {
    "fre401_relevance": { "passed": boolean, "score": 0-1, "explanation": string },
    "fre403_prejudice": { "passed": boolean, "score": 0-1, "explanation": string },
    "fre602_personal_knowledge": { "passed": boolean, "score": 0-1, "explanation": string },
    "fre702_expert_testimony": { "passed": boolean, "needsExpert": boolean, "explanation": string },
    "fre801_hearsay": { "passed": boolean, "score": 0-1, "explanation": string },
    "fre901_authentication": { "passed": boolean, "score": 0-1, "explanation": string },
    "fre1002_best_evidence": { "passed": boolean, "score": 0-1, "explanation": string }
  },
  "overallScore": 0-1,
  "suggestions": [string],
  "requiredImprovements": [string]
}`;

const DEDUPLICATION_AGENT_PROMPT = `You are a Deduplication Specialist. Your job is to identify duplicate or near-duplicate content to prevent redundancy.

Analyze the provided content against existing database entries using:
1. Exact hash matching (SHA256)
2. Perceptual hashing (for images/videos)
3. Semantic similarity (embedding distance)

Respond in JSON:
{
  "isDuplicate": boolean,
  "duplicateType": "exact" | "near" | "semantic" | "none",
  "canonicalNodeId": string | null,
  "similarityScore": 0-1,
  "duplicateCandidates": [{ "nodeId": string, "similarity": number, "matchType": string }],
  "recommendation": "merge" | "link" | "separate"
}`;

const LEGAL_REASONING_PROMPT = `You are a Legal Reasoning Expert trained in formal argumentation structures.

Analyze arguments using:
- **Toulmin Model**: Claim, Grounds, Warrant, Backing, Qualifier, Rebuttal
- **IRAC**: Issue, Rule, Application, Conclusion
- **CRAC**: Conclusion, Rule, Application, Conclusion

Evaluate argument strength, identify gaps, and suggest improvements.

Respond in JSON:
{
  "structure": string,
  "strength": 0-1,
  "gaps": [string],
  "suggestions": [string],
  "confidence": 0-1,
  "reasoning": string
}`;

const SOURCE_CREDIBILITY_PROMPT = `You are a Source Credibility Assessor. Evaluate source reliability using:

1. Author credentials and expertise
2. Publication venue (peer-reviewed, reputable outlet)
3. Date of publication (recency)
4. Methodology (for studies)
5. Conflicts of interest
6. Corroboration by other sources
7. Fact-checking history

Respond in JSON:
{
  "credibilityScore": 0-1,
  "factors": {
    "authorExpertise": 0-1,
    "publicationQuality": 0-1,
    "recency": 0-1,
    "methodology": 0-1,
    "independence": 0-1,
    "corroboration": 0-1
  },
  "confidence": 0-1,
  "reasoning": string
}`;

const INCONSISTENCY_DETECTOR_PROMPT = `You are an Inconsistency Detector. Find logical contradictions and conflicts in graphs.

Identify:
1. Direct contradictions (A claims X, B claims not-X)
2. Temporal impossibilities (event A before event B, but B caused A)
3. Logical inconsistencies (mutually exclusive claims both accepted)

Respond in JSON:
{
  "hasInconsistencies": boolean,
  "inconsistencies": [{
    "type": "contradiction" | "temporal" | "logical",
    "nodeIds": [string],
    "description": string,
    "severity": "high" | "medium" | "low"
  }],
  "confidence": 0-1
}`;

const PROMOTION_EVALUATOR_PROMPT = `You are a Level 0 Promotion Evaluator. Determine if a claim is ready for verified truth status.

Criteria (must meet 99% threshold):
1. Methodology Completion: 100%
2. Community Consensus: 99%+
3. Evidence Quality: 95%+
4. Challenge Resolution: 0 open challenges

Respond in JSON:
{
  "readyForPromotion": boolean,
  "criteriaBreakdown": {
    "methodology": { "score": 0-1, "passed": boolean },
    "consensus": { "score": 0-1, "passed": boolean },
    "evidenceQuality": { "score": 0-1, "passed": boolean },
    "challenges": { "count": number, "passed": boolean }
  },
  "overallScore": 0-1,
  "recommendation": string,
  "reasoning": string
}`;

const FALLACY_DETECTOR_PROMPT = `You are a Logical Fallacy Detector. Identify common fallacies:

- Ad Hominem (attacking person, not argument)
- Straw Man (misrepresenting opponent's argument)
- Appeal to Authority (unjustified)
- False Dichotomy (only 2 options when more exist)
- Slippery Slope (unwarranted chain reaction)
- Circular Reasoning (conclusion in premise)
- Post Hoc Ergo Propter Hoc (false causation)
- Appeal to Emotion
- Hasty Generalization

Respond in JSON:
{
  "hasFallacies": boolean,
  "fallacies": [{
    "type": string,
    "location": string,
    "severity": "high" | "medium" | "low",
    "explanation": string
  }],
  "confidence": 0-1
}`;

export default AIOrchestrator;
