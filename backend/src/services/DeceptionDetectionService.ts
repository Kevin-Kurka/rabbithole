import { Pool } from 'pg';
import axios from 'axios';

/**
 * Deception Detection Service
 *
 * Analyzes article text for:
 * - Logical fallacies (ad hominem, straw man, false dichotomy, slippery slope, etc.)
 * - Exaggerations and hyperbole
 * - False comparisons and analogies
 * - Misleading statistics
 * - Out of context quotes
 * - Cherry-picking data
 * - Appeal to authority/emotion
 * - Red herrings
 */

export interface LogicalFallacy {
  type: string;
  name: string;
  description: string;
  examples: string[];
}

export interface DeceptionMatch {
  // Text segment
  text: string;
  startOffset: number;
  endOffset: number;

  // Deception details
  fallacyType: string;
  fallacyName: string;
  explanation: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number; // 0.0-1.0

  // Context
  surroundingContext: string;
  suggestedCorrection?: string;

  // Supporting/contradicting evidence
  contradictingSources?: Array<{
    nodeId: string;
    title: string;
    excerpt: string;
    relevance: number;
  }>;
}

export interface DeceptionAnalysisResult {
  // Overall assessment
  overallScore: number; // 0.0 (highly deceptive) to 1.0 (highly trustworthy)
  deceptionCount: number;
  fallacyCount: number;

  // Detected deceptions
  deceptions: DeceptionMatch[];

  // Summary
  summary: string;
  recommendations: string[];

  // AI model used
  aiModel: string;
  analysisTimestamp: string;
}

export class DeceptionDetectionService {
  private ollamaUrl: string;
  private ollamaModel: string;

