import { Resolver, Query, Mutation, Arg, Ctx, ID, InputType, Field, Float } from 'type-graphql';
import { Pool } from 'pg';
import { Node } from '../entities/Node';

// ============================================================================
// CONTEXT INTERFACE
// ============================================================================

interface Context {
  pool: Pool;
  userId?: string;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

@InputType()
class ProcessReferenceInput {
  @Field()
  url!: string;

  @Field(() => ID)
  parentNodeId!: string;

  @Field({ nullable: true })
  additionalContext?: string;

  @Field({ defaultValue: 'reference' })
  type!: string; // 'reference' or 'citation'
}

@InputType()
class AddNodeAssociationInput {
  @Field(() => ID)
  sourceNodeId!: string;

  @Field(() => ID)
  targetNodeId!: string;

  @Field(() => Float, { nullable: true })
  confidence?: number;

  @Field({ nullable: true })
  relationshipType?: string;

  @Field({ nullable: true })
  description?: string;
}

@InputType()
class AddReferenceInput {
  @Field(() => ID)
  nodeId!: string;

  @Field()
  url!: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ defaultValue: 'reference' })
  type!: string; // 'reference' or 'citation'
}

// ============================================================================
// OBJECT TYPES
// ============================================================================

import { ObjectType } from 'type-graphql';

@ObjectType()
class ProcessedReference {
  @Field(() => ID)
  nodeId!: string;

  @Field()
  title!: string;

  @Field(() => Float)
  confidence!: number;

  @Field()
  content!: string;

  @Field(() => ReferenceMetadata)
  metadata!: ReferenceMetadata;
}

@ObjectType()
class ReferenceMetadata {
  @Field()
  sourceUrl!: string;

  @Field()
  scrapedAt!: Date;

  @Field(() => Number)
  wordCount!: number;

  @Field({ nullable: true })
  author?: string;

  @Field({ nullable: true })
  publishDate?: Date;

  @Field({ nullable: true })
  domain?: string;
}

@ObjectType()
class NodeAssociation {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  sourceNodeId!: string;

  @Field(() => ID)
  targetNodeId!: string;

  @Field(() => Float)
  confidence!: number;

  @Field({ nullable: true })
  relationshipType?: string;

  @Field()
  createdAt!: Date;

  @Field(() => Node)
  targetNode!: Node;
}

@ObjectType()
class Reference {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  nodeId!: string;

  @Field()
  url!: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  type!: string;

  @Field(() => Float, { nullable: true })
  confidence?: number;

  @Field()
  createdAt!: Date;

  @Field({ nullable: true })
  processedNodeId?: string;
}

// ============================================================================
// RESOLVER
// ============================================================================

@Resolver()
export class NodeAssociationResolver {

