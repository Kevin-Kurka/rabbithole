import { Pool } from 'pg';
import { GraphTraversalService } from '../services/GraphTraversalService';

// Mock pool
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

describe('GraphTraversalService', () => {
  let service: GraphTraversalService;

  beforeEach(() => {
    service = new GraphTraversalService();
    jest.clearAllMocks();
  });

  describe('findShortestPath', () => {
    it('should find the shortest path between two nodes', async () => {
      const mockPath = [
        { nodeId: 'node1', distance: 0 },
        { nodeId: 'node2', distance: 1 },
        { nodeId: 'node3', distance: 2 },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockPath,
      });

      const result = await service.findShortestPath(mockPool, 'node1', 'node3');

      expect(result).toEqual(mockPath);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE'),
        ['node1', 'node3', 10]
      );
    });

    it('should return empty array when no path exists', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.findShortestPath(mockPool, 'node1', 'node999');

      expect(result).toEqual([]);
    });

    it('should respect max depth parameter', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      await service.findShortestPath(mockPool, 'node1', 'node3', 5);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['node1', 'node3', 5]
      );
    });
  });

  describe('getConnectedNodes', () => {
    it('should get all directly connected nodes', async () => {
      const mockNodes = [
        { id: 'node2', title: 'Node 2', type: 'fact', relationship: 'supports' },
        { id: 'node3', title: 'Node 3', type: 'claim', relationship: 'challenges' },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockNodes,
      });

      const result = await service.getConnectedNodes(mockPool, 'node1');

      expect(result).toEqual(mockNodes);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM public."Edges"'),
        ['node1']
      );
    });

    it('should return empty array for isolated nodes', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.getConnectedNodes(mockPool, 'isolated-node');

      expect(result).toEqual([]);
    });

    it('should include both incoming and outgoing connections', async () => {
      const mockNodes = [
        { id: 'node2', title: 'Outgoing', type: 'fact', relationship: 'supports' },
        { id: 'node3', title: 'Incoming', type: 'claim', relationship: 'supported_by' },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockNodes,
      });

      const result = await service.getConnectedNodes(mockPool, 'node1');

      expect(result).toHaveLength(2);
    });
  });

  describe('getSubgraph', () => {
    it('should get all nodes within specified depth', async () => {
      const mockSubgraph = {
        nodes: [
          { id: 'node1', title: 'Root', type: 'claim', depth: 0 },
          { id: 'node2', title: 'Child', type: 'fact', depth: 1 },
          { id: 'node3', title: 'Grandchild', type: 'evidence', depth: 2 },
        ],
        edges: [
          { source: 'node1', target: 'node2', relationship: 'supports' },
          { source: 'node2', target: 'node3', relationship: 'cites' },
        ],
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockSubgraph.nodes })
        .mockResolvedValueOnce({ rows: mockSubgraph.edges });

      const result = await service.getSubgraph(mockPool, 'node1', 2);

      expect(result).toEqual(mockSubgraph);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should respect depth limit', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await service.getSubgraph(mockPool, 'node1', 3);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE p.depth <='),
        ['node1', 3]
      );
    });

    it('should return empty subgraph for non-existent node', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getSubgraph(mockPool, 'nonexistent', 2);

      expect(result).toEqual({ nodes: [], edges: [] });
    });
  });

  describe('findRelatedNodes', () => {
    it('should find nodes related by specific relationship type', async () => {
      const mockRelated = [
        { id: 'node2', title: 'Evidence 1', type: 'evidence', distance: 1 },
        { id: 'node3', title: 'Evidence 2', type: 'evidence', distance: 1 },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockRelated,
      });

      const result = await service.findRelatedNodes(
        mockPool,
        'node1',
        'supports',
        2
      );

      expect(result).toEqual(mockRelated);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('et.relationship ='),
        ['node1', 'supports', 2]
      );
    });

    it('should return empty array when no matching relationships found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.findRelatedNodes(
        mockPool,
        'node1',
        'nonexistent-relationship',
        2
      );

      expect(result).toEqual([]);
    });
  });

  describe('getNodeInfluence', () => {
    it('should calculate node influence based on connections', async () => {
      const mockInfluence = {
        nodeId: 'node1',
        incomingCount: 5,
        outgoingCount: 3,
        totalConnections: 8,
        influenceScore: 0.75,
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockInfluence],
      });

      const result = await service.getNodeInfluence(mockPool, 'node1');

      expect(result).toEqual(mockInfluence);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT'),
        ['node1']
      );
    });

    it('should return zero influence for isolated node', async () => {
      const mockInfluence = {
        nodeId: 'isolated',
        incomingCount: 0,
        outgoingCount: 0,
        totalConnections: 0,
        influenceScore: 0,
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockInfluence],
      });

      const result = await service.getNodeInfluence(mockPool, 'isolated');

      expect(result.influenceScore).toBe(0);
    });
  });

  describe('detectCycles', () => {
    it('should detect circular relationships', async () => {
      const mockCycles = [
        { path: ['node1', 'node2', 'node3', 'node1'], length: 3 },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockCycles,
      });

      const result = await service.detectCycles(mockPool, 'node1');

      expect(result).toEqual(mockCycles);
      expect(result[0].path[0]).toBe(result[0].path[result[0].path.length - 1]);
    });

    it('should return empty array when no cycles exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.detectCycles(mockPool, 'node1');

      expect(result).toEqual([]);
    });
  });

  describe('getPathTypes', () => {
    it('should get all relationship types in a path', async () => {
      const mockTypes = ['supports', 'cites', 'challenges'];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockTypes.map(type => ({ relationship: type })),
      });

      const result = await service.getPathTypes(mockPool, 'node1', 'node4');

      expect(result).toEqual(mockTypes);
    });

    it('should return empty array for unconnected nodes', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.getPathTypes(mockPool, 'node1', 'node999');

      expect(result).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      await expect(
        service.findShortestPath(mockPool, 'node1', 'node2')
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid node IDs', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.getConnectedNodes(mockPool, '');

      expect(result).toEqual([]);
    });
  });
});
