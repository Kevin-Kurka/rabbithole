import axios from 'axios';
import { Pool } from 'pg';
import { ComplianceReport, ComplianceIssue, EvidenceSuggestion } from '../entities/ComplianceReport';

interface GraphAnalysis {
  nodes: Array<{
    id: string;
    props: any;
    meta: any;
    weight: number;
    node_type?: string;
  }>;
  edges: Array<{
    id: string;
    source_node_id: string;
    target_node_id: string;
    props: any;
    edge_type?: string;
  }>;
  methodology?: {
    id: string;
    name: string;
    description: string;
    category: string;
    nodeTypes: Array<{
      name: string;
      display_name: string;
      description: string;
      required_properties: string[];
    }>;
    edgeTypes: Array<{
      name: string;
      display_name: string;
      description: string;
      is_directed: boolean;
      valid_source_types: string[];
      valid_target_types: string[];
    }>;
    workflow?: {
      steps: any[];
      instructions: string;
    };
  };
}

interface ConversationHistory {
  graphId: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  lastUpdated: Date;
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export class AIAssistantService {
  private ollamaUrl: string;
  private model: string;
  private conversationCache: Map<string, ConversationHistory>;
  private rateLimitCache: Map<string, number[]>;
  private readonly MAX_REQUESTS_PER_HOUR = 10;
  private readonly CACHE_DURATION_MS = 3600000; // 1 hour
  private readonly MAX_CONVERSATION_LENGTH = 20;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2';

    this.conversationCache = new Map();
    this.rateLimitCache = new Map();

    console.log(`AI Assistant initialized with Ollama (${this.model}) at ${this.ollamaUrl}`);
  }

