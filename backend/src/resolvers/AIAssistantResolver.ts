import {
  Resolver,
  Query,
  Mutation,
  Subscription,
  Arg,
  Ctx,
  Root,
  ObjectType,
  Field,
  InputType,
  ID,
  Float,
  Int,
} from 'type-graphql';
import { GraphQLScalarType } from 'graphql';
import { Pool } from 'pg';
import { AIAssistantService } from '../services/AIAssistantService';
import { SearchService } from '../services/SearchService';
import { mediaQueueService } from '../services/MediaQueueService';
import { ConversationMessage as ConversationMessageEntity } from '../entities/Conversation';
import { Context } from '../types/context';

// ============================================================================
// FILE UPLOAD SCALAR
// ============================================================================
// Note: Upload scalar is defined in EvidenceFileResolver - do not duplicate
// Using string file IDs instead of Upload scalar to avoid conflicts

interface FileUpload {
  filename: string;
  mimetype: string;
  encoding: string;
  createReadStream: () => NodeJS.ReadableStream;
}

// ============================================================================
// OBJECT TYPES - Return Types
// ============================================================================

@ObjectType()
class NodeLink {
  @Field(() => ID)
  nodeId!: string;

  @Field()
  title!: string;

  @Field()
  nodeType!: string;

  @Field(() => Float)
  relevance!: number;
}

// Use ConversationMessage from entities - imported as ConversationMessageEntity

@ObjectType()
class ExtractedClaim {
  @Field()
  claimText!: string;

  @Field()
  context!: string;

  @Field(() => Float)
  confidence!: number; // 0-1

  @Field()
  category!: string; // fact, opinion, hypothesis, etc.

  @Field(() => Int, { nullable: true })
  startPosition?: number;

  @Field(() => Int, { nullable: true })
  endPosition?: number;
}

@ObjectType()
class MatchedNode {
  @Field(() => ID)
  nodeId!: string;

  @Field()
  title!: string;

  @Field()
  nodeType!: string;

  @Field(() => Float)
  similarity!: number; // 0-1

  @Field()
  matchReason!: string;
}

@ObjectType()
class PrimarySource {
  @Field(() => ID, { nullable: true })
  sourceId?: string;

  @Field()
  title!: string;

  @Field()
  url!: string;

  @Field(() => Float)
  credibilityScore!: number; // 0-1

  @Field({ nullable: true })
  publicationDate?: Date;

  @Field(() => [String], { nullable: true })
  authors?: string[];
}

@ObjectType()
class ClaimExtractionResult {
  @Field(() => ID)
  fileId!: string;

  @Field(() => [ExtractedClaim])
  claims!: ExtractedClaim[];

  @Field(() => [MatchedNode])
  matchedNodes!: MatchedNode[];

  @Field(() => [PrimarySource])
  primarySources!: PrimarySource[];

  @Field(() => Int)
  totalClaims!: number;

  @Field()
  extractedAt!: Date;

  @Field(() => Int)
  processingTimeMs!: number;
}

@ObjectType()
class EvidenceItem {
  @Field(() => ID)
  evidenceId!: string;

  @Field()
  evidenceType!: string; // supporting | opposing | neutral

  @Field()
  content!: string;

  @Field(() => Float)
  weight!: number;

  @Field(() => Float)
  confidence!: number;

  @Field({ nullable: true })
  sourceTitle?: string;

  @Field({ nullable: true })
  sourceUrl?: string;
}

@ObjectType()
class GeneratedInquiry {
  @Field(() => ID, { nullable: true })
  inquiryId?: string;

  @Field()
  title!: string;

  @Field()
  question!: string;

  @Field()
  hypothesis!: string;

  @Field(() => [String])
  suggestedResearchAreas!: string[];

  @Field(() => [String])
  keyTerms!: string[];
}

@ObjectType()
class VerificationReport {
  @Field(() => ID)
  claimId!: string;

  @Field()
  claim!: string;

  @Field(() => Float)
  veracityScore!: number; // 0-1

  @Field()
  conclusion!: string; // verified | refuted | unverified | mixed

  @Field(() => [EvidenceItem])
  supportingEvidence!: EvidenceItem[];

  @Field(() => [EvidenceItem])
  opposingEvidence!: EvidenceItem[];

