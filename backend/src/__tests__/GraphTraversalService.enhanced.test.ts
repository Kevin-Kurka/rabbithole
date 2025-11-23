import { Pool } from 'pg';
import { GraphTraversalService } from '../services/GraphTraversalService';
import { Node } from '../entities/Node';
import { Edge } from '../entities/Edge';

describe('GraphTraversalService - Enhanced Tests', () => {
  let service: GraphTraversalService;
  let mockPool: jest.Mocked<Partial<Pool>>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as any;

    service = new GraphTraversalService(mockPool as Pool);
    jest.clearAllMocks();
  });

  describe('findPath - path finding and cycle detection', () => {
    it('should find shortest path between two nodes', async () => {
      const mockResult = {
        rows: [
          {
            meeting_node_id: 'node-2',
            forward_path: ['node-1', 'node-2'],
            backward_path: ['node-2', 'node-3'],
            forward_edges: ['edge-1'],
            backward_edges: ['edge-2'],
            total_depth: 2,
            total_weight: 0.95,
          },
        ],
      };

      mockPool.query.mockResolvedValueOnce(mockResult);
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'node-1', node_type_id: 'type-1', props: {}, ai: null },
          { id: 'node-2', node_type_id: 'type-2', props: {}, ai: null },
          { id: 'node-3', node_type_id: 'type-3', props: {}, ai: null },
        ],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'edge-1',
            source_node_id: 'node-1',
            target_node_id: 'node-2',
            props: {},
          },
          {
            id: 'edge-2',
            source_node_id: 'node-2',
            target_node_id: 'node-3',
            props: {},
          },
        ],
      });

      const result = await service.findPath('node-1', 'node-3');

      expect(result.found).toBe(true);
      expect(result.pathLength).toBe(2);
      expect(result.totalWeight).toBe(0.95);
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
    });

    it('should return empty path when no connection exists', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.findPath('node-1', 'node-999');

      expect(result.found).toBe(false);
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
      expect(result.pathLength).toBe(0);
    });

    it('should respect maxDepth parameter to prevent runaway queries', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.findPath('node-1', 'node-999', 3);

      const query = mockPool.query.mock.calls[0][0] as string;
      expect(query).toContain('$3');
      const params = mockPool.query.mock.calls[0][1];
      expect(params[2]).toBe(3); // maxDepth
    });

    it('should apply minVeracity threshold to filter weak edges', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.findPath('node-1', 'node-2', 6, 0.7);

      const query = mockPool.query.mock.calls[0][0] as string;
      expect(query).toContain('weight');
      expect(query).toContain('$4');
      const params = mockPool.query.mock.calls[0][1];
      expect(params[3]).toBe(0.7); // minVeracity
    });

    it('should prevent cycles using path arrays', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.findPath('node-1', 'node-2');

      const query = mockPool.query.mock.calls[0][0] as string;
      // Query should use path array to prevent cycles
      expect(query).toContain('NOT n.id = ANY(fs.path)');
      expect(query).toContain('NOT n.id = ANY(bs.path)');
    });

    it('should calculate accumulated weight correctly', async () => {
      const mockResult = {
        rows: [
          {
            meeting_node_id: 'node-2',
            forward_path: ['node-1', 'node-2'],
            backward_path: ['node-2', 'node-3'],
            forward_edges: ['edge-1'],
            backward_edges: ['edge-2'],
            total_depth: 2,
            total_weight: 0.81, // 0.9 * 0.9 = 0.81
          },
        ],
      };

      mockPool.query.mockResolvedValueOnce(mockResult);
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'node-1', node_type_id: 't1', props: {}, ai: null },
          { id: 'node-2', node_type_id: 't2', props: {}, ai: null },
          { id: 'node-3', node_type_id: 't3', props: {}, ai: null },
        ],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.findPath('node-1', 'node-3');

      expect(result.totalWeight).toBe(0.81);
    });

    it('should handle bidirectional search correctly', async () => {
      const mockResult = {
        rows: [
          {
            meeting_node_id: 'node-2',
            forward_path: ['node-1', 'node-2'],
            backward_path: ['node-2', 'node-3'],
            forward_edges: ['edge-1'],
            backward_edges: ['edge-2'],
            total_depth: 2,
            total_weight: 1.0,
          },
        ],
      };

      mockPool.query.mockResolvedValueOnce(mockResult);
      mockPool.query.mockResolvedValueOnce({
        rows: Array.from({ length: 3 }, (_, i) => ({
          id: `node-${i + 1}`,
          node_type_id: 'type',
          props: {},
          ai: null,
        })),
      });
      mockPool.query.mockResolvedValueOnce({
        rows: Array.from({ length: 2 }, (_, i) => ({
          id: `edge-${i + 1}`,
          source_node_id: `node-${i + 1}`,
          target_node_id: `node-${i + 2}`,
          props: { weight: 1.0 },
        })),
      });

      const result = await service.findPath('node-1', 'node-3');

      expect(result.found).toBe(true);
      expect(result.pathLength).toBe(2);
    });
  });

  describe('getSubgraph - neighborhood expansion and context', () => {
    it('should expand subgraph outgoing from a node', async () => {
      const mockResult = {
        rows: [
          {
            subgraph: {
              nodes: [
                { id: 'center', node_type_id: 't1', props: {} },
                { id: 'child1', node_type_id: 't2', props: {} },
                { id: 'child2', node_type_id: 't2', props: {} },
              ],
              edges: [
                {
                  id: 'e1',
                  source_node_id: 'center',
                  target_node_id: 'child1',
                  props: {},
                },
                {
                  id: 'e2',
                  source_node_id: 'center',
                  target_node_id: 'child2',
                  props: {},
                },
              ],
            },
          },
        ],
      };

      mockPool.query.mockResolvedValueOnce(mockResult);

      const result = await service.getSubgraph('center', 2, 'outgoing');

      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
      expect(result.centerNode?.id).toBe('center');
    });

    it('should expand subgraph incoming to a node', async () => {
      const mockResult = {
        rows: [
          {
            subgraph: {
              nodes: [
                { id: 'parent1', node_type_id: 't1', props: {} },
                { id: 'parent2', node_type_id: 't1', props: {} },
                { id: 'center', node_type_id: 't2', props: {} },
              ],
              edges: [
                {
                  id: 'e1',
                  source_node_id: 'parent1',
                  target_node_id: 'center',
                  props: {},
                },
                {
                  id: 'e2',
                  source_node_id: 'parent2',
                  target_node_id: 'center',
                  props: {},
                },
              ],
            },
          },
        ],
      };

      mockPool.query.mockResolvedValueOnce(mockResult);

      const result = await service.getSubgraph('center', 2, 'incoming');

      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
    });

    it('should expand subgraph bidirectionally', async () => {
      const mockResult = {
        rows: [
          {
            subgraph: {
              nodes: [
                { id: 'node1', node_type_id: 't1', props: {} },
                { id: 'center', node_type_id: 't2', props: {} },
                { id: 'node3', node_type_id: 't3', props: {} },
              ],
              edges: [
                {
                  id: 'e1',
                  source_node_id: 'node1',
                  target_node_id: 'center',
                  props: {},
                },
                {
                  id: 'e2',
                  source_node_id: 'center',
                  target_node_id: 'node3',
                  props: {},
                },
              ],
            },
          },
        ],
      };

      mockPool.query.mockResolvedValueOnce(mockResult);

      const result = await service.getSubgraph('center', 2, 'both');

      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
    });

    it('should respect depth limit', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ subgraph: { nodes: [], edges: [] } }],
      });

      await service.getSubgraph('center', 5);

      const params = mockPool.query.mock.calls[0][1];
      expect(params[1]).toBe(5); // Depth parameter
    });

    it('should apply veracity filter', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ subgraph: { nodes: [], edges: [] } }],
      });

      await service.getSubgraph('center', 2, 'both', 0.8);

      const params = mockPool.query.mock.calls[0][1];
      expect(params[2]).toBe(0.8); // minVeracity
    });

    it('should respect maxNodes limit', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ subgraph: { nodes: [], edges: [] } }],
      });

      await service.getSubgraph('center', 2, 'both', 0.5, 100);

      const params = mockPool.query.mock.calls[0][1];
      expect(params[3]).toBe(100); // maxNodes
    });

    it('should handle empty subgraph gracefully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ subgraph: null }],
      });

      const result = await service.getSubgraph('nonexistent');

      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
      expect(result.centerNode).toBeNull();
    });
  });

  describe('findRelatedNodes - edge type filtering', () => {
    it('should find nodes connected via specific edge type', async () => {
      const mockResult = {
        rows: [
          {
            result: {
              nodes: [
                { id: 'node1', node_type_id: 't1', props: {} },
                { id: 'node2', node_type_id: 't1', props: {} },
              ],
              paths: [
                {
                  node_path: ['node1', 'node2'],
                  edge_path: ['edge1'],
                  path_weight: 0.9,
                  depth: 1,
                },
              ],
            },
          },
        ],
      };

      mockPool.query.mockResolvedValueOnce(mockResult);

      const result = await service.findRelatedNodes(
        'node1',
        'edge-type-supports'
      );

      expect(result.nodes).toHaveLength(2);
      expect(result.paths).toHaveLength(1);
    });

    it('should respect depth parameter for edge type search', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ result: { nodes: [], paths: [] } }],
      });

      await service.findRelatedNodes('node1', 'edge-type', 4);

      const params = mockPool.query.mock.calls[0][1];
      expect(params[2]).toBe(4); // Depth
    });

    it('should apply veracity threshold', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ result: { nodes: [], paths: [] } }],
      });

      await service.findRelatedNodes('node1', 'edge-type', 3, 0.6);

      const params = mockPool.query.mock.calls[0][1];
      expect(params[3]).toBe(0.6); // minVeracity
    });

    it('should track path weights', async () => {
      const mockResult = {
        rows: [
          {
            result: {
              nodes: [
                { id: 'node1', node_type_id: 't1', props: {} },
                { id: 'node2', node_type_id: 't2', props: {} },
                { id: 'node3', node_type_id: 't3', props: {} },
              ],
              paths: [
                {
                  node_path: ['node1', 'node2'],
                  edge_path: ['e1'],
                  path_weight: 0.95,
                  depth: 1,
                },
                {
                  node_path: ['node1', 'node2', 'node3'],
                  edge_path: ['e1', 'e2'],
                  path_weight: 0.85, // Lower due to accumulated edges
                  depth: 2,
                },
              ],
            },
          },
        ],
      };

      mockPool.query.mockResolvedValueOnce(mockResult);

      const result = await service.findRelatedNodes('node1', 'edge-type');

      expect(result.paths).toHaveLength(2);
      expect(result.paths[0].weight).toBeGreaterThan(result.paths[1].weight);
    });
  });

  describe('getNodeAncestors - provenance tracking', () => {
    it('should trace ancestor chain via primarySourceId', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'child', node_type_id: 't1', props: { primarySourceId: 'parent-id' }, ai: null, depth: 0 },
          { id: 'parent', node_type_id: 't2', props: { primarySourceId: 'grandparent-id' }, ai: null, depth: 1 },
          { id: 'grandparent', node_type_id: 't3', props: {}, ai: null, depth: 2 },
        ],
      });

      const result = await service.getNodeAncestors('child');

      expect(result.chain).toHaveLength(3);
      expect(result.chain[2].depth).toBe(2); // Deepest ancestor
      expect(result.chain[0].depth).toBe(0); // The node itself
    });

    it('should handle circular references in ancestry', async () => {
      // Service prevents cycles using path arrays
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'node1', node_type_id: 't1', props: { primarySourceId: 'node2' }, ai: null, depth: 0 },
          { id: 'node2', node_type_id: 't2', props: { primarySourceId: 'node1' }, ai: null, depth: 1 },
          // Should not recurse infinitely due to path tracking
        ],
      });

      const result = await service.getNodeAncestors('node1');

      // Should return without infinite loop
      expect(result.chain).toBeDefined();
    });

    it('should respect maxDepth limit', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.getNodeAncestors('node1', 5);

      const params = mockPool.query.mock.calls[0][1];
      expect(params[1]).toBe(5); // maxDepth
    });

    it('should return nodes ordered from root to leaf', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'c', node_type_id: 't', props: {}, ai: null, depth: 2 },
          { id: 'b', node_type_id: 't', props: {}, ai: null, depth: 1 },
          { id: 'a', node_type_id: 't', props: {}, ai: null, depth: 0 },
        ],
      });

      const result = await service.getNodeAncestors('c');

      // Check ordering (depth descending = root first)
      expect(result.chain[0].depth).toBeLessThanOrEqual(result.chain[1].depth);
    });
  });

  describe('getHighVeracityRelatedNodes - veracity-weighted ranking', () => {
    it('should rank nodes by combined veracity score', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'node1', node_type_id: 't1', props: { weight: 0.9 }, ai: null, edge_weight: 0.9, combined_score: 0.81 },
          { id: 'node2', node_type_id: 't2', props: { weight: 0.7 }, ai: null, edge_weight: 0.8, combined_score: 0.56 },
          { id: 'node3', node_type_id: 't3', props: { weight: 0.95 }, ai: null, edge_weight: 0.95, combined_score: 0.9025 },
        ],
      });

      const result = await service.getHighVeracityRelatedNodes('center');

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('node3'); // Highest combined score
    });

    it('should respect veracity threshold', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.getHighVeracityRelatedNodes('center', 20, 0.85);

      const params = mockPool.query.mock.calls[0][1];
      expect(params[2]).toBe(0.85); // minVeracity
    });

    it('should respect result limit', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: Array.from({ length: 50 }, (_, i) => ({
          id: `node-${i}`,
          node_type_id: 't',
          props: { weight: Math.random() },
          ai: null,
          edge_weight: Math.random(),
          combined_score: Math.random(),
        })),
      });

      const result = await service.getHighVeracityRelatedNodes('center', 10);

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should handle nodes with missing weights', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'node1', node_type_id: 't1', props: {}, ai: null, edge_weight: 0.8, combined_score: 0.8 },
          { id: 'node2', node_type_id: 't2', props: { weight: 0.9 }, ai: null, edge_weight: 0.8, combined_score: 0.72 },
        ],
      });

      const result = await service.getHighVeracityRelatedNodes('center');

      expect(result).toHaveLength(2);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle missing center node in subgraph', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            subgraph: {
              nodes: [
                { id: 'node1', node_type_id: 't1', props: {} },
                { id: 'node2', node_type_id: 't2', props: {} },
              ],
              edges: [],
            },
          },
        ],
      });

      const result = await service.getSubgraph('nonexistent');

      expect(result.centerNode).toBeNull();
      expect(result.nodes).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(
        service.findPath('node1', 'node2')
      ).rejects.toThrow('Database error');
    });

    it('should handle malformed query results', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            meeting_node_id: 'node-2',
            forward_path: null, // Malformed
            backward_path: null,
            forward_edges: null,
            backward_edges: null,
          },
        ],
      });

      // Should handle gracefully
      const result = await service.findPath('node1', 'node2');

      expect(result).toBeDefined();
    });

    it('should handle very deep graphs efficiently', async () => {
      const deepNodes = Array.from({ length: 100 }, (_, i) => ({
        id: `node-${i}`,
        node_type_id: 'type',
        props: {},
        ai: null,
      }));

      const deepEdges = Array.from({ length: 99 }, (_, i) => ({
        id: `edge-${i}`,
        source_node_id: `node-${i}`,
        target_node_id: `node-${i + 1}`,
        props: { weight: 1.0 },
      }));

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            meeting_node_id: 'node-50',
            forward_path: Array.from({ length: 51 }, (_, i) => `node-${i}`),
            backward_path: Array.from({ length: 50 }, (_, i) => `node-${51 + i}`),
            forward_edges: Array.from({ length: 50 }, (_, i) => `edge-${i}`),
            backward_edges: Array.from({ length: 49 }, (_, i) => `edge-${51 + i}`),
            total_depth: 100,
            total_weight: 1.0,
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({ rows: deepNodes });
      mockPool.query.mockResolvedValueOnce({ rows: deepEdges });

      const result = await service.findPath('node-0', 'node-99', 100);

      expect(result.found).toBe(true);
      expect(result.pathLength).toBe(100);
    });
  });

  describe('data transformation helpers', () => {
    it('should map database rows to Node entities', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'node-1', node_type_id: 't1', props: { title: 'Node 1' }, ai: null },
        ],
      });

      const result = await service.findPath('node1', 'node2');

      // Result should have properly mapped nodes
      expect(result.nodes).toBeDefined();
    });

    it('should handle JSON parsing of props field', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            meeting_node_id: 'node-1',
            forward_path: ['node-1', 'node-2'],
            backward_path: ['node-2'],
            forward_edges: [],
            backward_edges: [],
            total_depth: 1,
            total_weight: 1.0,
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'node-1',
            node_type_id: 't1',
            props: JSON.stringify({ title: 'Node 1' }), // String props
            ai: null,
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.findPath('node1', 'node2');

      expect(result.nodes[0].props).toEqual({ title: 'Node 1' });
    });

    it('should handle null ai (embedding) fields', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            meeting_node_id: 'node-1',
            forward_path: ['node-1'],
            backward_path: ['node-1'],
            forward_edges: [],
            backward_edges: [],
            total_depth: 0,
            total_weight: 1.0,
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'node-1',
            node_type_id: 't1',
            props: {},
            ai: null, // No embedding
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.findPath('node1', 'node1');

      expect(result.nodes[0].ai).toBeNull();
    });
  });

  describe('performance considerations', () => {
    it('should use recursive CTE for efficient traversal', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.findPath('node1', 'node2');

      const query = mockPool.query.mock.calls[0][0] as string;
      expect(query).toContain('WITH RECURSIVE');
    });

    it('should use prepared statement parameters', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.findPath('node1', 'node2', 5, 0.7);

      const params = mockPool.query.mock.calls[0][1];
      expect(params).toEqual(['node1', 'node2', 5, 0.7]);
    });
  });
});