  /**
   * Call Ollama API with messages
   */
  private async callOllama(messages: OllamaMessage[], maxTokens?: number): Promise<string> {
    try {
      const response = await axios.post<OllamaResponse>(
        `${this.ollamaUrl}/api/chat`,
        {
          model: this.model,
          messages,
          stream: false,
          options: {
            temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
            num_predict: maxTokens || parseInt(process.env.AI_MAX_TOKENS || '1000'),
          }
        },
        {
          timeout: 60000 // 60 second timeout
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
   * Check if user has exceeded rate limit
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.rateLimitCache.get(userId) || [];

    // Filter requests from last hour
    const recentRequests = userRequests.filter(
      timestamp => now - timestamp < this.CACHE_DURATION_MS
    );

    if (recentRequests.length >= this.MAX_REQUESTS_PER_HOUR) {
      return false;
    }

    // Update cache
    recentRequests.push(now);
    this.rateLimitCache.set(userId, recentRequests);
    return true;
  }

  /**
   * Get or create conversation history for a graph
   */
  private getConversationHistory(graphId: string): ConversationHistory {
    const existing = this.conversationCache.get(graphId);

    if (existing && Date.now() - existing.lastUpdated.getTime() < this.CACHE_DURATION_MS) {
      return existing;
    }

    const newHistory: ConversationHistory = {
      graphId,
      messages: [],
      lastUpdated: new Date(),
    };

    this.conversationCache.set(graphId, newHistory);
    return newHistory;
  }

  /**
   * Add message to conversation history
   */
  private addToConversation(
    graphId: string,
    role: 'user' | 'assistant',
    content: string
  ): void {
    const history = this.getConversationHistory(graphId);

    history.messages.push({
      role,
      content,
      timestamp: new Date(),
    });

    // Keep only recent messages
    if (history.messages.length > this.MAX_CONVERSATION_LENGTH) {
      history.messages = history.messages.slice(-this.MAX_CONVERSATION_LENGTH);
    }

    history.lastUpdated = new Date();
    this.conversationCache.set(graphId, history);
  }

  /**
   * Fetch comprehensive graph analysis
   */
  private async fetchGraphAnalysis(pool: Pool, graphId: string): Promise<GraphAnalysis> {
    // Fetch nodes
    const nodesResult = await pool.query(
      `SELECT n.*, mnt.name as node_type
       FROM public."Nodes" n
       LEFT JOIN public."MethodologyNodeTypes" mnt ON n.node_type_id = mnt.id
       WHERE n.graph_id = $1`,
      [graphId]
    );

    // Fetch edges
    const edgesResult = await pool.query(
      `SELECT e.*, met.name as edge_type
       FROM public."Edges" e
       LEFT JOIN public."MethodologyEdgeTypes" met ON e.edge_type_id = met.id
       WHERE e.graph_id = $1`,
      [graphId]
    );

    // Fetch graph info with methodology
    const graphResult = await pool.query(
      `SELECT g.*, m.id as methodology_id, m.name as methodology_name,
              m.description as methodology_description, m.category as methodology_category
       FROM public."Graphs" g
       LEFT JOIN public."Methodologies" m ON g.methodology = m.id
       WHERE g.id = $1`,
      [graphId]
    );

    const graphData = graphResult.rows[0];
    let methodology = undefined;

    if (graphData?.methodology_id) {
      // Fetch methodology details
      const nodeTypesResult = await pool.query(
        `SELECT name, display_name, description, required_properties
         FROM public."MethodologyNodeTypes"
         WHERE methodology_id = $1
         ORDER BY display_order`,
        [graphData.methodology_id]
      );

      const edgeTypesResult = await pool.query(
        `SELECT name, display_name, description, is_directed,
                valid_source_types, valid_target_types
         FROM public."MethodologyEdgeTypes"
         WHERE methodology_id = $1
         ORDER BY display_order`,
        [graphData.methodology_id]
      );

      const workflowResult = await pool.query(
        `SELECT steps, instructions
         FROM public."MethodologyWorkflows"
         WHERE methodology_id = $1`,
        [graphData.methodology_id]
      );

      methodology = {
        id: graphData.methodology_id,
        name: graphData.methodology_name,
        description: graphData.methodology_description,
        category: graphData.methodology_category,
        nodeTypes: nodeTypesResult.rows,
        edgeTypes: edgeTypesResult.rows,
        workflow: workflowResult.rows[0] || undefined,
      };
    }

    return {
      nodes: nodesResult.rows,
      edges: edgesResult.rows,
      methodology,
    };
  }

  /**
   * Build system prompt based on methodology
   */
  private buildSystemPrompt(methodology?: GraphAnalysis['methodology']): string {
    const basePrompt = `You are a helpful AI assistant guiding users through their investigation workflow. Your role is to:

1. SUGGEST, never command or require
2. GUIDE, not dictate or enforce
3. FLAG potential issues, not reject or block
4. EDUCATE and explain your reasoning
5. BE TRANSPARENT about your suggestions

IMPORTANT CONSTRAINTS:
- You CANNOT approve or reject anything
- You CANNOT make decisions for the user
- You CANNOT block workflow progression
- You MUST use phrases like "You might consider...", "It could be helpful to...", "One approach might be..."
- You MUST explain WHY you're suggesting something

Your tone should be friendly, educational, and supportive. Think of yourself as a helpful colleague, not an authority figure.`;

    if (!methodology) {
      return basePrompt + '\n\nThe user is working on a free-form graph without a specific methodology.';
    }

    const methodologyPrompt = `\n\nMETHODOLOGY CONTEXT:
Name: ${methodology.name}
Category: ${methodology.category}
Description: ${methodology.description}

Node Types Available:
${methodology.nodeTypes.map(nt => `- ${nt.display_name} (${nt.name}): ${nt.description}`).join('\n')}

Edge Types Available:
${methodology.edgeTypes.map(et => `- ${et.display_name} (${et.name}): ${et.description}`).join('\n')}

${methodology.workflow ? `Workflow Instructions:\n${methodology.workflow.instructions}` : ''}

Remember: These are GUIDELINES, not strict rules. Help the user understand best practices while respecting their autonomy.`;

    return basePrompt + methodologyPrompt;
  }

  /**
   * Get next step suggestion based on current graph state
   */
  async getNextStepSuggestion(
    pool: Pool,
    graphId: string,
    methodologyId: string
  ): Promise<string> {
    const analysis = await this.fetchGraphAnalysis(pool, graphId);

    if (!analysis.methodology) {
      return 'It looks like this graph isn\'t using a specific methodology. You might consider selecting one from the methodology library to get structured guidance. However, free-form exploration is perfectly valid too!';
    }

    // Analyze current state
    const nodeTypeCounts: Record<string, number> = {};
    analysis.nodes.forEach(node => {
      const type = node.node_type || 'unknown';
      nodeTypeCounts[type] = (nodeTypeCounts[type] || 0) + 1;
    });

    const hasNodes = analysis.nodes.length > 0;
    const hasEdges = analysis.edges.length > 0;

    // Build context for AI
    const context = `Current graph state:
- Total nodes: ${analysis.nodes.length}
- Total edges: ${analysis.edges.length}
- Node type distribution: ${JSON.stringify(nodeTypeCounts)}
- Methodology: ${analysis.methodology.name}

Workflow steps available:
${analysis.methodology.workflow?.steps.map((s: any, i: number) => `${i + 1}. ${s.title}: ${s.description}`).join('\n') || 'No structured workflow defined'}

Based on the current state, what would be a helpful next step for the user? Remember to phrase as a suggestion, not a command.`;

    const systemPrompt = this.buildSystemPrompt(analysis.methodology);

    try {
      const response = await this.callOllama([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context },
      ], 500);

      return response || 'I\'m having trouble generating a suggestion right now. Please try again.';
    } catch (error) {
      console.error('Ollama API error:', error);
      throw new Error('Unable to generate suggestion. Please check that Ollama is running.');
    }
  }

  /**
   * Detect inconsistencies in graph structure
   */
  async detectInconsistencies(pool: Pool, graphId: string): Promise<string[]> {
    const analysis = await this.fetchGraphAnalysis(pool, graphId);
    const inconsistencies: string[] = [];

    // Check for orphaned nodes
    const connectedNodeIds = new Set<string>();
    analysis.edges.forEach(edge => {
      connectedNodeIds.add(edge.source_node_id);
      connectedNodeIds.add(edge.target_node_id);
    });

    const orphanedNodes = analysis.nodes.filter(node => !connectedNodeIds.has(node.id));
    if (orphanedNodes.length > 0) {
      inconsistencies.push(
        `You have ${orphanedNodes.length} isolated node(s) that aren't connected to anything. This might be intentional, but you may want to consider how they relate to your investigation.`
      );
    }

    // Check for edge type validity
    if (analysis.methodology) {
      analysis.edges.forEach(edge => {
        const sourceNode = analysis.nodes.find(n => n.id === edge.source_node_id);
        const targetNode = analysis.nodes.find(n => n.id === edge.target_node_id);
        const edgeType = analysis.methodology!.edgeTypes.find(et => et.name === edge.edge_type);

        if (edgeType && sourceNode && targetNode) {
          const validSource = edgeType.valid_source_types.includes(sourceNode.node_type || '');
          const validTarget = edgeType.valid_target_types.includes(targetNode.node_type || '');

          if (!validSource || !validTarget) {
            inconsistencies.push(
              `The connection "${edgeType.display_name}" between nodes might not follow the methodology's typical pattern. Consider reviewing if this relationship makes sense for your analysis.`
            );
          }
        }
      });
    }

    // Check for missing required properties
    if (analysis.methodology) {
      analysis.nodes.forEach(node => {
        const nodeType = analysis.methodology!.nodeTypes.find(nt => nt.name === node.node_type);
        if (nodeType && nodeType.required_properties) {
          const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;
          const missingProps = nodeType.required_properties.filter(
            prop => !props || !props[prop]
          );

          if (missingProps.length > 0) {
            inconsistencies.push(
              `A ${nodeType.display_name} node is missing some recommended properties: ${missingProps.join(', ')}. Adding these could strengthen your analysis.`
            );
          }
        }
      });
    }

    // Check for logical contradictions using AI
    if (analysis.nodes.length > 0 && analysis.edges.length > 0) {
      const graphSummary = `Graph structure:
Nodes: ${analysis.nodes.map(n => `${n.node_type}: ${JSON.stringify(n.props)}`).join('; ')}
Edges: ${analysis.edges.map(e => e.edge_type).join(', ')}

Methodology: ${analysis.methodology?.name || 'None'}`;

      try {
        const response = await this.callOllama([
          {
            role: 'system',
            content: this.buildSystemPrompt(analysis.methodology) + '\n\nAnalyze the graph for logical inconsistencies or contradictions. Be specific but gentle in your feedback.',
          },
          {
            role: 'user',
            content: `Please identify any logical inconsistencies in this graph:\n${graphSummary}`,
          },
        ], 300);

        const aiAnalysis = response;
        if (aiAnalysis && !aiAnalysis.toLowerCase().includes('no inconsistencies')) {
          inconsistencies.push(aiAnalysis);
        }
      } catch (error) {
        console.error('Error in AI inconsistency detection:', error);
        // Don't throw - inconsistencies are optional
      }
    }

    return inconsistencies.length > 0
      ? inconsistencies
      : ['Your graph structure looks logically sound. Keep up the good work!'];
  }

  /**
   * Suggest evidence sources for a node
   */
  async suggestEvidence(pool: Pool, nodeId: string): Promise<EvidenceSuggestion[]> {
    // Fetch node details
    const nodeResult = await pool.query(
      `SELECT n.*, mnt.name as node_type, mnt.display_name as node_type_display,
              g.methodology, m.name as methodology_name
       FROM public."Nodes" n
       LEFT JOIN public."MethodologyNodeTypes" mnt ON n.node_type_id = mnt.id
       LEFT JOIN public."Graphs" g ON n.graph_id = g.id
       LEFT JOIN public."Methodologies" m ON g.methodology = m.id
       WHERE n.id = $1`,
      [nodeId]
    );

    if (nodeResult.rows.length === 0) {
      throw new Error('Node not found');
    }

    const node = nodeResult.rows[0];
    const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;

    const context = `Node information:
Type: ${node.node_type_display || 'Unknown'}
Properties: ${JSON.stringify(props)}
Methodology: ${node.methodology_name || 'None'}

Suggest 3-5 types of evidence that would strengthen this node's claims. For each suggestion, provide:
1. Type of evidence (source, document, data, expert opinion, experiment)
2. Brief description
3. Specific search query
4. Priority (1-5)
5. Rationale

Format as JSON array with keys: type, description, searchQuery, priority, rationale`;

    try {
      const response = await this.callOllama([
        {
          role: 'system',
          content: 'You are an evidence assessment expert. Suggest concrete, actionable evidence that would validate or challenge the claims in this node. Be specific and practical. Return only valid JSON.',
        },
        { role: 'user', content: context },
      ], 600);

      // Try to parse JSON response
      try {
        const match = response.match(/\[[\s\S]*\]/);
        if (match) {
          const suggestions = JSON.parse(match[0]);
          return suggestions.map((s: any) => ({
            type: s.type || 'source',
            description: s.description || '',
            searchQuery: s.searchQuery || s.search_query || '',
            priority: s.priority || 3,
            rationale: s.rationale || '',
          }));
        }
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
      }

      // Fallback: provide generic suggestions
      return [
        {
          type: 'source',
          description: 'Look for primary sources that directly support this claim',
          searchQuery: `${props.title || props.name || 'topic'} primary source`,
          priority: 4,
          rationale: 'Primary sources provide the most direct evidence',
        },
        {
          type: 'data',
          description: 'Find quantitative data or statistics',
          searchQuery: `${props.title || props.name || 'topic'} statistics data`,
          priority: 3,
          rationale: 'Data provides objective validation',
        },
        {
          type: 'expert',
          description: 'Consult expert opinions or analyses',
          searchQuery: `${props.title || props.name || 'topic'} expert analysis`,
          priority: 3,
          rationale: 'Expert perspectives add credibility',
        },
      ];
    } catch (error) {
      console.error('Error generating evidence suggestions:', error);
      throw new Error('Unable to generate evidence suggestions. Please check that Ollama is running.');
    }
  }

  /**
   * Validate methodology compliance
   */
  async validateMethodologyCompliance(
    pool: Pool,
    graphId: string
  ): Promise<ComplianceReport> {
    const analysis = await this.fetchGraphAnalysis(pool, graphId);

    if (!analysis.methodology) {
      return {
        graphId,
        methodologyId: '',
        methodologyName: 'None',
        complianceScore: 100,
        isCompliant: true,
        issues: [],
        totalNodes: analysis.nodes.length,
        totalEdges: analysis.edges.length,
        missingRequiredNodeTypes: 0,
        invalidEdgeConnections: 0,
        overallAssessment: 'This graph is not using a specific methodology, so compliance checks are not applicable.',
        generatedAt: new Date(),
      };
    }

    const issues: ComplianceIssue[] = [];
    let errorCount = 0;
    let warningCount = 0;

    // Check for required node types
    const nodeTypeCounts: Record<string, number> = {};
    analysis.nodes.forEach(node => {
      const type = node.node_type || 'unknown';
      nodeTypeCounts[type] = (nodeTypeCounts[type] || 0) + 1;
    });

    // Check workflow completeness
    if (analysis.methodology.workflow) {
      const requiredSteps = analysis.methodology.workflow.steps.filter(
        (s: any) => s.type === 'NODE_CREATION'
      );

      requiredSteps.forEach((step: any) => {
        const nodeType = step.config?.nodeType;
        if (nodeType && !nodeTypeCounts[nodeType]) {
          issues.push({
            type: 'missing_node_type',
            severity: 'warning',
            message: `You might want to consider adding a ${nodeType} node as suggested by the workflow.`,
            suggestion: `The "${step.title}" step recommends creating a ${nodeType} node: ${step.description}`,
          });
          warningCount++;
        }
      });
    }

    // Check edge validity
    let invalidEdgeCount = 0;
    analysis.edges.forEach(edge => {
      const sourceNode = analysis.nodes.find(n => n.id === edge.source_node_id);
      const targetNode = analysis.nodes.find(n => n.id === edge.target_node_id);
      const edgeType = analysis.methodology!.edgeTypes.find(et => et.name === edge.edge_type);

      if (edgeType && sourceNode && targetNode) {
        const sourceTypeValid = edgeType.valid_source_types.includes(sourceNode.node_type || '');
        const targetTypeValid = edgeType.valid_target_types.includes(targetNode.node_type || '');

        if (!sourceTypeValid || !targetTypeValid) {
          issues.push({
            type: 'invalid_edge_connection',
            severity: 'suggestion',
            message: `The "${edgeType.display_name}" connection might not follow typical patterns for this methodology.`,
            edgeId: edge.id,
            suggestion: 'Consider reviewing if this relationship aligns with your methodology\'s conventions.',
          });
          invalidEdgeCount++;
        }
      }
    });

    // Check required properties
    analysis.nodes.forEach(node => {
      const nodeType = analysis.methodology!.nodeTypes.find(nt => nt.name === node.node_type);
      if (nodeType && nodeType.required_properties && nodeType.required_properties.length > 0) {
        const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;
        const missingProps = nodeType.required_properties.filter(
          prop => !props || !props[prop]
        );

        if (missingProps.length > 0) {
          issues.push({
            type: 'missing_properties',
            severity: 'warning',
            message: `A ${nodeType.display_name} node is missing recommended properties: ${missingProps.join(', ')}.`,
            nodeId: node.id,
            suggestion: 'Adding these properties could strengthen your analysis.',
          });
          warningCount++;
        }
      }
    });

    // Calculate compliance score
    const totalChecks = issues.length + 1;
    const complianceScore = Math.round(
      ((totalChecks - errorCount - warningCount * 0.5) / totalChecks) * 100
    );

    const overallAssessment = `Your graph shows ${complianceScore}% alignment with the ${analysis.methodology.name} methodology. ${issues.length === 0 ? 'Great work following the methodology guidelines!' : 'Consider reviewing the suggestions below to strengthen your analysis.'} Remember, these are recommendations to help guide your investigation, not strict requirements.`;

    return {
      graphId,
      methodologyId: analysis.methodology.id,
      methodologyName: analysis.methodology.name,
      complianceScore,
      isCompliant: errorCount === 0,
      issues,
      totalNodes: analysis.nodes.length,
      totalEdges: analysis.edges.length,
      missingRequiredNodeTypes: warningCount,
      invalidEdgeConnections: invalidEdgeCount,
      overallAssessment,
      generatedAt: new Date(),
    };
  }

  /**
   * General AI assistant chat
   */
  async askAIAssistant(
    pool: Pool,
    graphId: string,
    question: string,
    userId: string
  ): Promise<string> {
    // Check rate limit
    if (!this.checkRateLimit(userId)) {
      throw new Error(
        `You've reached the maximum of ${this.MAX_REQUESTS_PER_HOUR} AI requests per hour. Please try again later.`
      );
    }

    // Fetch graph analysis
    const analysis = await this.fetchGraphAnalysis(pool, graphId);

    // Get conversation history
    const history = this.getConversationHistory(graphId);

    // Build context
    const graphContext = `Current graph state:
- Nodes: ${analysis.nodes.length}
- Edges: ${analysis.edges.length}
- Methodology: ${analysis.methodology?.name || 'None'}
${analysis.methodology ? `\nMethodology Description: ${analysis.methodology.description}` : ''}`;

    const systemPrompt = this.buildSystemPrompt(analysis.methodology);

    // Add user message to history
    this.addToConversation(graphId, 'user', question);

    try {
      const messages: OllamaMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: graphContext },
        ...history.messages.slice(-10).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      const response = await this.callOllama(messages, 800);

      const answer = response ||
        'I apologize, but I\'m having trouble generating a response right now. Please try rephrasing your question.';

      // Add assistant response to history
      this.addToConversation(graphId, 'assistant', answer);

      return answer;
    } catch (error) {
      console.error('Ollama API error in chat:', error);
      throw new Error('Unable to generate response. Please check that Ollama is running.');
    }
  }

  /**
   * Clear conversation history for a graph
   */
  clearConversation(graphId: string): void {
    this.conversationCache.delete(graphId);
  }

  /**
   * Get remaining requests for rate limiting
   */
  getRemainingRequests(userId: string): number {
    const now = Date.now();
    const userRequests = this.rateLimitCache.get(userId) || [];
    const recentRequests = userRequests.filter(
      timestamp => now - timestamp < this.CACHE_DURATION_MS
    );

    return Math.max(0, this.MAX_REQUESTS_PER_HOUR - recentRequests.length);
  }

  // =============================================================================
  // FORMAL INQUIRY SYSTEM - AI-GUIDED TRUTH-SEEKING
  // =============================================================================

  /**
   * Fact-check a claim against the knowledge graph
   * Searches for related nodes, evaluates credibility, and compiles evidence
   */
  async factCheckClaim(
    pool: Pool,
    claim: string,
    context: {
      targetNodeId?: string;
      targetEdgeId?: string;
      grounds?: any;
    },
    userId: string
  ): Promise<{
    verdict: 'supported' | 'contradicted' | 'insufficient_evidence' | 'needs_clarification';
    confidence: number;
    supportingEvidence: Array<{
      nodeId: string;
      content: string;
      credibilityScore: number;
      relevance: number;
    }>;
    contradictingEvidence: Array<{
      nodeId: string;
      content: string;
      credibilityScore: number;
      relevance: number;
    }>;
    missingContext: string[];
    recommendations: string[];
    analysis: string;
  }> {
    // Rate limit check
    if (!this.checkRateLimit(userId)) {
      throw new Error(
        `You've reached the maximum of ${this.MAX_REQUESTS_PER_HOUR} AI requests per hour. Please try again later.`
      );
    }

    // Fetch target node/edge if specified
    let targetContext = '';
    if (context.targetNodeId) {
      const nodeResult = await pool.query(
        `SELECT n.*, nt.name as node_type_name
         FROM public."Nodes" n
         LEFT JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
         WHERE n.id = $1`,
        [context.targetNodeId]
      );

      if (nodeResult.rows.length > 0) {
        const node = nodeResult.rows[0];
        targetContext = `Target Node: ${node.node_type_name}\nProperties: ${JSON.stringify(node.props)}\nCredibility: ${node.weight}`;
      }
    }

    // Search for related nodes using simple text matching
    // TODO: Use vector similarity search when embeddings are available
    const relatedNodesResult = await pool.query(
      `SELECT n.*, nt.name as node_type_name
       FROM public."Nodes" n
       LEFT JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.visibility = 'public'
       AND (n.props::text ILIKE $1 OR n.meta::text ILIKE $1)
       ORDER BY n.weight DESC
       LIMIT 10`,
      [`%${claim}%`]
    );

    const relatedNodes = relatedNodesResult.rows;

    // Build AI prompt for fact-checking
    const aiPrompt = `You are an objective fact-checker analyzing a claim against a knowledge graph.

CLAIM TO VERIFY:
"${claim}"

${targetContext ? `CONTEXT:\n${targetContext}\n` : ''}

RELATED INFORMATION FROM KNOWLEDGE GRAPH:
${relatedNodes.map((n, i) => `${i + 1}. [${n.node_type_name}] ${JSON.stringify(n.props)} (credibility: ${n.weight})`).join('\n')}

TASK:
1. Analyze the claim against the available evidence
2. Identify supporting evidence (with relevance score 0-1)
3. Identify contradicting evidence (with relevance score 0-1)
4. Determine verdict: supported, contradicted, insufficient_evidence, or needs_clarification
5. Assess confidence level (0-1)
6. Identify missing context needed for complete evaluation
7. Provide recommendations for strengthening the inquiry

Respond with valid JSON in this exact format:
{
  "verdict": "supported|contradicted|insufficient_evidence|needs_clarification",
  "confidence": 0.0-1.0,
  "supportingEvidence": [{"nodeId": "uuid", "relevance": 0.0-1.0, "reasoning": "why relevant"}],
  "contradictingEvidence": [{"nodeId": "uuid", "relevance": 0.0-1.0, "reasoning": "why contradicts"}],
  "missingContext": ["what additional information is needed"],
  "recommendations": ["actionable suggestions for the inquiry"],
  "analysis": "detailed explanation of your reasoning"
}`;

    try {
      const response = await this.callOllama([
        {
          role: 'system',
          content: 'You are an objective fact-checker. Analyze claims rigorously and cite evidence. Return only valid JSON.',
        },
        { role: 'user', content: aiPrompt },
      ], 1000);

      // Parse AI response
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const result = JSON.parse(match[0]);

        // Enrich evidence with actual node data
        const supportingEvidence = result.supportingEvidence.map((ev: any) => {
          const node = relatedNodes.find(n => n.id === ev.nodeId);
          return {
            nodeId: ev.nodeId,
            content: node ? JSON.stringify(node.props) : 'Node not found',
            credibilityScore: node?.weight || 0,
            relevance: ev.relevance,
          };
        });

        const contradictingEvidence = result.contradictingEvidence.map((ev: any) => {
          const node = relatedNodes.find(n => n.id === ev.nodeId);
          return {
            nodeId: ev.nodeId,
            content: node ? JSON.stringify(node.props) : 'Node not found',
            credibilityScore: node?.weight || 0,
            relevance: ev.relevance,
          };
        });

        return {
          verdict: result.verdict,
          confidence: result.confidence,
          supportingEvidence,
          contradictingEvidence,
          missingContext: result.missingContext || [],
          recommendations: result.recommendations || [],
          analysis: result.analysis,
        };
      }

      throw new Error('Failed to parse AI response');
    } catch (error) {
      console.error('Error in fact-checking:', error);

      // Fallback response
      return {
        verdict: 'insufficient_evidence',
        confidence: 0,
        supportingEvidence: [],
        contradictingEvidence: [],
        missingContext: ['Unable to complete fact-check analysis'],
        recommendations: ['Please try again or rephrase the claim'],
        analysis: 'AI fact-checking service encountered an error.',
      };
    }
  }