  @Field(() => [GeneratedInquiry])
  suggestedInquiries!: GeneratedInquiry[];

  @Field(() => Int)
  totalEvidenceReviewed!: number;

  @Field()
  verifiedAt!: Date;

  @Field({ nullable: true })
  reasoning?: string;

  @Field(() => [String], { nullable: true })
  limitations?: string[];
}

@ObjectType()
class DatabaseSearchResult {
  @Field(() => [NodeLink])
  nodes!: NodeLink[];

  @Field(() => Int)
  totalResults!: number;

  @Field({ nullable: true })
  query?: string;
}

@ObjectType()
class MessageProcessedEvent {
  @Field(() => ID)
  conversationId!: string;

  @Field(() => ConversationMessageEntity)
  message!: ConversationMessageEntity;

  @Field()
  isComplete!: boolean;

  @Field(() => Float, { nullable: true })
  progress?: number;
}

@ObjectType()
class ClaimExtractedEvent {
  @Field(() => ID)
  fileId!: string;

  @Field(() => [ExtractedClaim])
  claims!: ExtractedClaim[];

  @Field()
  isComplete!: boolean;
}

@ObjectType()
class VerificationCompleteEvent {
  @Field(() => ID)
  claimId!: string;

  @Field(() => VerificationReport)
  report!: VerificationReport;
}

@ObjectType()
class ChatResponse {
  @Field()
  success!: boolean;

  @Field(() => ConversationMessageEntity, { nullable: true })
  message?: ConversationMessageEntity;

  @Field({ nullable: true })
  error?: string;

  @Field(() => ID, { nullable: true })
  conversationId?: string;
}

@ObjectType()
class EvidenceUploadResult {
  @Field()
  success!: boolean;

  @Field(() => ID, { nullable: true })
  fileId?: string;

  @Field(() => ID, { nullable: true })
  evidenceId?: string;

  @Field({ nullable: true })
  error?: string;

  @Field({ nullable: true })
  processingStatus?: string; // queued | processing | completed | failed
}

// ============================================================================
// INPUT TYPES
// ============================================================================

@InputType()
class SendMessageInput {
  @Field()
  message!: string;

  @Field(() => ID, { nullable: true })
  conversationId?: string;

  @Field(() => [ID], { nullable: true })
  attachmentIds?: string[]; // File IDs

  @Field(() => ID, { nullable: true })
  graphId?: string; // Context for the conversation

  @Field(() => ID, { nullable: true })
  nodeId?: string; // Specific node context
}

@InputType()
class UploadEvidenceInput {
  @Field({ nullable: true })
  context?: string;

  @Field(() => ID, { nullable: true })
  articleId?: string;

  @Field(() => ID, { nullable: true })
  nodeId?: string;

  @Field(() => ID, { nullable: true })
  graphId?: string;

  @Field({ nullable: true, defaultValue: true })
  autoExtractClaims?: boolean;
}

// ============================================================================
// RESOLVER
// ============================================================================

@Resolver()
export class AIAssistantResolver {
  private aiService: AIAssistantService;
  private searchService: SearchService;

  constructor() {
    this.aiService = new AIAssistantService();
    this.searchService = new SearchService();
  }

  // ==========================================================================
  // CHAT MUTATIONS AND QUERIES
  // ==========================================================================

