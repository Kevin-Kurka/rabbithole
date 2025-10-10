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
}