  // Comprehensive list of logical fallacies to detect
  private readonly LOGICAL_FALLACIES: LogicalFallacy[] = [
    {
      type: 'ad_hominem',
      name: 'Ad Hominem',
      description: 'Attacking the person instead of addressing their argument',
      examples: ['He's a liar, so his climate change research must be wrong', 'She's too young to understand economics']
    },
    {
      type: 'straw_man',
      name: 'Straw Man',
      description: 'Misrepresenting an argument to make it easier to attack',
      examples: ['You want to reduce military spending? So you hate our troops!', 'Environmentalists want to destroy the economy']
    },
    {
      type: 'false_dichotomy',
      name: 'False Dichotomy',
      description: 'Presenting only two options when more exist',
      examples: ['You're either with us or against us', 'Either we ban all guns or accept mass shootings']
    },
    {
      type: 'slippery_slope',
      name: 'Slippery Slope',
      description: 'Claiming one step will inevitably lead to extreme consequences',
      examples: ['If we legalize marijuana, next we'll legalize all drugs', 'If we raise minimum wage, the economy will collapse']
    },
    {
      type: 'appeal_to_authority',
      name: 'Appeal to Authority',
      description: 'Using an authority figure's opinion as the sole evidence',
      examples: ['Einstein believed in God, so atheism is wrong', 'This celebrity endorses it, so it must be good']
    },
    {
      type: 'appeal_to_emotion',
      name: 'Appeal to Emotion',
      description: 'Using emotions instead of logic to persuade',
      examples: ['Think of the children!', 'How can you say no to this face?']
    },
    {
      type: 'red_herring',
      name: 'Red Herring',
      description: 'Introducing irrelevant information to distract from the main issue',
      examples: ['Why worry about climate change when people are homeless?', 'He may have lied, but what about her emails?']
    },
    {
      type: 'exaggeration',
      name: 'Exaggeration/Hyperbole',
      description: 'Extreme overstatement that distorts the truth',
      examples: ['Everyone knows that...', 'This is the worst disaster in history', 'Nobody disagrees with this']
    },
    {
      type: 'false_comparison',
      name: 'False Comparison',
      description: 'Comparing two things that are not truly comparable',
      examples: ['Taxes are theft', 'Abortion is like the Holocaust', 'Social media is just like cigarettes']
    },
    {
      type: 'cherry_picking',
      name: 'Cherry-Picking Data',
      description: 'Selecting only data that supports your conclusion',
      examples: ['Crime is up in this one neighborhood, so the city is dangerous', 'One study found X, so Y is proven']
    },
    {
      type: 'misleading_statistic',
      name: 'Misleading Statistic',
      description: 'Using statistics in a deceptive way (no context, wrong units, etc.)',
      examples: ['80% increase! (from 1 to 1.8)', '9 out of 10 doctors recommend (in our paid survey)']
    },
    {
      type: 'out_of_context',
      name: 'Out of Context Quote',
      description: 'Removing a quote from its original context to change its meaning',
      examples: ['He said "destroy the economy" (taken from: "This policy won\'t destroy the economy")']
    },
    {
      type: 'hasty_generalization',
      name: 'Hasty Generalization',
      description: 'Drawing broad conclusions from limited evidence',
      examples: ['My friend got sick from the vaccine, so vaccines are dangerous', 'I met a rude person from that country']
    },
    {
      type: 'circular_reasoning',
      name: 'Circular Reasoning',
      description: 'Using the conclusion as a premise (begging the question)',
      examples: ['The Bible is true because it says so in the Bible', 'This law is just because it is the law']
    },
    {
      type: 'tu_quoque',
      name: 'Tu Quoque (Whataboutism)',
      description: 'Deflecting criticism by pointing out hypocrisy',
      examples: ['You can't criticize my carbon footprint when you drive a car', 'What about when your side did the same thing?']
    }
  ];

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';
  }

  /**
   * Analyze article text for deception and logical fallacies
   */
  async analyzeArticle(
    pool: Pool,
    nodeId: string,
    articleText: string
  ): Promise<DeceptionAnalysisResult> {
    // Build comprehensive prompt for AI analysis
    const prompt = this.buildAnalysisPrompt(articleText);

    try {
      // Call Ollama AI
      const aiResponse = await this.callOllama(prompt, 2000);

      // Parse AI response
      const deceptions = this.parseAIResponse(aiResponse, articleText);

      // Search for contradicting sources in knowledge graph
      await this.enrichWithSources(pool, nodeId, deceptions);

      // Calculate overall trustworthiness score
      const overallScore = this.calculateTrustworthiness(deceptions);

      // Generate summary
      const summary = this.generateSummary(deceptions, overallScore);

      return {
        overallScore,
        deceptionCount: deceptions.length,
        fallacyCount: deceptions.filter(d => d.fallacyType !== 'exaggeration' && d.fallacyType !== 'misleading_statistic').length,
        deceptions,
        summary,
        recommendations: this.generateRecommendations(deceptions),
        aiModel: this.ollamaModel,
        analysisTimestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in deception analysis:', error);
      throw new Error(`Failed to analyze article for deception: ${error}`);
    }
  }

  /**
   * Build comprehensive prompt for AI analysis
   */
  private buildAnalysisPrompt(articleText: string): string {
    const fallacyList = this.LOGICAL_FALLACIES.map((f, i) =>
      `${i + 1}. ${f.name} (${f.type}): ${f.description}\n   Example: ${f.examples[0]}`
    ).join('\n');

    return `You are an expert fact-checker and critical thinking analyst. Analyze the following article text for logical fallacies, deceptive rhetoric, exaggerations, and misleading information.

ARTICLE TEXT:
"""
${articleText}
"""

LOGICAL FALLACIES TO DETECT:
${fallacyList}

TASK:
1. Identify ALL instances of logical fallacies, deception, exaggeration, or misleading statements
2. For each instance, provide:
   - The exact text (quote from article)
   - The type of fallacy/deception
   - Explanation of why it's problematic
   - Severity (low, medium, high)
   - Confidence score (0.0-1.0)
   - Suggested correction (if applicable)

3. Be thorough but fair - don't flag legitimate arguments as fallacies
4. Focus on substantive deception, not minor rhetorical flourishes

OUTPUT FORMAT (valid JSON array):
[
  {
    "text": "exact quote from article",
    "fallacyType": "type from list above",
    "fallacyName": "human-readable name",
    "explanation": "detailed explanation",
    "severity": "low|medium|high",
    "confidence": 0.0-1.0,
    "suggestedCorrection": "optional correction"
  }
]

Return ONLY the JSON array, no other text.`;
  }

  /**
   * Call Ollama AI API
   */
  private async callOllama(prompt: string, maxTokens: number = 1000): Promise<string> {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.ollamaModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.3, // Lower temperature for more analytical responses
          num_predict: maxTokens,
        },
      });

      return response.data.response;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama is not running. Please start Ollama with: ollama serve');
      }
      throw error;
    }
  }

  /**
   * Parse AI response into structured deception matches
   */
  private parseAIResponse(aiResponse: string, articleText: string): DeceptionMatch[] {
    try {
      // Extract JSON from response (AI might include extra text)
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('No JSON array found in AI response');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Convert to DeceptionMatch format
      const deceptions: DeceptionMatch[] = parsed.map((item: any) => {
        // Find the text in the article
        const startOffset = articleText.indexOf(item.text);
        const endOffset = startOffset + item.text.length;

        // Get surrounding context (50 chars before and after)
        const contextStart = Math.max(0, startOffset - 50);
        const contextEnd = Math.min(articleText.length, endOffset + 50);
        const surroundingContext = articleText.substring(contextStart, contextEnd);

        return {
          text: item.text,
          startOffset,
          endOffset,
          fallacyType: item.fallacyType,
          fallacyName: item.fallacyName,
          explanation: item.explanation,
          severity: item.severity || 'medium',
          confidence: item.confidence || 0.7,
          surroundingContext,
          suggestedCorrection: item.suggestedCorrection
        };
      });

      return deceptions.filter(d => d.startOffset >= 0); // Only keep matches found in text
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return [];
    }
  }

  /**
   * Enrich deceptions with contradicting sources from knowledge graph
   */
  private async enrichWithSources(
    pool: Pool,
    nodeId: string,
    deceptions: DeceptionMatch[]
  ): Promise<void> {
    for (const deception of deceptions) {
      try {
        // Search for nodes that might contradict this claim
        const result = await pool.query(
          `SELECT n.id, n.props->>'title' as title, n.props->>'content' as content, n.weight
           FROM public."Nodes" n
           WHERE n.id != $1
             AND n.visibility = 'public'
             AND (n.props::text ILIKE $2 OR n.props::text ILIKE $3)
           ORDER BY n.weight DESC
           LIMIT 3`,
          [nodeId, `%${deception.text.substring(0, 50)}%`, `%${deception.fallacyType}%`]
        );

        if (result.rows.length > 0) {
          deception.contradictingSources = result.rows.map(row => ({
            nodeId: row.id,
            title: row.title || 'Untitled',
            excerpt: (row.content || '').substring(0, 200),
            relevance: row.weight || 0.5
          }));
        }
      } catch (error) {
        console.error('Failed to fetch contradicting sources:', error);
      }
    }
  }

  /**
   * Calculate overall trustworthiness score
   */
  private calculateTrustworthiness(deceptions: DeceptionMatch[]): number {
    if (deceptions.length === 0) {
      return 1.0; // Perfect score if no deceptions detected
    }

    // Weight deceptions by severity and confidence
    const totalPenalty = deceptions.reduce((sum, d) => {
      const severityWeight = d.severity === 'high' ? 3 : d.severity === 'medium' ? 2 : 1;
      return sum + (severityWeight * d.confidence);
    }, 0);

    // Normalize to 0-1 scale (more deceptions = lower score)
    const score = Math.max(0, 1 - (totalPenalty / (deceptions.length * 3)));
    return Math.round(score * 100) / 100;
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(deceptions: DeceptionMatch[], score: number): string {
    if (deceptions.length === 0) {
      return 'No significant logical fallacies or deceptive rhetoric detected. The article appears to present arguments fairly.';
    }

    const highSeverity = deceptions.filter(d => d.severity === 'high').length;
    const mediumSeverity = deceptions.filter(d => d.severity === 'medium').length;
    const lowSeverity = deceptions.filter(d => d.severity === 'low').length;

    const fallacyTypes = [...new Set(deceptions.map(d => d.fallacyName))];

    let summary = `Analysis detected ${deceptions.length} potential issue${deceptions.length > 1 ? 's' : ''}: `;

    if (highSeverity > 0) summary += `${highSeverity} high severity, `;
    if (mediumSeverity > 0) summary += `${mediumSeverity} medium severity, `;
    if (lowSeverity > 0) summary += `${lowSeverity} low severity. `;

    summary += `\n\nMost common issues: ${fallacyTypes.slice(0, 3).join(', ')}.`;
    summary += `\n\nOverall trustworthiness score: ${(score * 100).toFixed(0)}%`;

    return summary;
  }

  /**
   * Generate recommendations for improvement
   */
  private generateRecommendations(deceptions: DeceptionMatch[]): string[] {
    const recommendations: string[] = [];

    const fallacyTypes = deceptions.reduce((acc, d) => {
      acc[d.fallacyType] = (acc[d.fallacyType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Specific recommendations based on detected fallacies
    if (fallacyTypes.ad_hominem) {
      recommendations.push('Avoid personal attacks - focus on addressing arguments with evidence');
    }
    if (fallacyTypes.exaggeration) {
      recommendations.push('Use precise language and avoid hyperbole - provide specific data instead');
    }
    if (fallacyTypes.false_comparison) {
      recommendations.push('Ensure comparisons are valid and relevant to the argument');
    }
    if (fallacyTypes.cherry_picking) {
      recommendations.push('Present comprehensive data - include evidence that contradicts your conclusion');
    }
    if (fallacyTypes.misleading_statistic) {
      recommendations.push('Provide full context for statistics - include sample size, methodology, and timeframe');
    }
    if (fallacyTypes.appeal_to_emotion) {
      recommendations.push('Support emotional appeals with logical arguments and evidence');
    }

    // General recommendations
    recommendations.push('Support claims with credible sources and data');
    recommendations.push('Consider counterarguments and address them fairly');

    return recommendations;
  }

  /**
   * Save deception analysis to database
   */
  async saveAnalysis(
    pool: Pool,
    nodeId: string,
    analysisResult: DeceptionAnalysisResult,
    userId?: string
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Save each detected deception as an annotation
      for (const deception of analysisResult.deceptions) {
        // Insert annotation
        const annotationResult = await client.query(
          `INSERT INTO public."Annotations" (
            target_node_id, start_offset, end_offset, highlighted_text,
            annotation_type, deception_type, confidence, explanation,
            color, severity, is_ai_generated, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
          RETURNING id`,
          [
            nodeId,
            deception.startOffset,
            deception.endOffset,
            deception.text,
            'deception',
            deception.fallacyType,
            deception.confidence,
            deception.explanation,
            this.getSeverityColor(deception.severity),
            deception.severity,
            true, // AI-generated
            'approved' // Auto-approve AI annotations (can be disputed by users)
          ]
        );

        const annotationId = annotationResult.rows[0].id;

        // Insert detailed analysis
        await client.query(
          `INSERT INTO public."DeceptionAnalysis" (
            annotation_id, target_node_id, fallacy_type, explanation,
            supporting_context, suggested_correction, contradicting_sources,
            severity_score, confidence, ai_model, ai_raw_response, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())`,
          [
            annotationId,
            nodeId,
            deception.fallacyType,
            deception.explanation,
            deception.surroundingContext,
            deception.suggestedCorrection,
            JSON.stringify(deception.contradictingSources || []),
            deception.severity === 'high' ? 0.9 : deception.severity === 'medium' ? 0.6 : 0.3,
            deception.confidence,
            analysisResult.aiModel,
            JSON.stringify({ summary: analysisResult.summary })
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to save deception analysis:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: 'low' | 'medium' | 'high'): string {
    switch (severity) {
      case 'high': return '#EF4444'; // Red
      case 'medium': return '#F59E0B'; // Amber
      case 'low': return '#FCD34D'; // Yellow
      default: return '#FFFF00';
    }
  }
}