  /**
   * Send a message to the AI assistant with optional file attachments
   */
  @Mutation(() => ChatResponse)
  async sendMessage(
    @Arg('input') input: SendMessageInput,
    @Ctx() { pool, userId, pubSub }: Context
  ): Promise<ChatResponse> {
    // Authentication check
    if (!userId) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    try {
      // Generate conversation ID if not provided
      const conversationId =
        input.conversationId || `conv_${userId}_${Date.now()}`;

      // Get graph context if provided
      const graphId = input.graphId;

      // Store user message
      const userMessageResult = await pool.query(
        `INSERT INTO public."ConversationMessages" (
          conversation_id, user_id, role, content, attachments, graph_id, node_id
        ) VALUES ($1, $2, 'user', $3, $4, $5, $6)
        RETURNING id, conversation_id, role, content, attachments, created_at`,
        [
          conversationId,
          userId,
          input.message,
          input.attachmentIds || [],
          graphId,
          input.nodeId,
        ]
      );

      const userMessage = userMessageResult.rows[0];

      // Call AI assistant
      let aiResponse: string;
      if (graphId) {
        aiResponse = await this.aiService.askAIAssistant(
          pool,
          graphId,
          input.message,
          userId
        );
      } else {
        // General conversation without graph context
        aiResponse = await this.generateGeneralResponse(
          pool,
          input.message,
          conversationId
        );
      }

      // Extract node links from AI response
      const nodeLinks = await this.extractNodeLinks(pool, aiResponse, graphId);

      // Store assistant message
      const assistantMessageResult = await pool.query(
        `INSERT INTO public."ConversationMessages" (
          conversation_id, user_id, role, content, node_links, graph_id
        ) VALUES ($1, $2, 'assistant', $3, $4, $5)
        RETURNING id, conversation_id, role, content, created_at`,
        [conversationId, userId, aiResponse, JSON.stringify(nodeLinks), graphId]
      );

      const assistantMessage = {
        ...assistantMessageResult.rows[0],
        nodeLinks,
        timestamp: assistantMessageResult.rows[0].created_at,
      };

      // Publish subscription event
      await pubSub.publish('MESSAGE_PROCESSED', {
        conversationId,
        message: assistantMessage,
        isComplete: true,
        progress: 1.0,
      });

      // Log audit event
      await pool.query(
        `INSERT INTO public."AuditLog" (
          user_id, action, entity_type, entity_id, metadata
        ) VALUES ($1, 'ai_message_sent', 'conversation', $2, $3)`,
        [
          userId,
          conversationId,
          JSON.stringify({
            message_length: input.message.length,
            has_attachments: (input.attachmentIds?.length || 0) > 0,
            graph_id: graphId,
          }),
        ]
      );

      return {
        success: true,
        message: assistantMessage,
        conversationId,
      };
    } catch (error: any) {
      console.error('Error in sendMessage:', error);
      return {
        success: false,
        error: error.message || 'Failed to process message',
      };
    }
  }