  /**
   * Process an external reference (URL) with AI to extract content,
   * verify credibility, and create a node with confidence score
   */
  @Mutation(() => ProcessedReference)
  async processReference(
    @Arg('input') input: ProcessReferenceInput,
    @Ctx() { pool, userId }: Context
  ): Promise<ProcessedReference> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    try {
      // Step 1: Scrape URL content
      // TODO: Implement actual web scraping service
      const scrapedContent = `Scraped content from ${input.url}`;
      const wordCount = scrapedContent.split(' ').length;

      // Step 2: Extract metadata
      const url = new URL(input.url);
      const domain = url.hostname.replace('www.', '');

      // Step 3: Analyze credibility using AI
      // TODO: Implement actual AI analysis service
      const confidence = 0.85; // Mock confidence score

      // Step 4: Create a new node with the processed information
      const nodeResult = await pool.query(
        `INSERT INTO public."Nodes"
         (title, type, content, props, veracity, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, title, type, content, props, veracity, created_at`,
        [
          `Reference: ${domain}`,
          'Reference',
          scrapedContent,
          JSON.stringify({
            sourceUrl: input.url,
            scrapedAt: new Date(),
            domain,
            confidence,
          }),
          confidence,
          userId,
        ]
      );

      const newNode = nodeResult.rows[0];

      // Step 5: Create edge linking parent node to new reference node
      await pool.query(
        `INSERT INTO public."Edges"
         (source_node_id, target_node_id, relationship, weight, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [input.parentNodeId, newNode.id, input.type, confidence, userId]
      );

      return {
        nodeId: newNode.id,
        title: newNode.title,
        confidence: newNode.veracity,
        content: newNode.content,
        metadata: {
          sourceUrl: input.url,
          scrapedAt: new Date(),
          wordCount,
          domain,
        },
      };
    } catch (error) {
      console.error('Error processing reference:', error);
      throw new Error('Failed to process reference');
    }
  }

  /**
   * Associate two nodes together
   */
  @Mutation(() => NodeAssociation)
  async addNodeAssociation(
    @Arg('input') input: AddNodeAssociationInput,
    @Ctx() { pool, userId }: Context
  ): Promise<NodeAssociation> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    try {
      // Prepare props with description
      const props = input.description
        ? JSON.stringify({
            description: input.description,
            createdBy: userId,
            createdAt: new Date().toISOString(),
          })
        : null;

      const result = await pool.query(
        `INSERT INTO public."Edges"
         (source_node_id, target_node_id, relationship, weight, props, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, source_node_id, target_node_id, relationship, weight, props, created_at`,
        [
          input.sourceNodeId,
          input.targetNodeId,
          input.relationshipType || 'related',
          input.confidence || 0.8,
          props,
          userId,
        ]
      );

      const edge = result.rows[0];

      // Fetch target node details
      const nodeResult = await pool.query(
        `SELECT id, title, type, veracity FROM public."Nodes" WHERE id = $1`,
        [input.targetNodeId]
      );

      const targetNode = nodeResult.rows[0];

      return {
        id: edge.id,
        sourceNodeId: edge.source_node_id,
        targetNodeId: edge.target_node_id,
        confidence: edge.weight,
        relationshipType: edge.relationship,
        createdAt: edge.created_at,
        targetNode: {
          ...targetNode,
          veracity: parseFloat(targetNode.veracity),
        },
      };
    } catch (error) {
      console.error('Error adding node association:', error);
      throw new Error('Failed to associate nodes');
    }
  }

  /**
   * Add a reference (URL) to a node without processing it
   * Stores in Node.props field as part of references/citations arrays
   */
  @Mutation(() => Reference)
  async addReference(
    @Arg('input') input: AddReferenceInput,
    @Ctx() { pool, userId }: Context
  ): Promise<Reference> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    try {
      // Get current node props
      const nodeResult = await pool.query(
        `SELECT id, props FROM public."Nodes" WHERE id = $1`,
        [input.nodeId]
      );

      if (nodeResult.rows.length === 0) {
        throw new Error('Node not found');
      }

      const node = nodeResult.rows[0];
      const props = node.props ? JSON.parse(node.props) : {};

      // Initialize references/citations arrays if they don't exist
      if (!props.references) props.references = [];
      if (!props.citations) props.citations = [];

      // Create new reference object
      const newReference = {
        id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url: input.url,
        title: input.title,
        description: input.description || null,
        type: input.type,
        createdAt: new Date().toISOString(),
        createdBy: userId,
      };

      // Add to appropriate array
      if (input.type === 'citation') {
        props.citations.push(newReference);
      } else {
        props.references.push(newReference);
      }

      // Update node with new props
      await pool.query(
        `UPDATE public."Nodes" SET props = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(props), input.nodeId]
      );

      return {
        id: newReference.id,
        nodeId: input.nodeId,
        url: newReference.url,
        title: newReference.title,
        description: newReference.description,
        type: newReference.type,
        createdAt: new Date(newReference.createdAt),
      };
    } catch (error) {
      console.error('Error adding reference:', error);
      throw new Error('Failed to add reference');
    }
  }

  /**
   * Get all node associations for a given node
   */
  @Query(() => [NodeAssociation])
  async getNodeAssociations(
    @Arg('nodeId', () => ID) nodeId: string,
    @Ctx() { pool }: Context
  ): Promise<NodeAssociation[]> {
    try {
      const result = await pool.query(
        `SELECT
           e.id,
           e.source_node_id,
           e.target_node_id,
           e.relationship,
           e.weight,
           e.created_at,
           n.id as target_id,
           n.title as target_title,
           n.weight as target_weight,
           n.props as target_props,
           n.is_level_0 as target_is_level_0,
           n.created_at as target_created_at,
           n.updated_at as target_updated_at
         FROM public."Edges" e
         INNER JOIN public."Nodes" n ON e.target_node_id = n.id
         WHERE e.source_node_id = $1
         ORDER BY e.created_at DESC`,
        [nodeId]
      );

      return result.rows.map((row) => ({
        id: row.id,
        sourceNodeId: row.source_node_id,
        targetNodeId: row.target_node_id,
        confidence: parseFloat(row.weight),
        relationshipType: row.relationship,
        createdAt: row.created_at,
        targetNode: {
          id: row.target_id,
          title: row.target_title,
          weight: parseFloat(row.target_weight),
          props: row.target_props,
          is_level_0: row.target_is_level_0,
          created_at: row.target_created_at,
          updated_at: row.target_updated_at,
          edges: [],
          comments: [],
        } as any,
      }));
    } catch (error) {
      console.error('Error fetching node associations:', error);
      throw new Error('Failed to fetch node associations');
    }
  }

  /**
   * Get all references for a node from Node.props
   */
  @Query(() => [Reference])
  async getNodeReferences(
    @Arg('nodeId', () => ID) nodeId: string,
    @Arg('type', { nullable: true }) type: string,
    @Ctx() { pool }: Context
  ): Promise<Reference[]> {
    try {
      const result = await pool.query(
        `SELECT props FROM public."Nodes" WHERE id = $1`,
        [nodeId]
      );

      if (result.rows.length === 0) {
        return [];
      }

      const props = result.rows[0].props ? JSON.parse(result.rows[0].props) : {};
      const references: any[] = [];

      // Get references
      if (props.references && Array.isArray(props.references)) {
        props.references.forEach((ref: any) => {
          if (!type || type === 'reference') {
            references.push({
              id: ref.id,
              nodeId,
              url: ref.url,
              title: ref.title,
              description: ref.description,
              type: 'reference',
              confidence: ref.confidence,
              createdAt: new Date(ref.createdAt),
              processedNodeId: ref.processedNodeId,
            });
          }
        });
      }

      // Get citations
      if (props.citations && Array.isArray(props.citations)) {
        props.citations.forEach((cite: any) => {
          if (!type || type === 'citation') {
            references.push({
              id: cite.id,
              nodeId,
              url: cite.url,
              title: cite.title,
              description: cite.description,
              type: 'citation',
              confidence: cite.confidence,
              createdAt: new Date(cite.createdAt),
              processedNodeId: cite.processedNodeId,
            });
          }
        });
      }

      // Sort by creation date
      references.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return references;
    } catch (error) {
      console.error('Error fetching node references:', error);
      throw new Error('Failed to fetch node references');
    }
  }
}