  /**
   * Generate counter-arguments for a challenge
   * Acts as devil's advocate to strengthen the inquiry
   */
  async generateCounterArguments(
    pool: Pool,
    challengeId: string,
    userId: string
  ): Promise<Array<{
    argument: string;
    reasoning: string;
    evidenceNeeded: string[];
    strength: number;
  }>> {
    // Rate limit check
    if (!this.checkRateLimit(userId)) {
      throw new Error(
        `You've reached the maximum of ${this.MAX_REQUESTS_PER_HOUR} AI requests per hour. Please try again later.`
      );
    }

    // Fetch challenge details
    const challengeResult = await pool.query(
      `SELECT c.*,
              tn.props as target_node_props, tn.weight as target_credibility,
              u.username as challenger_username
       FROM public."Challenges" c
       LEFT JOIN public."Nodes" tn ON c.target_node_id = tn.id
       LEFT JOIN public."Users" u ON c.challenger_id = u.id
       WHERE c.id = $1`,
      [challengeId]
    );

    if (challengeResult.rows.length === 0) {
      throw new Error('Challenge not found');
    }

    const challenge = challengeResult.rows[0];

    // Fetch submitted evidence
    const evidenceResult = await pool.query(
      `SELECT * FROM public."ChallengeEvidence"
       WHERE challenge_id = $1
       ORDER BY created_at`,
      [challengeId]
    );

    const evidence = evidenceResult.rows;

    const aiPrompt = `You are acting as a devil's advocate in a formal inquiry process.

CHALLENGE DETAILS:
Claim: ${challenge.claim}
Grounds: ${challenge.grounds}
Warrant: ${challenge.warrant || 'Not provided'}
Backing: ${challenge.backing || 'Not provided'}

TARGET INFORMATION:
${challenge.target_node_props ? `Properties: ${JSON.stringify(challenge.target_node_props)}` : 'Edge challenge'}
Current Credibility: ${challenge.target_credibility || 'N/A'}

EVIDENCE SUBMITTED:
${evidence.map((e, i) => `${i + 1}. [${e.side}] ${e.content} (credibility: ${e.credibility_score})`).join('\n') || 'No evidence submitted yet'}

TASK:
Generate 3-5 strong counter-arguments that challenge the challenger's position. Your role is to:
1. Identify weaknesses in the challenger's reasoning
2. Present alternative interpretations
3. Highlight missing evidence
4. Suggest stronger evidence that would be needed to support the challenge

Be rigorous but fair. The goal is to strengthen the inquiry, not to "win" an argument.

Respond with valid JSON in this format:
{
  "counterArguments": [
    {
      "argument": "clear statement of counter-argument",
      "reasoning": "detailed explanation",
      "evidenceNeeded": ["specific evidence that would be required"],
      "strength": 0.0-1.0
    }
  ]
}`;

    try {
      const response = await this.callOllama([
        {
          role: 'system',
          content: 'You are a devil\'s advocate in a formal inquiry. Challenge arguments rigorously but fairly. Return only valid JSON.',
        },
        { role: 'user', content: aiPrompt },
      ], 1000);

      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const result = JSON.parse(match[0]);
        return result.counterArguments || [];
      }

      throw new Error('Failed to parse AI response');
    } catch (error) {
      console.error('Error generating counter-arguments:', error);

      // Fallback
      return [{
        argument: 'Unable to generate counter-arguments at this time',
        reasoning: 'AI service encountered an error',
        evidenceNeeded: [],
        strength: 0,
      }];
    }
  }

  /**
   * Discover evidence for a challenge
   * Searches knowledge graph and suggests external sources
   */
  async discoverEvidence(
    pool: Pool,
    challengeId: string,
    side: 'challenger' | 'defender',
    userId: string
  ): Promise<Array<{
    type: 'internal' | 'external';
    source: string;
    description: string;
    searchQuery?: string;
    nodeId?: string;
    relevance: number;
    expectedImpact: 'strong_support' | 'moderate_support' | 'neutral' | 'moderate_contradiction' | 'strong_contradiction';
  }>> {
    // Rate limit check
    if (!this.checkRateLimit(userId)) {
      throw new Error(
        `You've reached the maximum of ${this.MAX_REQUESTS_PER_HOUR} AI requests per hour. Please try again later.`
      );
    }

    // Fetch challenge
    const challengeResult = await pool.query(
      `SELECT c.*,
              tn.props as target_node_props
       FROM public."Challenges" c
       LEFT JOIN public."Nodes" tn ON c.target_node_id = tn.id
       WHERE c.id = $1`,
      [challengeId]
    );

    if (challengeResult.rows.length === 0) {
      throw new Error('Challenge not found');
    }

    const challenge = challengeResult.rows[0];

    // Search for related nodes in knowledge graph
    const relatedNodesResult = await pool.query(
      `SELECT n.*, nt.name as node_type_name
       FROM public."Nodes" n
       LEFT JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.visibility = 'public'
       AND (n.props::text ILIKE $1 OR n.props::text ILIKE $2)
       ORDER BY n.weight DESC
       LIMIT 15`,
      [`%${challenge.claim}%`, `%${JSON.stringify(challenge.grounds)}%`]
    );

    const relatedNodes = relatedNodesResult.rows;

    const aiPrompt = `You are a research assistant helping discover evidence for a formal inquiry.

CHALLENGE:
Claim: ${challenge.claim}
Side: ${side === 'challenger' ? 'Supporting the challenge' : 'Defending against the challenge'}

TARGET:
${challenge.target_node_props ? JSON.stringify(challenge.target_node_props) : 'Edge challenge'}

AVAILABLE INTERNAL EVIDENCE (from knowledge graph):
${relatedNodes.map((n, i) => `${i + 1}. [ID: ${n.id}] ${n.node_type_name}: ${JSON.stringify(n.props)} (credibility: ${n.weight})`).join('\n')}

TASK:
Discover both internal (from knowledge graph) and external (research suggestions) evidence.

For internal evidence:
- Identify which existing nodes are relevant
- Assess relevance (0-1)
- Determine expected impact on the challenge

For external evidence:
- Suggest specific sources to research
- Provide search queries
- Explain what to look for

Respond with valid JSON:
{
  "evidence": [
    {
      "type": "internal|external",
      "source": "node ID or external source name",
      "description": "what this evidence shows",
      "searchQuery": "specific search query (for external)",
      "nodeId": "uuid (for internal)",
      "relevance": 0.0-1.0,
      "expectedImpact": "strong_support|moderate_support|neutral|moderate_contradiction|strong_contradiction"
    }
  ]
}`;

    try {
      const response = await this.callOllama([
        {
          role: 'system',
          content: `You are a research assistant. Help discover evidence for the ${side}. Be thorough and objective. Return only valid JSON.`,
        },
        { role: 'user', content: aiPrompt },
      ], 1200);

      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const result = JSON.parse(match[0]);
        return result.evidence || [];
      }

      throw new Error('Failed to parse AI response');
    } catch (error) {
      console.error('Error discovering evidence:', error);

      // Fallback: return related nodes as evidence
      return relatedNodes.slice(0, 5).map(node => ({
        type: 'internal' as const,
        source: node.id,
        description: `${node.node_type_name}: ${JSON.stringify(node.props)}`,
        nodeId: node.id,
        relevance: node.weight,
        expectedImpact: 'neutral' as const,
      }));
    }
  }

  /**
   * Get process guidance for challenge progression
   * Suggests next steps based on current state
   */
  async getProcessGuidance(
    pool: Pool,
    challengeId: string,
    userId: string
  ): Promise<{
    currentStage: string;
    nextSteps: Array<{
      action: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      estimatedTime: string;
    }>;
    warnings: string[];
    suggestions: string[];
    readinessForResolution?: {
      ready: boolean;
      reasoning: string;
      missingElements: string[];
    };
  }> {
    // Rate limit check
    if (!this.checkRateLimit(userId)) {
      throw new Error(
        `You've reached the maximum of ${this.MAX_REQUESTS_PER_HOUR} AI requests per hour. Please try again later.`
      );
    }

    // Fetch challenge with all related data
    const challengeResult = await pool.query(
      `SELECT c.*,
              COUNT(DISTINCT ce.id) as evidence_count,
              COUNT(DISTINCT cp.id) as participant_count,
              COUNT(DISTINCT cv.id) as vote_count
       FROM public."Challenges" c
       LEFT JOIN public."ChallengeEvidence" ce ON c.id = ce.challenge_id
       LEFT JOIN public."ChallengeParticipants" cp ON c.id = cp.challenge_id
       LEFT JOIN public."ChallengeVotes" cv ON c.id = cv.challenge_id
       WHERE c.id = $1
       GROUP BY c.id`,
      [challengeId]
    );

    if (challengeResult.rows.length === 0) {
      throw new Error('Challenge not found');
    }

    const challenge = challengeResult.rows[0];

    // Fetch evidence details
    const evidenceResult = await pool.query(
      `SELECT side, COUNT(*) as count
       FROM public."ChallengeEvidence"
       WHERE challenge_id = $1
       GROUP BY side`,
      [challengeId]
    );

    const evidenceBySide = evidenceResult.rows.reduce((acc: any, row: any) => {
      acc[row.side] = parseInt(row.count);
      return acc;
    }, { challenger: 0, defender: 0, neutral: 0 });

    const aiPrompt = `You are a process facilitator for a formal inquiry system.

CHALLENGE STATUS:
Status: ${challenge.status}
Claim: ${challenge.claim}
Has Rebuttal: ${challenge.rebuttal_claim ? 'Yes' : 'No'}

PARTICIPATION:
Evidence Submitted: ${challenge.evidence_count} (Challenger: ${evidenceBySide.challenger || 0}, Defender: ${evidenceBySide.defender || 0}, Neutral: ${evidenceBySide.neutral || 0})
Community Participants: ${challenge.participant_count}
Votes Cast: ${challenge.vote_count}

TOULMIN ELEMENTS:
Grounds: ${challenge.grounds ? 'Provided' : 'Missing'}
Warrant: ${challenge.warrant ? 'Provided' : 'Missing'}
Backing: ${challenge.backing ? 'Provided' : 'Missing'}
Qualifier: ${challenge.qualifier ? 'Provided' : 'Missing'}

TASK:
Analyze the current state and provide guidance:
1. Identify current stage (initial_submission, evidence_gathering, deliberation, ready_for_resolution)
2. Suggest next steps with priorities
3. Identify warnings or concerns
4. Assess readiness for resolution

Respond with valid JSON:
{
  "currentStage": "stage name",
  "nextSteps": [
    {
      "action": "specific action to take",
      "description": "why this is important",
      "priority": "high|medium|low",
      "estimatedTime": "rough time estimate"
    }
  ],
  "warnings": ["any concerns about the process"],
  "suggestions": ["recommendations for improvement"],
  "readinessForResolution": {
    "ready": true|false,
    "reasoning": "why ready or not ready",
    "missingElements": ["what's still needed"]
  }
}`;

    try {
      const response = await this.callOllama([
        {
          role: 'system',
          content: 'You are a process facilitator. Guide the formal inquiry fairly and objectively. Return only valid JSON.',
        },
        { role: 'user', content: aiPrompt },
      ], 1000);

      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }

      throw new Error('Failed to parse AI response');
    } catch (error) {
      console.error('Error getting process guidance:', error);

      // Fallback guidance
      const fallback: any = {
        currentStage: challenge.status,
        nextSteps: [],
        warnings: [],
        suggestions: ['Unable to generate AI guidance at this time'],
      };

      // Basic heuristics
      if (challenge.evidence_count === 0) {
        fallback.nextSteps.push({
          action: 'Submit evidence',
          description: 'Both challenger and defender should submit supporting evidence',
          priority: 'high',
          estimatedTime: '1-2 days',
        });
      }

      if (!challenge.rebuttal_claim && challenge.evidence_count > 0) {
        fallback.nextSteps.push({
          action: 'Defender should submit rebuttal',
          description: 'Response to the challenge is needed',
          priority: 'high',
          estimatedTime: '1-2 days',
        });
      }

      return fallback;
    }
  }

  /**
   * Generate summary for resolved challenge
   * Creates comprehensive analysis of the inquiry outcome
   */
  async summarizeChallenge(
    pool: Pool,
    challengeId: string,
    userId: string
  ): Promise<{
    summary: string;
    keyFindings: string[];
    evidenceQuality: {
      challenger: number;
      defender: number;
    };
    communityConsensus?: {
      supportChallenge: number;
      supportDefender: number;
      neutral: number;
    };
    impactAssessment: string;
    recommendations: string[];
  }> {
    // Rate limit check
    if (!this.checkRateLimit(userId)) {
      throw new Error(
        `You've reached the maximum of ${this.MAX_REQUESTS_PER_HOUR} AI requests per hour. Please try again later.`
      );
    }

    // Fetch complete challenge record
    const challengeResult = await pool.query(
      `SELECT c.*,
              tn.props as target_node_props, tn.weight as original_credibility,
              u.username as challenger_username
       FROM public."Challenges" c
       LEFT JOIN public."Nodes" tn ON c.target_node_id = tn.id
       LEFT JOIN public."Users" u ON c.challenger_id = u.id
       WHERE c.id = $1`,
      [challengeId]
    );

    if (challengeResult.rows.length === 0) {
      throw new Error('Challenge not found');
    }

    const challenge = challengeResult.rows[0];

    // Fetch all evidence
    const evidenceResult = await pool.query(
      `SELECT * FROM public."ChallengeEvidence"
       WHERE challenge_id = $1
       ORDER BY created_at`,
      [challengeId]
    );

    const evidence = evidenceResult.rows;

    // Fetch votes
    const votesResult = await pool.query(
      `SELECT vote_type, COUNT(*) as count
       FROM public."ChallengeVotes"
       WHERE challenge_id = $1
       GROUP BY vote_type`,
      [challengeId]
    );

    const votes = votesResult.rows.reduce((acc: any, row: any) => {
      acc[row.vote_type] = parseInt(row.count);
      return acc;
    }, {});

    const aiPrompt = `You are summarizing the outcome of a formal inquiry challenge.

CHALLENGE:
Claim: ${challenge.claim}
Challenger: ${challenge.challenger_username}
Resolution: ${challenge.resolution || 'Not resolved'}

ARGUMENTS:
Challenger's Position:
- Grounds: ${challenge.grounds}
- Warrant: ${challenge.warrant}
- Backing: ${challenge.backing}

${challenge.rebuttal_claim ? `Defender's Rebuttal:
- Claim: ${challenge.rebuttal_claim}
- Grounds: ${challenge.rebuttal_grounds}
- Warrant: ${challenge.rebuttal_warrant}` : 'No rebuttal submitted'}

EVIDENCE (${evidence.length} pieces):
${evidence.map((e, i) => `${i + 1}. [${e.side}] ${e.content} (credibility: ${e.credibility_score})`).join('\n')}

COMMUNITY VOTES:
Support Challenge: ${votes.support_challenge || 0}
Support Defender: ${votes.support_defender || 0}
Neutral: ${votes.neutral || 0}

OFFICIAL RESOLUTION:
${challenge.resolution_summary || 'Not provided'}
Reasoning: ${challenge.resolution_reasoning || 'Not provided'}

TASK:
Create a comprehensive summary of this formal inquiry:
1. Summarize the challenge and outcome
2. Identify key findings
3. Assess evidence quality for both sides (0-1)
4. Analyze community consensus
5. Assess impact on knowledge graph credibility
6. Provide recommendations

Respond with valid JSON:
{
  "summary": "2-3 paragraph summary",
  "keyFindings": ["important discoveries or conclusions"],
  "evidenceQuality": {
    "challenger": 0.0-1.0,
    "defender": 0.0-1.0
  },
  "communityConsensus": {
    "supportChallenge": percentage,
    "supportDefender": percentage,
    "neutral": percentage
  },
  "impactAssessment": "how this affects knowledge graph credibility",
  "recommendations": ["suggestions for future challenges or improvements"]
}`;

    try {
      const response = await this.callOllama([
        {
          role: 'system',
          content: 'You are a judicial summarizer. Create fair, balanced summaries of formal inquiries. Return only valid JSON.',
        },
        { role: 'user', content: aiPrompt },
      ], 1500);

      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }

      throw new Error('Failed to parse AI response');
    } catch (error) {
      console.error('Error summarizing challenge:', error);

      // Fallback summary
      const totalVotes = (votes.support_challenge || 0) + (votes.support_defender || 0) + (votes.neutral || 0);
      return {
        summary: `Challenge "${challenge.claim}" was ${challenge.resolution}. ${evidence.length} pieces of evidence were submitted.`,
        keyFindings: ['Unable to generate detailed findings'],
        evidenceQuality: {
          challenger: 0.5,
          defender: 0.5,
        },
        communityConsensus: totalVotes > 0 ? {
          supportChallenge: ((votes.support_challenge || 0) / totalVotes) * 100,
          supportDefender: ((votes.support_defender || 0) / totalVotes) * 100,
          neutral: ((votes.neutral || 0) / totalVotes) * 100,
        } : undefined,
        impactAssessment: 'Impact assessment unavailable',
        recommendations: ['Review evidence quality standards'],
      };
    }
  }
}