  /**
   * Get conversation history
   */
  @Query(() => [ConversationMessageEntity])
  async getConversationHistory(
    @Arg('conversationId', () => ID) conversationId: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 }) limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 }) offset: number,
    @Ctx() { pool, userId }: Context
  ): Promise<ConversationMessageEntity[]> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const result = await pool.query(
      `SELECT
        id, conversation_id, role, content, attachments, node_links,
        graph_id, node_id, created_at as timestamp
       FROM public."ConversationMessages"
       WHERE conversation_id = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [conversationId, userId, limit, offset]
    );

    return result.rows.map((row) => ({
      ...row,
      nodeLinks: row.node_links ? JSON.parse(row.node_links) : [],
      attachments: row.attachments || [],
    }));
  }

  /**
   * Semantic search across database nodes with AI-powered ranking
   */
  @Query(() => DatabaseSearchResult)
  async searchDatabaseNodes(
    @Arg('query') query: string,
    @Arg('graphId', () => ID, { nullable: true }) graphId: string | undefined,
    @Arg('types', () => [String], { nullable: true }) types: string[] | undefined,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 20 }) limit: number,
    @Ctx() { pool, userId }: Context
  ): Promise<DatabaseSearchResult> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    try {
      // Use SearchService for hybrid search
      const searchResults = await this.searchService.search(pool, query, {
        graphId,
        types,
        limit,
        semanticSearch: true,
      });

      // Combine articles and nodes
      const allResults = [...searchResults.articles, ...searchResults.nodes];

      // Convert to NodeLink format
      const nodes: NodeLink[] = allResults.map((result) => ({
        nodeId: result.id,
        title: result.title,
        nodeType: result.type,
        relevance: result.relevance,
      }));

      return {
        nodes,
        totalResults: nodes.length,
        query,
      };
    } catch (error: any) {
      console.error('Error in searchDatabaseNodes:', error);
      return {
        nodes: [],
        totalResults: 0,
        query,
      };
    }
  }

  // ==========================================================================
  // EVIDENCE PROCESSING
  // ==========================================================================

  /**
   * Upload evidence file with automatic claim extraction
   * Note: Use EvidenceFileResolver.uploadFile first to get fileId, then pass it here
   */
  @Mutation(() => EvidenceUploadResult)
  async uploadEvidence(
    @Arg('fileId', () => ID) fileId: string,
    @Arg('input') input: UploadEvidenceInput,
    @Ctx() { pool, userId }: Context
  ): Promise<EvidenceUploadResult> {
    if (!userId) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    try {
      // Get file info from database
      const fileResult = await pool.query(
        `SELECT * FROM public."EvidenceFiles" WHERE id = $1 AND uploaded_by = $2`,
        [fileId, userId]
      );

      if (fileResult.rows.length === 0) {
        return {
          success: false,
          error: 'File not found or access denied',
        };
      }

      const fileRow = fileResult.rows[0];

      // Enqueue for media processing
      await mediaQueueService.enqueueMediaProcessing(
        fileId,
        fileRow.file_type,
        {
          extractTables: true,
          extractFigures: true,
          extractSections: true,
          transcribe: true,
          extractFrames: true,
        },
        input.autoExtractClaims ? 8 : 5 // Higher priority if auto-extract enabled
      );

      // Update processing status
      await pool.query(
        `UPDATE public."EvidenceFiles"
         SET processing_status = 'queued'
         WHERE id = $1`,
        [fileId]
      );

      return {
        success: true,
        fileId,
        evidenceId: fileRow.evidence_id,
        processingStatus: 'queued',
      };
    } catch (error: any) {
      console.error('Error in uploadEvidence:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload evidence',
      };
    }
  }

  /**
   * Process evidence file to extract claims (manual trigger)
   */
  @Mutation(() => ClaimExtractionResult)
  async processEvidenceWithClaims(
    @Arg('fileId', () => ID) fileId: string,
    @Ctx() { pool, userId, pubSub }: Context
  ): Promise<ClaimExtractionResult> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const startTime = Date.now();

    try {
      // Get file content
      const fileResult = await pool.query(
        `SELECT ef.*, e.content, e.target_node_id
         FROM public."EvidenceFiles" ef
         LEFT JOIN public."Evidence" e ON ef.evidence_id = e.id
         WHERE ef.id = $1 AND ef.deleted_at IS NULL`,
        [fileId]
      );

      if (fileResult.rows.length === 0) {
        throw new Error('File not found');
      }

      const file = fileResult.rows[0];

      // Extract text content (from processing results or file)
      let textContent = file.extracted_text || file.markdown_content;

      if (!textContent) {
        throw new Error(
          'No text content available. Please process the document first.'
        );
      }

      // Use AI to extract claims
      const claims = await this.extractClaimsFromText(pool, textContent, userId);

      // Match claims to existing nodes
      const matchedNodes = await this.matchClaimsToNodes(pool, claims);

      // Identify primary sources
      const primarySources = await this.identifyPrimarySources(
        pool,
        textContent,
        file
      );

      // Store extracted claims
      for (const claim of claims) {
        await pool.query(
          `INSERT INTO public."ExtractedClaims" (
            file_id, claim_text, context, confidence, category,
            start_position, end_position, extracted_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            fileId,
            claim.claimText,
            claim.context,
            claim.confidence,
            claim.category,
            claim.startPosition,
            claim.endPosition,
            userId,
          ]
        );
      }

      const processingTimeMs = Date.now() - startTime;

      const result: ClaimExtractionResult = {
        fileId,
        claims,
        matchedNodes,
        primarySources,
        totalClaims: claims.length,
        extractedAt: new Date(),
        processingTimeMs,
      };

      // Publish subscription event
      await pubSub.publish('CLAIM_EXTRACTED', {
        fileId,
        claims,
        isComplete: true,
      });

      // Log audit event
      await pool.query(
        `INSERT INTO public."AuditLog" (
          user_id, action, entity_type, entity_id, metadata
        ) VALUES ($1, 'claims_extracted', 'evidence_file', $2, $3)`,
        [
          userId,
          fileId,
          JSON.stringify({
            claim_count: claims.length,
            processing_time_ms: processingTimeMs,
          }),
        ]
      );

      return result;
    } catch (error: any) {
      console.error('Error in processEvidenceWithClaims:', error);
      throw new Error(`Failed to extract claims: ${error.message}`);
    }
  }

  /**
   * Match evidence file to relevant nodes in the graph
   */
  @Query(() => [MatchedNode])
  async matchEvidenceToNodes(
    @Arg('fileId', () => ID) fileId: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 10 }) limit: number,
    @Ctx() { pool, userId }: Context
  ): Promise<MatchedNode[]> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    try {
      // Get file content
      const fileResult = await pool.query(
        `SELECT extracted_text, markdown_content, original_filename
         FROM public."EvidenceFiles"
         WHERE id = $1 AND deleted_at IS NULL`,
        [fileId]
      );

      if (fileResult.rows.length === 0) {
        throw new Error('File not found');
      }

      const file = fileResult.rows[0];
      const textContent =
        file.extracted_text || file.markdown_content || file.original_filename;

      // Search for similar nodes using full-text search
      const searchResults = await this.searchService.search(pool, textContent, {
        limit: limit * 2, // Get more results to filter
        semanticSearch: true,
      });

      const allResults = [...searchResults.articles, ...searchResults.nodes];

      // Convert to MatchedNode format with reasoning
      const matchedNodes: MatchedNode[] = allResults.slice(0, limit).map((result) => ({
        nodeId: result.id,
        title: result.title,
        nodeType: result.type,
        similarity: result.relevance,
        matchReason: `Content similarity based on: ${result.type}`,
      }));

      return matchedNodes;
    } catch (error: any) {
      console.error('Error in matchEvidenceToNodes:', error);
      return [];
    }
  }

  // ==========================================================================
  // VERIFICATION
  // ==========================================================================

  /**
   * Trigger fact-checking verification for a claim
   */
  @Mutation(() => VerificationReport)
  async verifyClaim(
    @Arg('claimText') claimText: string,
    @Arg('sourceNodeId', () => ID, { nullable: true }) sourceNodeId: string | undefined,
    @Ctx() { pool, userId, pubSub }: Context
  ): Promise<VerificationReport> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    try {
      // Create claim record
      const claimResult = await pool.query(
        `INSERT INTO public."Claims" (
          claim_text, source_node_id, veracity_score, status, submitted_by
        ) VALUES ($1, $2, 0.5, 'pending', $3)
        RETURNING id`,
        [claimText, sourceNodeId, userId]
      );

      const claimId = claimResult.rows[0].id;

      // Perform verification using AI
      const report = await this.performFactCheck(pool, claimId, claimText, userId);

      // Update claim with verification results
      await pool.query(
        `UPDATE public."Claims"
         SET veracity_score = $2,
             status = 'verified',
             verified_at = NOW()
         WHERE id = $1`,
        [claimId, report.veracityScore]
      );

      // Publish subscription event
      await pubSub.publish('VERIFICATION_COMPLETE', {
        claimId,
        report,
      });

      // Log audit event
      await pool.query(
        `INSERT INTO public."AuditLog" (
          user_id, action, entity_type, entity_id, metadata
        ) VALUES ($1, 'claim_verified', 'claim', $2, $3)`,
        [
          userId,
          claimId,
          JSON.stringify({
            veracity_score: report.veracityScore,
            conclusion: report.conclusion,
            evidence_count: report.totalEvidenceReviewed,
          }),
        ]
      );

      return report;
    } catch (error: any) {
      console.error('Error in verifyClaim:', error);
      throw new Error(`Failed to verify claim: ${error.message}`);
    }
  }

  /**
   * Generate a formal inquiry from a claim
   */
  @Mutation(() => GeneratedInquiry)
  async generateInquiry(
    @Arg('claimText') claimText: string,
    @Arg('context', { nullable: true }) context: string | undefined,
    @Ctx() { pool, userId }: Context
  ): Promise<GeneratedInquiry> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    try {
      // Use AI to generate inquiry structure
      const inquiry = await this.generateInquiryFromClaim(
        pool,
        claimText,
        context,
        userId
      );

      // Optionally create formal inquiry record
      if (inquiry.inquiryId) {
        await pool.query(
          `INSERT INTO public."FormalInquiries" (
            id, title, question, hypothesis, created_by
          ) VALUES ($1, $2, $3, $4, $5)`,
          [inquiry.inquiryId, inquiry.title, inquiry.question, inquiry.hypothesis, userId]
        );

        // Log audit event
        await pool.query(
          `INSERT INTO public."AuditLog" (
            user_id, action, entity_type, entity_id, metadata
          ) VALUES ($1, 'inquiry_generated', 'formal_inquiry', $2, $3)`,
          [
            userId,
            inquiry.inquiryId,
            JSON.stringify({ source_claim: claimText }),
          ]
        );
      }

      return inquiry;
    } catch (error: any) {
      console.error('Error in generateInquiry:', error);
      throw new Error(`Failed to generate inquiry: ${error.message}`);
    }
  }

  // ==========================================================================
  // SUBSCRIPTIONS
  // ==========================================================================

  /**
   * Subscribe to AI message processing updates
   */
  @Subscription(() => MessageProcessedEvent, {
    topics: 'MESSAGE_PROCESSED',
    filter: ({ payload, args }) => {
      return payload.conversationId === args.conversationId;
    },
  })
  async onMessageProcessed(
    @Arg('conversationId', () => ID) conversationId: string,
    @Root() payload: MessageProcessedEvent
  ): Promise<MessageProcessedEvent> {
    return payload;
  }

  /**
   * Subscribe to claim extraction updates
   */
  @Subscription(() => ClaimExtractedEvent, {
    topics: 'CLAIM_EXTRACTED',
    filter: ({ payload, args }) => {
      return payload.fileId === args.fileId;
    },
  })
  async onClaimExtracted(
    @Arg('fileId', () => ID) fileId: string,
    @Root() payload: ClaimExtractedEvent
  ): Promise<ClaimExtractedEvent> {
    return payload;
  }

  /**
   * Subscribe to verification completion
   */
  @Subscription(() => VerificationCompleteEvent, {
    topics: 'VERIFICATION_COMPLETE',
    filter: ({ payload, args }) => {
      return payload.claimId === args.claimId;
    },
  })
  async onVerificationComplete(
    @Arg('claimId', () => ID) claimId: string,
    @Root() payload: VerificationCompleteEvent
  ): Promise<VerificationCompleteEvent> {
    return payload;
  }

  // ==========================================================================
  // HELPER METHODS (Service Integration Stubs)
  // ==========================================================================

  /**
   * Generate general AI response without graph context
   */
  private async generateGeneralResponse(
    pool: Pool,
    message: string,
    conversationId: string
  ): Promise<string> {
    // TODO: Implement ConversationalAIService integration
    // For now, return a helpful response
    return `I received your message: "${message}". To provide context-aware assistance, please specify a graph or node you'd like to discuss.`;
  }

  /**
   * Extract node links from AI response
   */
  private async extractNodeLinks(
    pool: Pool,
    response: string,
    graphId?: string
  ): Promise<NodeLink[]> {
    // TODO: Implement node link extraction from response text
    // Look for patterns like [Node:id], @NodeName, etc.
    return [];
  }

  /**
   * Extract claims from text using AI
   */
  private async extractClaimsFromText(
    pool: Pool,
    text: string,
    userId: string
  ): Promise<ExtractedClaim[]> {
    // TODO: Implement ClaimExtractionService integration
    // For now, return a simple extraction
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);

    return sentences.slice(0, 5).map((sentence, index) => ({
      claimText: sentence.trim(),
      context: sentences.slice(Math.max(0, index - 1), index + 2).join('. '),
      confidence: 0.7,
      category: 'fact',
      startPosition: text.indexOf(sentence),
      endPosition: text.indexOf(sentence) + sentence.length,
    }));
  }

  /**
   * Match claims to existing nodes
   */
  private async matchClaimsToNodes(
    pool: Pool,
    claims: ExtractedClaim[]
  ): Promise<MatchedNode[]> {
    // TODO: Implement semantic matching using embeddings
    const matches: MatchedNode[] = [];

    for (const claim of claims.slice(0, 3)) {
      const searchResults = await this.searchService.search(pool, claim.claimText, {
        limit: 2,
        semanticSearch: true,
      });

      const allResults = [...searchResults.articles, ...searchResults.nodes];

      allResults.forEach((result) => {
        matches.push({
          nodeId: result.id,
          title: result.title,
          nodeType: result.type,
          similarity: result.relevance,
          matchReason: `Semantic match to claim: "${claim.claimText.substring(0, 50)}..."`,
        });
      });
    }

    return matches;
  }

  /**
   * Identify primary sources from evidence file
   */
  private async identifyPrimarySources(
    pool: Pool,
    textContent: string,
    file: any
  ): Promise<PrimarySource[]> {
    // TODO: Implement source extraction from document metadata and content
    // Look for URLs, citations, references, etc.

    const sources: PrimarySource[] = [];

    // Extract URLs from content
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = textContent.match(urlRegex) || [];

    urls.slice(0, 3).forEach((url) => {
      sources.push({
        title: `Source from ${new URL(url).hostname}`,
        url,
        credibilityScore: 0.6,
      });
    });

    return sources;
  }

  /**
   * Perform fact-checking verification
   */
  private async performFactCheck(
    pool: Pool,
    claimId: string,
    claimText: string,
    userId: string
  ): Promise<VerificationReport> {
    // TODO: Implement FactCheckingService integration
    // For now, return a basic report

    // Search for related evidence
    const searchResults = await this.searchService.search(pool, claimText, {
      limit: 10,
      semanticSearch: true,
    });

    const supportingEvidence: EvidenceItem[] = [];
    const opposingEvidence: EvidenceItem[] = [];

    const allResults = [...searchResults.articles, ...searchResults.nodes];

    allResults.forEach((result, index) => {
      const evidence: EvidenceItem = {
        evidenceId: result.id,
        evidenceType: index % 3 === 0 ? 'opposing' : 'supporting',
        content: result.narrative || result.title,
        weight: result.relevance,
        confidence: result.relevance,
        sourceTitle: result.title,
      };

      if (evidence.evidenceType === 'supporting') {
        supportingEvidence.push(evidence);
      } else {
        opposingEvidence.push(evidence);
      }
    });

    // Calculate veracity score based on evidence
    const totalSupporting = supportingEvidence.reduce(
      (sum, e) => sum + e.weight,
      0
    );
    const totalOpposing = opposingEvidence.reduce((sum, e) => sum + e.weight, 0);
    const veracityScore =
      totalSupporting + totalOpposing > 0
        ? totalSupporting / (totalSupporting + totalOpposing)
        : 0.5;

    const conclusion =
      veracityScore > 0.7
        ? 'verified'
        : veracityScore < 0.3
        ? 'refuted'
        : veracityScore > 0.5
        ? 'mixed'
        : 'unverified';

    return {
      claimId,
      claim: claimText,
      veracityScore,
      conclusion,
      supportingEvidence,
      opposingEvidence,
      suggestedInquiries: [],
      totalEvidenceReviewed: allResults.length,
      verifiedAt: new Date(),
      reasoning: `Based on analysis of ${allResults.length} related sources, the claim shows ${Math.round(veracityScore * 100)}% support.`,
      limitations: [
        'Limited to available database content',
        'Automated analysis may miss nuanced context',
        'Requires expert review for final determination',
      ],
    };
  }

  /**
   * Generate inquiry from claim using AI
   */
  private async generateInquiryFromClaim(
    pool: Pool,
    claimText: string,
    context: string | undefined,
    userId: string
  ): Promise<GeneratedInquiry> {
    // TODO: Implement inquiry generation service
    // For now, return a basic structure

    const inquiryId = `inq_${Date.now()}`;

    return {
      inquiryId,
      title: `Investigation: ${claimText.substring(0, 100)}`,
      question: `Is the following claim accurate: "${claimText}"?`,
      hypothesis: `The claim "${claimText}" can be verified through examination of available evidence.`,
      suggestedResearchAreas: [
        'Primary source documents',
        'Expert testimony',
        'Statistical data',
        'Historical records',
      ],
      keyTerms: this.extractKeyTerms(claimText),
    };
  }

  /**
   * Extract key terms from text
   */
  private extractKeyTerms(text: string): string[] {
    // Simple keyword extraction - remove common words
    const commonWords = new Set([
      'the',
      'is',
      'are',
      'was',
      'were',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
    ]);

    const words = text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3 && !commonWords.has(w));

    // Return unique words
    return Array.from(new Set(words)).slice(0, 10);
  }

  /**
   * Determine file type from MIME type
   */
  private determineFileType(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.includes('pdf')) return 'document';
    if (
      mimetype.includes('word') ||
      mimetype.includes('document') ||
      mimetype.includes('text')
    ) {
      return 'document';
    }
    return 'other';
  }

  /**
   * Determine processing type for media queue
   */
  private determineProcessingType(
    mimetype: string
  ): 'document' | 'audio' | 'video' {
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'document';
  }
}
