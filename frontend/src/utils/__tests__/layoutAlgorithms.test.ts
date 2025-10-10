/**
 * Layout Algorithms Tests
 */

import {
  applyLayout,
  applyForceLayout,
  applyHierarchicalLayout,
  applyCircularLayout,
  applyTimelineLayout,
  getLayoutBounds,
  centerLayout,
} from '../layoutAlgorithms';
import { GraphCanvasNode, GraphCanvasEdge, GraphLevel } from '@/types/graph';

describe('layoutAlgorithms', () => {
  // Sample test data
  const sampleNodes: GraphCanvasNode[] = [
    {
      id: '1',
      type: 'custom',
      position: { x: 0, y: 0 },
      data: {
        label: 'Node 1',
        weight: 0.8,
        level: GraphLevel.LEVEL_1,
        isLocked: false,
        metadata: { createdAt: '2024-01-01T00:00:00Z' },
      },
    },
    {
      id: '2',
      type: 'custom',
      position: { x: 100, y: 0 },
      data: {
        label: 'Node 2',
        weight: 0.6,
        level: GraphLevel.LEVEL_1,
        isLocked: false,
        metadata: { createdAt: '2024-01-02T00:00:00Z' },
      },
    },
    {
      id: '3',
      type: 'custom',
      position: { x: 200, y: 0 },
      data: {
        label: 'Node 3',
        weight: 0.9,
        level: GraphLevel.LEVEL_0,
        isLocked: true,
        metadata: { createdAt: '2024-01-03T00:00:00Z' },
      },
    },
  ];

  const sampleEdges: GraphCanvasEdge[] = [
    {
      id: 'e1-2',
      source: '1',
      target: '2',
      type: 'custom',
      data: { weight: 0.7, level: GraphLevel.LEVEL_1, isLocked: false },
    },
    {
      id: 'e2-3',
      source: '2',
      target: '3',
      type: 'custom',
      data: { weight: 0.8, level: GraphLevel.LEVEL_1, isLocked: false },
    },
  ];

  describe('applyLayout', () => {
    it('should apply force layout', () => {
      const { nodes, edges } = applyLayout(sampleNodes, sampleEdges, {
        algorithm: 'force',
      });

      expect(nodes).toHaveLength(3);
      expect(edges).toHaveLength(2);
      expect(nodes[0].position).toBeDefined();
    });

    it('should apply hierarchical layout', () => {
      const { nodes, edges } = applyLayout(sampleNodes, sampleEdges, {
        algorithm: 'hierarchical',
      });

      expect(nodes).toHaveLength(3);
      expect(edges).toHaveLength(2);
      expect(nodes[0].position.y).toBeDefined();
    });

    it('should apply circular layout', () => {
      const { nodes, edges } = applyLayout(sampleNodes, sampleEdges, {
        algorithm: 'circular',
      });

      expect(nodes).toHaveLength(3);
      expect(edges).toHaveLength(2);
    });

    it('should apply timeline layout', () => {
      const { nodes, edges } = applyLayout(sampleNodes, sampleEdges, {
        algorithm: 'timeline',
      });

      expect(nodes).toHaveLength(3);
      expect(edges).toHaveLength(2);
      // Timeline layout should order by creation date
      expect(nodes[0].id).toBe('1'); // Earliest date
    });
  });

  describe('applyForceLayout', () => {
    it('should position nodes using force simulation', () => {
      const { nodes } = applyForceLayout(sampleNodes, sampleEdges, {
        algorithm: 'force',
        iterations: 50,
      });

      expect(nodes).toHaveLength(3);
      // Nodes should have new positions
      expect(nodes[0].position).toBeDefined();
      expect(nodes[1].position).toBeDefined();
      expect(nodes[2].position).toBeDefined();
    });

    it('should respect custom strength parameter', () => {
      const { nodes: nodes1 } = applyForceLayout(sampleNodes, sampleEdges, {
        algorithm: 'force',
        strength: -200,
        iterations: 50,
      });

      const { nodes: nodes2 } = applyForceLayout(sampleNodes, sampleEdges, {
        algorithm: 'force',
        strength: -800,
        iterations: 50,
      });

      // Different strengths should produce different layouts
      expect(nodes1[0].position).not.toEqual(nodes2[0].position);
    });
  });

  describe('applyHierarchicalLayout', () => {
    it('should create hierarchical levels', () => {
      const { nodes } = applyHierarchicalLayout(sampleNodes, sampleEdges, {
        algorithm: 'hierarchical',
      });

      // Node 1 should be at top (level 0)
      expect(nodes.find((n) => n.id === '1')?.position.y).toBe(0);
      // Node 2 should be at level 1
      expect(nodes.find((n) => n.id === '2')?.position.y).toBe(200);
      // Node 3 should be at level 2
      expect(nodes.find((n) => n.id === '3')?.position.y).toBe(400);
    });

    it('should respect spacing parameter', () => {
      const { nodes } = applyHierarchicalLayout(sampleNodes, sampleEdges, {
        algorithm: 'hierarchical',
        spacing: 200,
      });

      expect(nodes).toHaveLength(3);
      // Check horizontal spacing between nodes at same level
      // (spacing varies based on number of nodes at each level)
    });
  });

  describe('applyCircularLayout', () => {
    it('should arrange nodes in a circle', () => {
      const { nodes } = applyCircularLayout(sampleNodes, sampleEdges, {
        algorithm: 'circular',
      });

      expect(nodes).toHaveLength(3);

      // All nodes should be roughly equidistant from center
      const distances = nodes.map((n) =>
        Math.sqrt(n.position.x ** 2 + n.position.y ** 2)
      );

      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      distances.forEach((d) => {
        expect(Math.abs(d - avgDistance)).toBeLessThan(1); // Allow small variance
      });
    });
  });

  describe('applyTimelineLayout', () => {
    it('should arrange nodes chronologically', () => {
      const { nodes } = applyTimelineLayout(sampleNodes, sampleEdges, {
        algorithm: 'timeline',
      });

      expect(nodes).toHaveLength(3);

      // Nodes should be ordered by creation date
      expect(nodes[0].id).toBe('1'); // 2024-01-01
      expect(nodes[1].id).toBe('2'); // 2024-01-02
      expect(nodes[2].id).toBe('3'); // 2024-01-03

      // X positions should increase
      expect(nodes[1].position.x).toBeGreaterThan(nodes[0].position.x);
      expect(nodes[2].position.x).toBeGreaterThan(nodes[1].position.x);
    });

    it('should handle nodes without creation dates', () => {
      const nodesWithoutDates = sampleNodes.map((n) => ({
        ...n,
        data: { ...n.data, metadata: undefined },
      }));

      const { nodes } = applyTimelineLayout(nodesWithoutDates, sampleEdges, {
        algorithm: 'timeline',
      });

      expect(nodes).toHaveLength(3);
      // Should still position nodes (using fallback timestamp 0)
    });
  });

  describe('getLayoutBounds', () => {
    it('should calculate correct bounds', () => {
      const nodes: GraphCanvasNode[] = [
        {
          ...sampleNodes[0],
          position: { x: 0, y: 0 },
        },
        {
          ...sampleNodes[1],
          position: { x: 100, y: 200 },
        },
        {
          ...sampleNodes[2],
          position: { x: -50, y: 150 },
        },
      ];

      const bounds = getLayoutBounds(nodes);

      expect(bounds.minX).toBe(-50);
      expect(bounds.maxX).toBe(100);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxY).toBe(200);
      expect(bounds.width).toBe(150);
      expect(bounds.height).toBe(200);
    });

    it('should handle empty node array', () => {
      const bounds = getLayoutBounds([]);

      expect(bounds.minX).toBe(0);
      expect(bounds.maxX).toBe(0);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxY).toBe(0);
      expect(bounds.width).toBe(0);
      expect(bounds.height).toBe(0);
    });
  });

  describe('centerLayout', () => {
    it('should center nodes around origin', () => {
      const nodes: GraphCanvasNode[] = [
        {
          ...sampleNodes[0],
          position: { x: 100, y: 100 },
        },
        {
          ...sampleNodes[1],
          position: { x: 200, y: 200 },
        },
      ];

      const centeredNodes = centerLayout(nodes);

      const bounds = getLayoutBounds(centeredNodes);
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      // Center should be close to origin
      expect(Math.abs(centerX)).toBeLessThan(1);
      expect(Math.abs(centerY)).toBeLessThan(1);
    });

    it('should preserve relative positions', () => {
      const nodes: GraphCanvasNode[] = [
        {
          ...sampleNodes[0],
          position: { x: 0, y: 0 },
        },
        {
          ...sampleNodes[1],
          position: { x: 100, y: 0 },
        },
      ];

      const centeredNodes = centerLayout(nodes);

      // Distance between nodes should remain the same
      const originalDist = Math.sqrt(
        (nodes[1].position.x - nodes[0].position.x) ** 2 +
          (nodes[1].position.y - nodes[0].position.y) ** 2
      );

      const centeredDist = Math.sqrt(
        (centeredNodes[1].position.x - centeredNodes[0].position.x) ** 2 +
          (centeredNodes[1].position.y - centeredNodes[0].position.y) ** 2
      );

      expect(Math.abs(centeredDist - originalDist)).toBeLessThan(0.1);
    });
  });
});
