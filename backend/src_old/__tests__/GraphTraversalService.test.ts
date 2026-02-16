import { Pool } from 'pg';
import { GraphTraversalService } from '../services/GraphTraversalService';

// Mock pool
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

describe('GraphTraversalService', () => {
  let service: GraphTraversalService;

  beforeEach(() => {
    service = new GraphTraversalService(mockPool);
    jest.clearAllMocks();
  });

  describe('findPath', () => {
    it('should find the path between two nodes', async () => {
      const mockResult = {
        meeting_node_id: 'node2',
        forward_path: ['node1', 'node2'],
        backward_path: ['node3', 'node2'],
        forward_edges: ['edge1'],
        backward_edges: ['edge2'],
        total_depth: 2,
        total_weight: 0.8
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockResult] }) // findPath query
        .mockResolvedValueOnce({ rows: [] }) // fetchNodesByIds
        .mockResolvedValueOnce({ rows: [] }); // fetchEdgesByIds

      const result = await service.findPath('node1', 'node3');

      expect(result.found).toBe(true);
      expect(result.pathLength).toBe(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE'),
        ['node1', 'node3', 6, 0.5]
      );
    });

    it('should return not found when no path exists', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.findPath('node1', 'node999');

      expect(result.found).toBe(false);
      expect(result.nodes).toEqual([]);
    });

    it('should respect max depth parameter', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      await service.findPath('node1', 'node3', 5);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['node1', 'node3', 5, 0.5]
      );
    });
  });

  describe('getSubgraph', () => {
    it('should get all nodes within specified depth', async () => {
      const mockSubgraph = {
        nodes: [
          { id: 'node1', title: 'Root', node_type_id: 'type1', props: {}, ai: {}, created_at: new Date(), updated_at: new Date() },
          { id: 'node2', title: 'Child', node_type_id: 'type2', props: {}, ai: {}, created_at: new Date(), updated_at: new Date() },
        ],
        edges: [
          { id: 'edge1', source_node_id: 'node1', target_node_id: 'node2', edge_type_id: 'typeA', props: {}, ai: {}, created_at: new Date(), updated_at: new Date() },
        ],
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ subgraph: mockSubgraph }],
      });

      const result = await service.getSubgraph('node1', 2);

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE'),
        ['node1', 2, 0.5, 500]
      );
    });

    it('should return empty subgraph for non-existent node', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.getSubgraph('nonexistent');

      expect(result).toEqual({ nodes: [], edges: [], centerNode: null });
    });
  });

  describe('findRelatedNodes', () => {
    it('should find nodes related by specific relationship type', async () => {
      const mockResult = {
        nodes: [
          { id: 'node2', title: 'Evidence 1', node_type_id: 'type1', props: {}, ai: {}, created_at: new Date(), updated_at: new Date() },
        ],
        paths: [
          { node_path: ['node1', 'node2'], edge_path: ['edge1'], path_weight: 0.9, depth: 1 }
        ]
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ result: mockResult }] }) // findRelatedNodes query
        .mockResolvedValueOnce({ rows: [] }); // fetchEdgesByIds

      const result = await service.findRelatedNodes(
        'node1',
        'type_supports',
        2
      );

      expect(result.nodes).toHaveLength(1);
      expect(result.paths).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE'),
        ['node1', 'type_supports', 2, 0.5]
      );
    });

    it('should return empty array when no matching relationships found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.findRelatedNodes(
        'node1',
        'nonexistent-relationship',
        2
      );

      expect(result.nodes).toEqual([]);
      expect(result.paths).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      await expect(
        service.findPath('node1', 'node2')
      ).rejects.toThrow('Database connection failed');
    });
  });
});
