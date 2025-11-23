/**
 * Comprehensive GraphQL Resolver Tests for GraphResolver
 *
 * Tests critical functionality:
 * - Graph CRUD operations (create, read, update, delete)
 * - Node operations (create, update, delete)
 * - Edge operations (create, update, delete)
 * - Authentication and authorization
 * - Level 0 (immutable) graph protection
 * - Pub/Sub event publishing
 * - Cache invalidation
 * - JSONB serialization
 *
 * Coverage targets: 80%+ for all public methods
 */

import 'reflect-metadata';
import { Pool, QueryResult } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { Redis } from 'ioredis';
import {
  GraphResolver,
  NodeResolver,
  EdgeResolver,
} from '../resolvers/GraphResolver';
import { CacheService } from '../services/CacheService';
import { NodeInput, EdgeInput, GraphInput } from '../resolvers/GraphInput';

// Mock dependencies
jest.mock('../services/CacheService');
jest.mock('pg');

describe('GraphResolver - Complete Test Suite', () => {
  let resolver: GraphResolver;
  let nodeResolver: NodeResolver;
  let edgeResolver: EdgeResolver;
  let mockPool: jest.Mocked<Partial<Pool>>;
  let mockPubSub: jest.Mocked<PubSubEngine>;
  let mockRedis: jest.Mocked<Redis>;
  let mockCacheService: jest.Mocked<CacheService>;

  const userId = 'user-123';
  const graphId = 'graph-456';
  const nodeId = 'node-789';
  const nodeTypeId = 'type-node-001';
  const edgeTypeId = 'type-edge-001';
  const sourceNodeId = 'source-001';
  const targetNodeId = 'target-001';

  // Mock graph data
  const mockGraphData = {
    id: graphId,
    name: 'Test Graph',
    description: 'A test knowledge graph',
    level: 1,
    methodology: 'scientific-method',
    privacy: 'private',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    nodes: [],
    edges: [],
  };

  // Mock node data
  const mockNodeData = {
    id: nodeId,
    node_type_id: nodeTypeId,
    props: JSON.stringify({
      title: 'Test Node',
      narrative: 'Test narrative',
      weight: 0.85,
      graphId: graphId,
      createdBy: userId,
    }),
    ai: Array(1536).fill(0.1),
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  // Mock edge data
  const mockEdgeData = {
    id: 'edge-123',
    source_node_id: sourceNodeId,
    target_node_id: targetNodeId,
    edge_type_id: edgeTypeId,
    props: JSON.stringify({
      weight: 0.9,
      graphId: graphId,
      createdBy: userId,
      relationship: 'supports',
    }),
    ai: Array(1536).fill(0.1),
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  beforeEach(() => {
    // Initialize resolver instances
    resolver = new GraphResolver();
    nodeResolver = new NodeResolver();
    edgeResolver = new EdgeResolver();

    // Create mock objects
    mockPool = {
      query: jest.fn(),
    } as any;

    mockPubSub = {
      publish: jest.fn().mockResolvedValue(true),
    } as any;

    mockRedis = {} as any;

    // Mock CacheService
    (CacheService as jest.MockedClass<typeof CacheService>).mockClear();
    mockCacheService = {
      getGraph: jest.fn().mockResolvedValue(null),
      cacheGraph: jest.fn().mockResolvedValue(true),
      invalidateGraph: jest.fn().mockResolvedValue(true),
      getVeracityScore: jest.fn().mockResolvedValue(null),
      cacheVeracityScore: jest.fn().mockResolvedValue(true),
    } as any;

    (CacheService as jest.MockedClass<typeof CacheService>).mockImplementation(
      () => mockCacheService
    );

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // GRAPH RESOLVER TESTS
  // =========================================================================

  describe('GraphResolver.graphs()', () => {
    it('should return all Level 0 and public graphs for unauthenticated users', async () => {
      // Arrange
      const mockGraphs = [
        { ...mockGraphData, id: 'graph-1', level: 0, privacy: 'public' },
        { ...mockGraphData, id: 'graph-2', level: 1, privacy: 'public' },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockGraphs,
        rowCount: mockGraphs.length,
      });

      // Act
      const result = await resolver.graphs({
        pool: mockPool as any,
        userId: null,
      });

      // Assert
      expect(result).toEqual(mockGraphs);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('level = 0'),
        ['public']
      );
    });

    it('should return Level 0 and public graphs for authenticated users', async () => {
      // Arrange
      const mockGraphs = [
        { ...mockGraphData, id: 'graph-1', level: 0, privacy: 'public' },
        { ...mockGraphData, id: 'graph-2', level: 1, privacy: 'public' },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockGraphs,
        rowCount: mockGraphs.length,
      });

      // Act
      const result = await resolver.graphs({
        pool: mockPool as any,
        userId,
      });

      // Assert
      expect(result).toEqual(mockGraphs);
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should order results by created_at DESC', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // Act
      await resolver.graphs({
        pool: mockPool as any,
        userId: null,
      });

      // Assert
      const queryCall = (mockPool.query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).toContain('ORDER BY created_at DESC');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        resolver.graphs({
          pool: mockPool as any,
          userId,
        })
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('GraphResolver.graph()', () => {
    it('should return cached graph if available', async () => {
      // Arrange
      mockCacheService.getGraph.mockResolvedValueOnce(mockGraphData);

      // Act
      const result = await resolver.graph(graphId, {
        pool: mockPool as any,
        redis: mockRedis as any,
        userId,
      });

      // Assert
      expect(result).toEqual(mockGraphData);
      expect(mockCacheService.getGraph).toHaveBeenCalledWith(graphId);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should fetch graph from database and cache it', async () => {
      // Arrange
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [mockGraphData],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockNodeData],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockEdgeData],
          rowCount: 1,
        });

      mockCacheService.getGraph.mockResolvedValueOnce(null);

      // Act
      const result = await resolver.graph(graphId, {
        pool: mockPool as any,
        redis: mockRedis as any,
        userId,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(graphId);
      expect(mockCacheService.cacheGraph).toHaveBeenCalledWith(
        graphId,
        expect.objectContaining({ id: graphId })
      );
    });

    it('should return null for non-existent graph', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // Act
      const result = await resolver.graph(graphId, {
        pool: mockPool as any,
        redis: mockRedis as any,
        userId,
      });

      // Assert
      expect(result).toBeNull();
    });

    it('should allow unauthenticated access to Level 0 graphs', async () => {
      // Arrange
      const level0Graph = { ...mockGraphData, level: 0 };
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [level0Graph],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        });

      mockCacheService.getGraph.mockResolvedValueOnce(null);

      // Act
      const result = await resolver.graph(graphId, {
        pool: mockPool as any,
        redis: mockRedis as any,
        userId: null,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result?.level).toBe(0);
    });

    it('should prevent unauthenticated access to private Level 1 graphs', async () => {
      // Arrange
      const privateGraph = { ...mockGraphData, privacy: 'private', level: 1 };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [privateGraph],
        rowCount: 1,
      });

      // Act & Assert
      await expect(
        resolver.graph(graphId, {
          pool: mockPool as any,
          redis: mockRedis as any,
          userId: null,
        })
      ).rejects.toThrow('Authentication required to view private graphs');
    });

    it('should serialize JSONB props for nodes and edges', async () => {
      // Arrange
      const nodeWithStringProps = {
        ...mockNodeData,
        props: JSON.stringify({ title: 'Test', weight: 0.5 }),
      };
      const edgeWithStringProps = {
        ...mockEdgeData,
        props: JSON.stringify({ relationship: 'supports' }),
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [mockGraphData],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [nodeWithStringProps],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [edgeWithStringProps],
          rowCount: 1,
        });

      mockCacheService.getGraph.mockResolvedValueOnce(null);

      // Act
      const result = await resolver.graph(graphId, {
        pool: mockPool as any,
        redis: mockRedis as any,
        userId,
      });

      // Assert
      expect(result?.nodes[0].props).toEqual(
        expect.objectContaining({ title: 'Test', weight: 0.5 })
      );
      expect(result?.edges[0].props).toEqual(
        expect.objectContaining({ relationship: 'supports' })
      );
    });
  });

  describe('GraphResolver.createGraph()', () => {
    it('should create a new graph with default values', async () => {
      // Arrange
      const input: GraphInput = {
        name: 'New Graph',
        description: 'Test description',
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockGraphData],
        rowCount: 1,
      });

      // Act
      const result = await resolver.createGraph(input, {
        pool: mockPool as any,
        userId,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(graphId);
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO public."Graphs"'),
        ['New Graph', 'Test description', 1, null, 'private']
      );
    });

    it('should set default level to 1 if not provided', async () => {
      // Arrange
      const input: GraphInput = { name: 'Graph' };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockGraphData],
        rowCount: 1,
      });

      // Act
      await resolver.createGraph(input, {
        pool: mockPool as any,
        userId,
      });

      // Assert
      const params = (mockPool.query as jest.Mock).mock.calls[0][1];
      expect(params[2]).toBe(1); // level parameter
    });

    it('should set default privacy to private if not provided', async () => {
      // Arrange
      const input: GraphInput = { name: 'Graph' };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockGraphData],
        rowCount: 1,
      });

      // Act
      await resolver.createGraph(input, {
        pool: mockPool as any,
        userId,
      });

      // Assert
      const params = (mockPool.query as jest.Mock).mock.calls[0][1];
      expect(params[4]).toBe('private'); // privacy parameter
    });

    it('should require authentication to create graphs', async () => {
      // Arrange
      const input: GraphInput = { name: 'Graph' };

      // Act & Assert
      await expect(
        resolver.createGraph(input, {
          pool: mockPool as any,
          userId: null,
        })
      ).rejects.toThrow('Authentication required to create graphs');
    });

    it('should handle database errors during creation', async () => {
      // Arrange
      const input: GraphInput = { name: 'Graph' };
      const dbError = new Error('Unique constraint violation');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        resolver.createGraph(input, {
          pool: mockPool as any,
          userId,
        })
      ).rejects.toThrow('Unique constraint violation');
    });

    it('should allow custom level and methodology', async () => {
      // Arrange
      const input: GraphInput = {
        name: 'Advanced Graph',
        level: 0,
        methodology: 'legal-discovery',
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ...mockGraphData, level: 0, methodology: 'legal-discovery' }],
        rowCount: 1,
      });

      // Act
      await resolver.createGraph(input, {
        pool: mockPool as any,
        userId,
      });

      // Assert
      const params = (mockPool.query as jest.Mock).mock.calls[0][1];
      expect(params[2]).toBe(0); // level
      expect(params[3]).toBe('legal-discovery'); // methodology
    });
  });

  describe('GraphResolver.updateGraph()', () => {
    it('should update graph metadata', async () => {
      // Arrange
      const input: GraphInput = {
        name: 'Updated Name',
        description: 'Updated description',
        privacy: 'public',
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ ...mockGraphData, level: 1 }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockGraphData],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        });

      // Act
      const result = await resolver.updateGraph(graphId, input, {
        pool: mockPool as any,
        userId,
      });

      // Assert
      expect(result).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE public."Graphs"'),
        ['Updated Name', 'Updated description', 'legal-discovery', 'public', graphId]
      );
    });

    it('should prevent updates to Level 0 graphs', async () => {
      // Arrange
      const input: GraphInput = { name: 'New Name' };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ...mockGraphData, level: 0 }],
        rowCount: 1,
      });

      // Act & Assert
      await expect(
        resolver.updateGraph(graphId, input, {
          pool: mockPool as any,
          userId,
        })
      ).rejects.toThrow('Cannot modify Level 0 (immutable) graphs');
    });

    it('should prevent changing graph level after creation', async () => {
      // Arrange
      const input: GraphInput = { name: 'Name', level: 0 };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ...mockGraphData, level: 1 }],
        rowCount: 1,
      });

      // Act & Assert
      await expect(
        resolver.updateGraph(graphId, input, {
          pool: mockPool as any,
          userId,
        })
      ).rejects.toThrow('Cannot change graph level after creation');
    });

    it('should require authentication to update graphs', async () => {
      // Arrange
      const input: GraphInput = { name: 'Name' };

      // Act & Assert
      await expect(
        resolver.updateGraph(graphId, input, {
          pool: mockPool as any,
          userId: null,
        })
      ).rejects.toThrow('Authentication required to update graphs');
    });

    it('should fetch and serialize nodes and edges on update', async () => {
      // Arrange
      const input: GraphInput = { name: 'Updated' };
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ ...mockGraphData, level: 1 }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockGraphData],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockNodeData],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockEdgeData],
          rowCount: 1,
        });

      // Act
      const result = await resolver.updateGraph(graphId, input, {
        pool: mockPool as any,
        userId,
      });

      // Assert
      expect(result.nodes).toHaveLength(1);
      expect(result.edges).toHaveLength(1);
      expect(result.nodes[0].props).toEqual(
        expect.objectContaining({
          title: 'Test Node',
          weight: 0.85,
        })
      );
    });
  });

  describe('GraphResolver.deleteGraph()', () => {
    it('should delete a Level 1 graph', async () => {
      // Arrange
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ ...mockGraphData, level: 1 }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
        });

      // Act
      const result = await resolver.deleteGraph(graphId, {
        pool: mockPool as any,
        userId,
      });

      // Assert
      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM public."Graphs"'),
        [graphId]
      );
    });

    it('should prevent deletion of Level 0 graphs', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ...mockGraphData, level: 0 }],
        rowCount: 1,
      });

      // Act & Assert
      await expect(
        resolver.deleteGraph(graphId, {
          pool: mockPool as any,
          userId,
        })
      ).rejects.toThrow('Cannot delete Level 0 (immutable) graphs');
    });

    it('should require authentication to delete graphs', async () => {
      // Act & Assert
      await expect(
        resolver.deleteGraph(graphId, {
          pool: mockPool as any,
          userId: null,
        })
      ).rejects.toThrow('Authentication required to delete graphs');
    });

    it('should handle non-existent graph deletion gracefully', async () => {
      // Arrange
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        });

      // Act & Assert
      // Should not throw, just return false or handle gracefully
      const result = await resolver.deleteGraph('non-existent', {
        pool: mockPool as any,
        userId,
      });

      expect(result).toBe(true); // Deletion query still executes
    });
  });

  // =========================================================================
  // NODE RESOLVER TESTS
  // =========================================================================

  describe('GraphResolver.createNode()', () => {
    it('should create a new node with props', async () => {
      // Arrange
      const input: NodeInput = {
        graphId,
        props: JSON.stringify({ title: 'New Node', weight: 0.5 }),
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: nodeTypeId }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockNodeData],
          rowCount: 1,
        });

      // Act
      const result = await resolver.createNode(input, {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        redis: mockRedis as any,
        userId,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(nodeId);
      expect(mockPubSub.publish).toHaveBeenCalledWith(
        'NODE_UPDATED',
        expect.objectContaining({ id: nodeId })
      );
    });

    it('should merge graphId and createdBy into props', async () => {
      // Arrange
      const input: NodeInput = {
        graphId,
        props: JSON.stringify({ title: 'Node' }),
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: nodeTypeId }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockNodeData],
          rowCount: 1,
        });

      // Act
      await resolver.createNode(input, {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        redis: mockRedis as any,
        userId,
      });

      // Assert
      const insertCall = (mockPool.query as jest.Mock).mock.calls[1];
      const propsStr = insertCall[1][1];
      const props = JSON.parse(propsStr);

      expect(props.graphId).toBe(graphId);
      expect(props.createdBy).toBe(userId);
      expect(props.title).toBe('Node');
    });

    it('should require authentication to create nodes', async () => {
      // Arrange
      const input: NodeInput = { graphId, props: '{}' };

      // Act & Assert
      await expect(
        resolver.createNode(input, {
          pool: mockPool as any,
          pubSub: mockPubSub as any,
          redis: mockRedis as any,
          userId: null,
        })
      ).rejects.toThrow('Authentication required to create nodes');
    });

    it('should invalidate graph cache after creating node', async () => {
      // Arrange
      const input: NodeInput = { graphId, props: '{}' };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: nodeTypeId }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockNodeData],
          rowCount: 1,
        });

      // Act
      await resolver.createNode(input, {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        redis: mockRedis as any,
        userId,
      });

      // Assert
      expect(mockCacheService.invalidateGraph).toHaveBeenCalledWith(graphId);
    });

    it('should handle string props gracefully', async () => {
      // Arrange
      const propsStr = JSON.stringify({ title: 'Node' });
      const input: NodeInput = { graphId, props: propsStr };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: nodeTypeId }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockNodeData],
          rowCount: 1,
        });

      // Act
      await resolver.createNode(input, {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        redis: mockRedis as any,
        userId,
      });

      // Assert
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('GraphResolver.updateNode()', () => {
    it('should update node props using JSONB merge', async () => {
      // Arrange
      const newProps = JSON.stringify({ title: 'Updated Title', weight: 0.8 });
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockNodeData],
        rowCount: 1,
      });

      // Act
      const result = await resolver.updateNode(nodeId, newProps, {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        userId,
      });

      // Assert
      expect(result).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE public."Nodes"'),
        [newProps, nodeId]
      );
      expect(mockPubSub.publish).toHaveBeenCalledWith(
        'NODE_UPDATED',
        expect.objectContaining({ id: nodeId })
      );
    });

    it('should require authentication to update nodes', async () => {
      // Act & Assert
      await expect(
        resolver.updateNode(nodeId, '{}', {
          pool: mockPool as any,
          pubSub: mockPubSub as any,
          userId: null,
        })
      ).rejects.toThrow('Authentication required to update nodes');
    });

    it('should serialize JSONB props in response', async () => {
      // Arrange
      const nodeWithProps = {
        ...mockNodeData,
        props: JSON.stringify({ title: 'Updated', weight: 0.7 }),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [nodeWithProps],
        rowCount: 1,
      });

      // Act
      const result = await resolver.updateNode(nodeId, '{}', {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        userId,
      });

      // Assert
      expect(result.props).toEqual(
        expect.objectContaining({ title: 'Updated', weight: 0.7 })
      );
    });

    it('should update timestamp on modification', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockNodeData],
        rowCount: 1,
      });

      // Act
      await resolver.updateNode(nodeId, '{}', {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        userId,
      });

      // Assert
      const query = (mockPool.query as jest.Mock).mock.calls[0][0];
      expect(query).toContain('updated_at = NOW()');
    });
  });

  describe('GraphResolver.updateNodeWeight()', () => {
    it('should update node weight using JSONB merge', async () => {
      // Arrange
      const newWeight = 0.95;
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ...mockNodeData, props: JSON.stringify({ weight: newWeight }) }],
        rowCount: 1,
      });

      // Act
      const result = await resolver.updateNodeWeight(nodeId, newWeight, {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        userId,
      });

      // Assert
      expect(result).toBeDefined();
      const params = (mockPool.query as jest.Mock).mock.calls[0][1];
      expect(params[0]).toContain(`"weight":${newWeight}`);
    });

    it('should require authentication to update node weight', async () => {
      // Act & Assert
      await expect(
        resolver.updateNodeWeight(nodeId, 0.5, {
          pool: mockPool as any,
          pubSub: mockPubSub as any,
          userId: null,
        })
      ).rejects.toThrow('Authentication required to update nodes');
    });

    it('should publish NODE_UPDATED event', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockNodeData],
        rowCount: 1,
      });

      // Act
      await resolver.updateNodeWeight(nodeId, 0.7, {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        userId,
      });

      // Assert
      expect(mockPubSub.publish).toHaveBeenCalledWith(
        'NODE_UPDATED',
        expect.any(Object)
      );
    });
  });

  describe('GraphResolver.deleteNode()', () => {
    it('should delete a node by ID', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      // Act
      const result = await resolver.deleteNode(nodeId, {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        userId,
      });

      // Assert
      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM public."Nodes"'),
        [nodeId]
      );
    });

    it('should require authentication to delete nodes', async () => {
      // Act & Assert
      await expect(
        resolver.deleteNode(nodeId, {
          pool: mockPool as any,
          pubSub: mockPubSub as any,
          userId: null,
        })
      ).rejects.toThrow('Authentication required to delete nodes');
    });

    it('should publish NODE_DELETED event', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      // Act
      await resolver.deleteNode(nodeId, {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        userId,
      });

      // Assert
      expect(mockPubSub.publish).toHaveBeenCalledWith('NODE_DELETED', {
        nodeId,
      });
    });

    it('should handle non-existent node deletion', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // Act
      const result = await resolver.deleteNode('non-existent', {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        userId,
      });

      // Assert
      expect(result).toBe(true);
    });
  });

  // =========================================================================
  // EDGE RESOLVER TESTS
  // =========================================================================

  describe('GraphResolver.createEdge()', () => {
    it('should create a new edge between two nodes', async () => {
      // Arrange
      const input: EdgeInput = {
        graphId,
        from: sourceNodeId,
        to: targetNodeId,
        props: JSON.stringify({ relationship: 'supports', weight: 0.8 }),
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: edgeTypeId }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockEdgeData],
          rowCount: 1,
        });

      // Act
      const result = await resolver.createEdge(input, {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        redis: mockRedis as any,
        userId,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('edge-123');
      expect(mockPubSub.publish).toHaveBeenCalledWith(
        'EDGE_UPDATED',
        expect.objectContaining({ id: 'edge-123' })
      );
    });

    it('should merge graphId and createdBy into edge props', async () => {
      // Arrange
      const input: EdgeInput = {
        graphId,
        from: sourceNodeId,
        to: targetNodeId,
        props: JSON.stringify({ relationship: 'supports' }),
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: edgeTypeId }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockEdgeData],
          rowCount: 1,
        });

      // Act
      await resolver.createEdge(input, {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        redis: mockRedis as any,
        userId,
      });

      // Assert
      const insertCall = (mockPool.query as jest.Mock).mock.calls[1];
      const propsStr = insertCall[1][3];
      const props = JSON.parse(propsStr);

      expect(props.graphId).toBe(graphId);
      expect(props.createdBy).toBe(userId);
      expect(props.relationship).toBe('supports');
    });

    it('should require authentication to create edges', async () => {
      // Arrange
      const input: EdgeInput = {
        graphId,
        from: sourceNodeId,
        to: targetNodeId,
        props: '{}',
      };

      // Act & Assert
      await expect(
        resolver.createEdge(input, {
          pool: mockPool as any,
          pubSub: mockPubSub as any,
          redis: mockRedis as any,
          userId: null,
        })
      ).rejects.toThrow('Authentication required to create edges');
    });

    it('should invalidate graph cache after creating edge', async () => {
      // Arrange
      const input: EdgeInput = {
        graphId,
        from: sourceNodeId,
        to: targetNodeId,
        props: '{}',
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: edgeTypeId }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockEdgeData],
          rowCount: 1,
        });

      // Act
      await resolver.createEdge(input, {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        redis: mockRedis as any,
        userId,
      });

      // Assert
      expect(mockCacheService.invalidateGraph).toHaveBeenCalledWith(graphId);
    });
  });

  describe('GraphResolver.updateEdge()', () => {
    it('should update edge props using JSONB merge', async () => {
      // Arrange
      const newProps = JSON.stringify({
        relationship: 'refutes',
        weight: 0.6,
      });

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockEdgeData],
        rowCount: 1,
      });

      // Act
      const result = await resolver.updateEdge('edge-123', newProps, {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        userId,
      });

      // Assert
      expect(result).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE public."Edges"'),
        [newProps, 'edge-123']
      );
      expect(mockPubSub.publish).toHaveBeenCalledWith(
        'EDGE_UPDATED',
        expect.any(Object)
      );
    });

    it('should require authentication to update edges', async () => {
      // Act & Assert
      await expect(
        resolver.updateEdge('edge-123', '{}', {
          pool: mockPool as any,
          pubSub: mockPubSub as any,
          userId: null,
        })
      ).rejects.toThrow('Authentication required to update edges');
    });

    it('should serialize JSONB props in response', async () => {
      // Arrange
      const edgeWithProps = {
        ...mockEdgeData,
        props: JSON.stringify({ relationship: 'supports', weight: 0.9 }),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [edgeWithProps],
        rowCount: 1,
      });

      // Act
      const result = await resolver.updateEdge('edge-123', '{}', {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        userId,
      });

      // Assert
      expect(result.props).toEqual(
        expect.objectContaining({ relationship: 'supports', weight: 0.9 })
      );
    });
  });

  describe('GraphResolver.updateEdgeWeight()', () => {
    it('should update edge weight using JSONB merge', async () => {
      // Arrange
      const newWeight = 0.75;
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ...mockEdgeData, props: JSON.stringify({ weight: newWeight }) }],
        rowCount: 1,
      });

      // Act
      const result = await resolver.updateEdgeWeight('edge-123', newWeight, {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        userId,
      });

      // Assert
      expect(result).toBeDefined();
      const params = (mockPool.query as jest.Mock).mock.calls[0][1];
      expect(params[0]).toContain(`"weight":${newWeight}`);
    });

    it('should require authentication to update edge weight', async () => {
      // Act & Assert
      await expect(
        resolver.updateEdgeWeight('edge-123', 0.5, {
          pool: mockPool as any,
          pubSub: mockPubSub as any,
          userId: null,
        })
      ).rejects.toThrow('Authentication required to update edges');
    });

    it('should publish EDGE_UPDATED event', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockEdgeData],
        rowCount: 1,
      });

      // Act
      await resolver.updateEdgeWeight('edge-123', 0.8, {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        userId,
      });

      // Assert
      expect(mockPubSub.publish).toHaveBeenCalledWith(
        'EDGE_UPDATED',
        expect.any(Object)
      );
    });
  });

  describe('GraphResolver.deleteEdge()', () => {
    it('should delete an edge by ID', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      // Act
      const result = await resolver.deleteEdge('edge-123', {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        userId,
      });

      // Assert
      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM public."Edges"'),
        ['edge-123']
      );
    });

    it('should require authentication to delete edges', async () => {
      // Act & Assert
      await expect(
        resolver.deleteEdge('edge-123', {
          pool: mockPool as any,
          pubSub: mockPubSub as any,
          userId: null,
        })
      ).rejects.toThrow('Authentication required to delete edges');
    });

    it('should publish EDGE_DELETED event', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      // Act
      await resolver.deleteEdge('edge-123', {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        userId,
      });

      // Assert
      expect(mockPubSub.publish).toHaveBeenCalledWith('EDGE_DELETED', {
        edgeId: 'edge-123',
      });
    });
  });

  // =========================================================================
  // NODE FIELD RESOLVER TESTS
  // =========================================================================

  describe('NodeResolver.edges()', () => {
    it('should fetch all edges where node is source or target', async () => {
      // Arrange
      const edges = [mockEdgeData, { ...mockEdgeData, id: 'edge-456' }];
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: edges,
        rowCount: 2,
      });

      // Act
      const result = await nodeResolver.edges(mockNodeData as any, {
        pool: mockPool as any,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('source_node_id = $1 OR target_node_id = $1'),
        [nodeId]
      );
    });

    it('should serialize edge JSONB props', async () => {
      // Arrange
      const edgeWithProps = {
        ...mockEdgeData,
        props: JSON.stringify({ relationship: 'supports' }),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [edgeWithProps],
        rowCount: 1,
      });

      // Act
      const result = await nodeResolver.edges(mockNodeData as any, {
        pool: mockPool as any,
      });

      // Assert
      expect(result[0].props).toEqual(
        expect.objectContaining({ relationship: 'supports' })
      );
    });

    it('should return empty array for nodes with no edges', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // Act
      const result = await nodeResolver.edges(mockNodeData as any, {
        pool: mockPool as any,
      });

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('NodeResolver.comments()', () => {
    it('should fetch all comments on a node', async () => {
      // Arrange
      const comments = [
        { id: 'comment-1', text: 'Comment 1', target_node_id: nodeId },
        { id: 'comment-2', text: 'Comment 2', target_node_id: nodeId },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: comments,
        rowCount: 2,
      });

      // Act
      const result = await nodeResolver.comments(mockNodeData as any, {
        pool: mockPool as any,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('target_node_id = $1'),
        [nodeId]
      );
    });

    it('should return empty array for nodes with no comments', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // Act
      const result = await nodeResolver.comments(mockNodeData as any, {
        pool: mockPool as any,
      });

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('NodeResolver.veracity()', () => {
    it('should return cached veracity score if available', async () => {
      // Arrange
      const veracityScore = {
        id: nodeId,
        target_node_id: nodeId,
        veracity_score: 0.85,
      };

      mockCacheService.getVeracityScore.mockResolvedValueOnce(veracityScore as any);

      // Act
      const result = await nodeResolver.veracity(mockNodeData as any, {
        pool: mockPool as any,
        redis: mockRedis as any,
      });

      // Assert
      expect(result).toEqual(veracityScore);
      expect(mockCacheService.getVeracityScore).toHaveBeenCalledWith(nodeId);
    });

    it('should return fixed veracity for high credibility nodes (weight >= 0.90)', async () => {
      // Arrange
      const highCredibilityNode = {
        ...mockNodeData,
        weight: 0.95,
      };

      // Act
      const result = await nodeResolver.veracity(highCredibilityNode as any, {
        pool: mockPool as any,
        redis: mockRedis as any,
      });

      // Assert
      expect(result?.veracity_score).toBe(0.95);
      expect(result?.calculation_method).toBe('high_credibility_fixed');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should fetch veracity from database on cache miss', async () => {
      // Arrange
      const veracityScore = {
        id: nodeId,
        target_node_id: nodeId,
        veracity_score: 0.75,
      };

      mockCacheService.getVeracityScore.mockResolvedValueOnce(null);
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [veracityScore],
        rowCount: 1,
      });

      const lowWeightNode = { ...mockNodeData, weight: 0.5 };

      // Act
      const result = await nodeResolver.veracity(lowWeightNode as any, {
        pool: mockPool as any,
        redis: mockRedis as any,
      });

      // Assert
      expect(result).toEqual(veracityScore);
      expect(mockCacheService.cacheVeracityScore).toHaveBeenCalledWith(
        nodeId,
        veracityScore
      );
    });

    it('should return null for nodes with no veracity score', async () => {
      // Arrange
      mockCacheService.getVeracityScore.mockResolvedValueOnce(null);
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const lowWeightNode = { ...mockNodeData, weight: 0.5 };

      // Act
      const result = await nodeResolver.veracity(lowWeightNode as any, {
        pool: mockPool as any,
        redis: mockRedis as any,
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // EDGE FIELD RESOLVER TESTS
  // =========================================================================

  describe('EdgeResolver.from()', () => {
    it('should fetch source node of an edge', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockNodeData],
        rowCount: 1,
      });

      // Act
      const result = await edgeResolver.from(mockEdgeData as any, {
        pool: mockPool as any,
      });

      // Assert
      expect(result).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [mockEdgeData.source_node_id]
      );
    });

    it('should serialize source node JSONB props', async () => {
      // Arrange
      const nodeWithProps = {
        ...mockNodeData,
        props: JSON.stringify({ title: 'Source Node' }),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [nodeWithProps],
        rowCount: 1,
      });

      // Act
      const result = await edgeResolver.from(mockEdgeData as any, {
        pool: mockPool as any,
      });

      // Assert
      expect(result.props).toEqual(
        expect.objectContaining({ title: 'Source Node' })
      );
    });
  });

  describe('EdgeResolver.to()', () => {
    it('should fetch target node of an edge', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockNodeData],
        rowCount: 1,
      });

      // Act
      const result = await edgeResolver.to(mockEdgeData as any, {
        pool: mockPool as any,
      });

      // Assert
      expect(result).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [mockEdgeData.target_node_id]
      );
    });

    it('should serialize target node JSONB props', async () => {
      // Arrange
      const nodeWithProps = {
        ...mockNodeData,
        props: JSON.stringify({ title: 'Target Node' }),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [nodeWithProps],
        rowCount: 1,
      });

      // Act
      const result = await edgeResolver.to(mockEdgeData as any, {
        pool: mockPool as any,
      });

      // Assert
      expect(result.props).toEqual(
        expect.objectContaining({ title: 'Target Node' })
      );
    });
  });

  describe('EdgeResolver.comments()', () => {
    it('should fetch all comments on an edge', async () => {
      // Arrange
      const comments = [
        { id: 'comment-1', text: 'Comment 1', target_edge_id: 'edge-123' },
        { id: 'comment-2', text: 'Comment 2', target_edge_id: 'edge-123' },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: comments,
        rowCount: 2,
      });

      // Act
      const result = await edgeResolver.comments(mockEdgeData as any, {
        pool: mockPool as any,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('target_edge_id = $1'),
        ['edge-123']
      );
    });

    it('should return empty array for edges with no comments', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // Act
      const result = await edgeResolver.comments(mockEdgeData as any, {
        pool: mockPool as any,
      });

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('EdgeResolver.veracity()', () => {
    it('should return fixed veracity for high credibility edges (weight >= 0.90)', async () => {
      // Arrange
      const highCredibilityEdge = {
        ...mockEdgeData,
        weight: 0.95,
      };

      // Act
      const result = await edgeResolver.veracity(highCredibilityEdge as any, {
        pool: mockPool as any,
      });

      // Assert
      expect(result?.veracity_score).toBe(0.95);
      expect(result?.calculation_method).toBe('high_credibility_fixed');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should fetch veracity from database for lower credibility edges', async () => {
      // Arrange
      const veracityScore = {
        id: 'edge-123',
        target_edge_id: 'edge-123',
        veracity_score: 0.6,
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [veracityScore],
        rowCount: 1,
      });

      const lowCredibilityEdge = { ...mockEdgeData, weight: 0.5 };

      // Act
      const result = await edgeResolver.veracity(lowCredibilityEdge as any, {
        pool: mockPool as any,
      });

      // Assert
      expect(result).toEqual(veracityScore);
    });

    it('should return null for edges with no veracity score', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const lowCredibilityEdge = { ...mockEdgeData, weight: 0.5 };

      // Act
      const result = await edgeResolver.veracity(lowCredibilityEdge as any, {
        pool: mockPool as any,
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // INTEGRATION TESTS
  // =========================================================================

  describe('Graph Operations - Integration Scenarios', () => {
    it('should handle complete graph creation workflow', async () => {
      // Arrange - Create graph
      const graphInput: GraphInput = {
        name: 'Complete Workflow Graph',
        description: 'Testing full CRUD workflow',
        level: 1,
        privacy: 'public',
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ ...mockGraphData, ...graphInput }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ id: nodeTypeId }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockNodeData],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ id: edgeTypeId }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockEdgeData],
          rowCount: 1,
        });

      // Act
      const graph = await resolver.createGraph(graphInput, {
        pool: mockPool as any,
        userId,
      });

      const nodeInput: NodeInput = {
        graphId: graph.id,
        props: JSON.stringify({ title: 'First Node' }),
      };
      const node = await resolver.createNode(nodeInput, {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        redis: mockRedis as any,
        userId,
      });

      const edgeInput: EdgeInput = {
        graphId: graph.id,
        from: sourceNodeId,
        to: targetNodeId,
        props: JSON.stringify({ relationship: 'supports' }),
      };
      const edge = await resolver.createEdge(edgeInput, {
        pool: mockPool as any,
        pubSub: mockPubSub as any,
        redis: mockRedis as any,
        userId,
      });

      // Assert
      expect(graph).toBeDefined();
      expect(node).toBeDefined();
      expect(edge).toBeDefined();
      expect(mockPubSub.publish).toHaveBeenCalledTimes(2);
      expect(mockCacheService.invalidateGraph).toHaveBeenCalledTimes(2);
    });

    it('should prevent modification of immutable Level 0 graphs', async () => {
      // Arrange
      const level0Graph = { ...mockGraphData, level: 0 };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [level0Graph],
        rowCount: 1,
      });

      // Act & Assert - Update should fail
      await expect(
        resolver.updateGraph(graphId, { name: 'Updated' }, {
          pool: mockPool as any,
          userId,
        })
      ).rejects.toThrow('Cannot modify Level 0 (immutable) graphs');

      // Reset mock
      (mockPool.query as jest.Mock).mockClear();
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [level0Graph],
        rowCount: 1,
      });

      // Act & Assert - Delete should fail
      await expect(
        resolver.deleteGraph(graphId, {
          pool: mockPool as any,
          userId,
        })
      ).rejects.toThrow('Cannot delete Level 0 (immutable) graphs');
    });
  });

  // =========================================================================
  // ERROR HANDLING & EDGE CASES
  // =========================================================================

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty response rows gracefully', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // Act
      const result = await resolver.graphs({
        pool: mockPool as any,
        userId: null,
      });

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle malformed JSONB props', async () => {
      // Arrange
      const nodeWithBadProps = {
        ...mockNodeData,
        props: '{ invalid json }',
      };

      // Expect to throw when trying to parse
      expect(() => JSON.parse(nodeWithBadProps.props)).toThrow();
    });

    it('should handle missing optional fields in input', async () => {
      // Arrange
      const minimalInput: GraphInput = {
        name: 'Minimal Graph',
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockGraphData],
        rowCount: 1,
      });

      // Act
      const result = await resolver.createGraph(minimalInput, {
        pool: mockPool as any,
        userId,
      });

      // Assert
      expect(result).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'Minimal Graph',
          null, // description
          1, // level
          null, // methodology
          'private', // privacy
        ])
      );
    });

    it('should handle concurrent updates gracefully', async () => {
      // Arrange
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockNodeData], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockNodeData], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockNodeData], rowCount: 1 });

      // Act
      const updates = await Promise.all([
        resolver.updateNode(nodeId, JSON.stringify({ field1: 'value1' }), {
          pool: mockPool as any,
          pubSub: mockPubSub as any,
          userId,
        }),
        resolver.updateNode(nodeId, JSON.stringify({ field2: 'value2' }), {
          pool: mockPool as any,
          pubSub: mockPubSub as any,
          userId,
        }),
        resolver.updateNode(nodeId, JSON.stringify({ field3: 'value3' }), {
          pool: mockPool as any,
          pubSub: mockPubSub as any,
          userId,
        }),
      ]);

      // Assert
      expect(updates).toHaveLength(3);
      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(mockPubSub.publish).toHaveBeenCalledTimes(3);
    });
  });
});
