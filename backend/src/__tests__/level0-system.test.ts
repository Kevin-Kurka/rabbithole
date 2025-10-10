/**
 * Integration Tests for Level 0 vs Level 1 Graph System
 *
 * Tests the immutability constraints of Level 0 (immutable) graphs, nodes, and edges
 * versus the mutability of Level 1 (editable) graphs, nodes, and edges.
 *
 * Test Coverage:
 * - Graph level enforcement (Level 0 vs Level 1)
 * - Node immutability enforcement (is_level_0 flag)
 * - Edge immutability enforcement (is_level_0 flag)
 * - CRUD operations with proper authorization
 */

import { Pool, QueryResult, QueryResultRow } from 'pg';
import { GraphResolver } from '../resolvers/GraphResolver';
import { PubSubEngine } from 'graphql-subscriptions';

// Mock PubSub for testing - using any to avoid complex PubSubEngine typing issues
const createMockPubSub = (): PubSubEngine => ({
  publish: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockResolvedValue(0),
  unsubscribe: jest.fn().mockResolvedValue(undefined),
  asyncIterator: jest.fn(),
  asyncIterableIterator: jest.fn(),
} as any);

// Helper to create mock query results
const mockQuery = <T extends QueryResultRow = any>(
  rows: T[] = [],
  command = 'SELECT'
): QueryResult<T> => ({
  rows,
  command,
  rowCount: rows.length,
  oid: 0,
  fields: [],
});

describe('Level 0 vs Level 1 Graph System Integration Tests', () => {
  let mockPool: any;
  let mockPubSub: PubSubEngine;
  let graphResolver: GraphResolver;

  // Test data IDs
  const level0GraphId = 'level0-graph-id';
  const level1GraphId = 'level1-graph-id';
  const level0NodeId = 'level0-node-id';
  const level1NodeId = 'level1-node-id';
  const level0EdgeId = 'level0-edge-id';
  const level1EdgeId = 'level1-edge-id';
  const nodeTypeId = 'default-node-type-id';
  const edgeTypeId = 'default-edge-type-id';

  beforeEach(() => {
    // Create mock pool with query method
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    };

    mockPubSub = createMockPubSub();
    graphResolver = new GraphResolver();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Graph Level Enforcement', () => {
    describe('Create Graphs', () => {
      it('should create a Level 0 graph with level=0', async () => {
        const expectedGraph = {
          id: level0GraphId,
          name: 'Level 0 Graph',
          description: 'Immutable graph',
          level: 0,
          methodology: 'test',
          privacy: 'private',
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce(mockQuery([expectedGraph], 'INSERT'));

        const result = await graphResolver.createGraph(
          {
            name: 'Level 0 Graph',
            description: 'Immutable graph',
            level: 0,
            methodology: 'test',
            privacy: 'private',
          },
          { pool: mockPool }
        );

        expect(result).toMatchObject({
          id: level0GraphId,
          name: 'Level 0 Graph',
          level: 0,
        });
        expect(result.nodes).toEqual([]);
        expect(result.edges).toEqual([]);
      });

      it('should create a Level 1 graph with level=1 (default)', async () => {
        const expectedGraph = {
          id: level1GraphId,
          name: 'Level 1 Graph',
          description: 'Editable graph',
          level: 1,
          methodology: 'test',
          privacy: 'private',
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce(mockQuery([expectedGraph], 'INSERT'));

        const result = await graphResolver.createGraph(
          {
            name: 'Level 1 Graph',
            description: 'Editable graph',
            level: 1,
            methodology: 'test',
            privacy: 'private',
          },
          { pool: mockPool }
        );

        expect(result).toMatchObject({
          id: level1GraphId,
          name: 'Level 1 Graph',
          level: 1,
        });
      });
    });

    describe('Update Graphs', () => {
      it('should reject updates to Level 0 graphs', async () => {
        mockPool.query.mockResolvedValueOnce(mockQuery([{ level: 0 }]));

        await expect(
          graphResolver.updateGraph(
            level0GraphId,
            {
              name: 'Updated Name',
              description: 'Updated description',
              privacy: 'public',
            },
            { pool: mockPool }
          )
        ).rejects.toThrow('Cannot modify Level 0 (immutable) graphs');
      });

      it('should allow updates to Level 1 graphs', async () => {
        const updatedGraph = {
          id: level1GraphId,
          name: 'Updated Level 1 Graph',
          description: 'Updated description',
          level: 1,
          methodology: 'updated',
          privacy: 'public',
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce(mockQuery([{ level: 1 }]))
          .mockResolvedValueOnce(mockQuery([updatedGraph], 'UPDATE'))
          .mockResolvedValueOnce(mockQuery([]))
          .mockResolvedValueOnce(mockQuery([]));

        const result = await graphResolver.updateGraph(
          level1GraphId,
          {
            name: 'Updated Level 1 Graph',
            description: 'Updated description',
            methodology: 'updated',
            privacy: 'public',
          },
          { pool: mockPool }
        );

        expect(result).toMatchObject({
          id: level1GraphId,
          name: 'Updated Level 1 Graph',
          level: 1,
        });
      });
    });

    describe('Delete Graphs', () => {
      it('should reject deletion of Level 0 graphs', async () => {
        mockPool.query.mockResolvedValueOnce(mockQuery([{ level: 0 }]));

        await expect(
          graphResolver.deleteGraph(level0GraphId, { pool: mockPool })
        ).rejects.toThrow('Cannot delete Level 0 (immutable) graphs');
      });

      it('should allow deletion of Level 1 graphs', async () => {
        mockPool.query
          .mockResolvedValueOnce(mockQuery([{ level: 1 }]))
          .mockResolvedValueOnce(mockQuery([], 'DELETE'));

        const result = await graphResolver.deleteGraph(level1GraphId, { pool: mockPool });

        expect(result).toBe(true);
      });
    });
  });

  describe('2. Node Enforcement', () => {
    describe('Create Nodes', () => {
      it('should reject creating nodes in Level 0 graphs', async () => {
        mockPool.query.mockResolvedValueOnce(mockQuery([{ level: 0 }]));

        await expect(
          graphResolver.createNode(
            {
              graphId: level0GraphId,
              props: JSON.stringify({ label: 'Test Node' }),
            },
            { pool: mockPool, pubSub: mockPubSub }
          )
        ).rejects.toThrow('Cannot create nodes in Level 0 (immutable) graphs');
      });

      it('should allow creating nodes in Level 1 graphs', async () => {
        const newNode = {
          id: level1NodeId,
          graph_id: level1GraphId,
          weight: 1.0,
          props: JSON.stringify({ label: 'Test Node' }),
          is_level_0: false,
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce(mockQuery([{ level: 1 }]))
          .mockResolvedValueOnce(mockQuery([{ id: nodeTypeId }]))
          .mockResolvedValueOnce(mockQuery([newNode], 'INSERT'));

        const result = await graphResolver.createNode(
          {
            graphId: level1GraphId,
            props: JSON.stringify({ label: 'Test Node' }),
          },
          { pool: mockPool, pubSub: mockPubSub }
        );

        expect(result).toMatchObject({
          id: level1NodeId,
          is_level_0: false,
        });
      });
    });

    describe('Update Nodes', () => {
      it('should reject updates to Level 0 nodes (weight)', async () => {
        mockPool.query.mockResolvedValueOnce(mockQuery([{ is_level_0: true }]));

        await expect(
          graphResolver.updateNodeWeight(
            level0NodeId,
            2.5,
            { pool: mockPool, pubSub: mockPubSub }
          )
        ).rejects.toThrow('Cannot modify Level 0 (immutable) nodes');
      });

      it('should reject updates to Level 0 nodes (props)', async () => {
        mockPool.query.mockResolvedValueOnce(mockQuery([{ is_level_0: true }]));

        await expect(
          graphResolver.updateNode(
            level0NodeId,
            JSON.stringify({ label: 'Updated Label' }),
            { pool: mockPool, pubSub: mockPubSub }
          )
        ).rejects.toThrow('Cannot modify Level 0 (immutable) nodes');
      });

      it('should allow updates to Level 1 nodes (weight)', async () => {
        const updatedNode = {
          id: level1NodeId,
          weight: 3.0,
          props: '{}',
          is_level_0: false,
          updated_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce(mockQuery([{ is_level_0: false }]))
          .mockResolvedValueOnce(mockQuery([updatedNode], 'UPDATE'));

        const result = await graphResolver.updateNodeWeight(
          level1NodeId,
          3.0,
          { pool: mockPool, pubSub: mockPubSub }
        );

        expect(result.weight).toBe(3.0);
      });

      it('should allow updates to Level 1 nodes (props)', async () => {
        const updatedNode = {
          id: level1NodeId,
          props: JSON.stringify({ label: 'Updated Label' }),
          is_level_0: false,
          updated_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce(mockQuery([{ is_level_0: false }]))
          .mockResolvedValueOnce(mockQuery([updatedNode], 'UPDATE'));

        const result = await graphResolver.updateNode(
          level1NodeId,
          JSON.stringify({ label: 'Updated Label' }),
          { pool: mockPool, pubSub: mockPubSub }
        );

        expect(result.id).toBe(level1NodeId);
      });
    });

    describe('Delete Nodes', () => {
      it('should reject deletion of Level 0 nodes', async () => {
        mockPool.query.mockResolvedValueOnce(mockQuery([{ is_level_0: true }]));

        await expect(
          graphResolver.deleteNode(
            level0NodeId,
            { pool: mockPool, pubSub: mockPubSub }
          )
        ).rejects.toThrow('Cannot delete Level 0 (immutable) nodes');
      });

      it('should allow deletion of Level 1 nodes', async () => {
        mockPool.query
          .mockResolvedValueOnce(mockQuery([{ is_level_0: false }]))
          .mockResolvedValueOnce(mockQuery([], 'DELETE'));

        const result = await graphResolver.deleteNode(
          level1NodeId,
          { pool: mockPool, pubSub: mockPubSub }
        );

        expect(result).toBe(true);
      });
    });
  });

  describe('3. Edge Enforcement', () => {
    const sourceNodeId = 'source-node-id';
    const targetNodeId = 'target-node-id';

    describe('Create Edges', () => {
      it('should reject creating edges in Level 0 graphs', async () => {
        mockPool.query.mockResolvedValueOnce(mockQuery([{ level: 0 }]));

        await expect(
          graphResolver.createEdge(
            {
              graphId: level0GraphId,
              from: sourceNodeId,
              to: targetNodeId,
              props: JSON.stringify({ type: 'link' }),
            },
            { pool: mockPool, pubSub: mockPubSub }
          )
        ).rejects.toThrow('Cannot create edges in Level 0 (immutable) graphs');
      });

      it('should allow creating edges in Level 1 graphs', async () => {
        const newEdge = {
          id: level1EdgeId,
          graph_id: level1GraphId,
          source_node_id: sourceNodeId,
          target_node_id: targetNodeId,
          weight: 1.0,
          props: JSON.stringify({ type: 'link' }),
          is_level_0: false,
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce(mockQuery([{ level: 1 }]))
          .mockResolvedValueOnce(mockQuery([{ id: edgeTypeId }]))
          .mockResolvedValueOnce(mockQuery([newEdge], 'INSERT'));

        const result = await graphResolver.createEdge(
          {
            graphId: level1GraphId,
            from: sourceNodeId,
            to: targetNodeId,
            props: JSON.stringify({ type: 'link' }),
          },
          { pool: mockPool, pubSub: mockPubSub }
        );

        expect(result).toMatchObject({
          id: level1EdgeId,
          is_level_0: false,
        });
      });
    });

    describe('Update Edges', () => {
      it('should reject updates to Level 0 edges (weight)', async () => {
        mockPool.query.mockResolvedValueOnce(mockQuery([{ is_level_0: true }]));

        await expect(
          graphResolver.updateEdgeWeight(
            level0EdgeId,
            2.5,
            { pool: mockPool, pubSub: mockPubSub }
          )
        ).rejects.toThrow('Cannot modify Level 0 (immutable) edges');
      });

      it('should reject updates to Level 0 edges (props)', async () => {
        mockPool.query.mockResolvedValueOnce(mockQuery([{ is_level_0: true }]));

        await expect(
          graphResolver.updateEdge(
            level0EdgeId,
            JSON.stringify({ type: 'updated' }),
            { pool: mockPool, pubSub: mockPubSub }
          )
        ).rejects.toThrow('Cannot modify Level 0 (immutable) edges');
      });

      it('should allow updates to Level 1 edges (weight)', async () => {
        const updatedEdge = {
          id: level1EdgeId,
          weight: 3.5,
          props: '{}',
          is_level_0: false,
          updated_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce(mockQuery([{ is_level_0: false }]))
          .mockResolvedValueOnce(mockQuery([updatedEdge], 'UPDATE'));

        const result = await graphResolver.updateEdgeWeight(
          level1EdgeId,
          3.5,
          { pool: mockPool, pubSub: mockPubSub }
        );

        expect(result.weight).toBe(3.5);
      });

      it('should allow updates to Level 1 edges (props)', async () => {
        const updatedEdge = {
          id: level1EdgeId,
          props: JSON.stringify({ type: 'updated' }),
          is_level_0: false,
          updated_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce(mockQuery([{ is_level_0: false }]))
          .mockResolvedValueOnce(mockQuery([updatedEdge], 'UPDATE'));

        const result = await graphResolver.updateEdge(
          level1EdgeId,
          JSON.stringify({ type: 'updated' }),
          { pool: mockPool, pubSub: mockPubSub }
        );

        expect(result.id).toBe(level1EdgeId);
      });
    });

    describe('Delete Edges', () => {
      it('should reject deletion of Level 0 edges', async () => {
        mockPool.query.mockResolvedValueOnce(mockQuery([{ is_level_0: true }]));

        await expect(
          graphResolver.deleteEdge(
            level0EdgeId,
            { pool: mockPool, pubSub: mockPubSub }
          )
        ).rejects.toThrow('Cannot delete Level 0 (immutable) edges');
      });

      it('should allow deletion of Level 1 edges', async () => {
        mockPool.query
          .mockResolvedValueOnce(mockQuery([{ is_level_0: false }]))
          .mockResolvedValueOnce(mockQuery([], 'DELETE'));

        const result = await graphResolver.deleteEdge(
          level1EdgeId,
          { pool: mockPool, pubSub: mockPubSub }
        );

        expect(result).toBe(true);
      });
    });
  });

  describe('4. Complex Scenarios', () => {
    it('should prevent cascading modifications from Level 1 to Level 0 nodes', async () => {
      mockPool.query.mockResolvedValueOnce(mockQuery([{ is_level_0: true }]));

      await expect(
        graphResolver.updateNode(
          level0NodeId,
          JSON.stringify({ label: 'Modified' }),
          { pool: mockPool, pubSub: mockPubSub }
        )
      ).rejects.toThrow('Cannot modify Level 0 (immutable) nodes');
    });

    it('should allow querying Level 0 and Level 1 graphs together', async () => {
      const graphs = [
        {
          id: level0GraphId,
          name: 'Level 0 Graph',
          description: 'Immutable',
          level: 0,
          methodology: 'test',
          privacy: 'public',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: level1GraphId,
          name: 'Level 1 Graph',
          description: 'Editable',
          level: 1,
          methodology: 'test',
          privacy: 'private',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPool.query.mockResolvedValueOnce(mockQuery(graphs));

      const result = await graphResolver.graphs({ pool: mockPool });

      expect(result).toHaveLength(2);
      expect(result[0].level).toBe(0);
      expect(result[1].level).toBe(1);
    });

    it('should maintain referential integrity when deleting Level 1 graphs', async () => {
      mockPool.query
        .mockResolvedValueOnce(mockQuery([{ level: 1 }]))
        .mockResolvedValueOnce(mockQuery([], 'DELETE'));

      const result = await graphResolver.deleteGraph(level1GraphId, { pool: mockPool });

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('5. Edge Cases and Error Handling', () => {
    it('should handle non-existent graph gracefully', async () => {
      mockPool.query.mockResolvedValueOnce(mockQuery([]));

      const result = await graphResolver.graph('non-existent-id', { pool: mockPool });

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        graphResolver.graphs({ pool: mockPool })
      ).rejects.toThrow('Database connection failed');
    });

    it('should validate Level 0 flag consistency', async () => {
      mockPool.query.mockResolvedValueOnce(mockQuery([{ is_level_0: true }]));

      await expect(
        graphResolver.deleteNode(
          'some-level-0-node',
          { pool: mockPool, pubSub: mockPubSub }
        )
      ).rejects.toThrow('Cannot delete Level 0 (immutable) nodes');
    });

    it('should handle empty props gracefully', async () => {
      const newNode = {
        id: 'new-node-id',
        graph_id: level1GraphId,
        props: '{}',
        is_level_0: false,
        weight: 1.0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPool.query
        .mockResolvedValueOnce(mockQuery([{ level: 1 }]))
        .mockResolvedValueOnce(mockQuery([{ id: nodeTypeId }]))
        .mockResolvedValueOnce(mockQuery([newNode], 'INSERT'));

      const result = await graphResolver.createNode(
        {
          graphId: level1GraphId,
          props: '{}',
        },
        { pool: mockPool, pubSub: mockPubSub }
      );

      expect(result.props).toBe('{}');
    });
  });
});
