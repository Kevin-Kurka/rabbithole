/**
 * Timeline Layout Algorithm
 *
 * Arranges nodes chronologically based on timestamp or sequential data.
 * Useful for temporal analysis and event sequencing.
 *
 * Best for:
 * - Event sequences and historical data
 * - Process timelines
 * - Chronological analysis
 */

import { GraphCanvasNode, GraphCanvasEdge } from '@/types/graph';

export interface TimelineLayoutOptions {
  /** Orientation: 'horizontal' or 'vertical' */
  orientation?: 'horizontal' | 'vertical';
  /** Property key to use for timeline ordering (e.g., 'createdAt', 'timestamp') */
  timeKey?: string;
  /** Spacing between timeline positions */
  spacing?: number;
  /** Spacing between parallel tracks */
  trackSpacing?: number;
  /** Start position (x for horizontal, y for vertical) */
  startPosition?: number;
  /** Number of parallel tracks for nodes at same time */
  maxTracks?: number;
  /** Group nodes within this time window (milliseconds) */
  groupWindow?: number;
  /** Reverse chronological order */
  reverse?: boolean;
}

const DEFAULT_OPTIONS: Required<TimelineLayoutOptions> = {
  orientation: 'horizontal',
  timeKey: 'createdAt',
  spacing: 150,
  trackSpacing: 100,
  startPosition: 100,
  maxTracks: 5,
  groupWindow: 0, // No grouping by default
  reverse: false,
};

interface TimelineNode {
  node: GraphCanvasNode;
  timestamp: number;
  track: number;
}

/**
 * Apply timeline layout to nodes
 *
 * @param nodes - Array of nodes to layout
 * @param edges - Array of edges (used for track conflict resolution)
 * @param options - Layout configuration options
 * @returns Nodes with updated positions
 */
export function applyTimelineLayout(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  options: TimelineLayoutOptions = {}
): GraphCanvasNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (nodes.length === 0) return nodes;

  // Extract timestamps and create timeline nodes
  const timelineNodes: TimelineNode[] = nodes
    .map((node) => {
      const timestamp = extractTimestamp(node, opts.timeKey);
      return timestamp !== null
        ? { node, timestamp, track: 0 }
        : null;
    })
    .filter((tn): tn is TimelineNode => tn !== null);

  // Handle nodes without timestamps
  const nodesWithoutTime = nodes.filter(
    (node) => !timelineNodes.find((tn) => tn.node.id === node.id)
  );

  if (timelineNodes.length === 0) {
    // No nodes have timestamps, fall back to simple linear layout
    return applySimpleLinearLayout(nodes, opts);
  }

  // Sort by timestamp
  timelineNodes.sort((a, b) => {
    const order = opts.reverse ? -1 : 1;
    return order * (a.timestamp - b.timestamp);
  });

  // Group nodes by time window if specified
  const groups = opts.groupWindow > 0
    ? groupByTimeWindow(timelineNodes, opts.groupWindow)
    : timelineNodes.map((tn) => [tn]);

  // Assign tracks to avoid overlaps
  assignTracks(groups, edges, opts.maxTracks);

  // Calculate positions
  const isHorizontal = opts.orientation === 'horizontal';
  let currentPosition = opts.startPosition;

  const updatedNodes: GraphCanvasNode[] = [];

  groups.forEach((group) => {
    group.forEach((timelineNode) => {
      if (timelineNode.node.data.isLocked) {
        updatedNodes.push(timelineNode.node);
        return;
      }

      const trackOffset = timelineNode.track * opts.trackSpacing;

      updatedNodes.push({
        ...timelineNode.node,
        position: isHorizontal
          ? { x: currentPosition, y: opts.startPosition + trackOffset }
          : { x: opts.startPosition + trackOffset, y: currentPosition },
      });
    });

    currentPosition += opts.spacing;
  });

  // Place nodes without timestamps at the end
  nodesWithoutTime.forEach((node, index) => {
    if (node.data.isLocked) {
      updatedNodes.push(node);
      return;
    }

    const trackOffset = (index % opts.maxTracks) * opts.trackSpacing;

    updatedNodes.push({
      ...node,
      position: isHorizontal
        ? { x: currentPosition, y: opts.startPosition + trackOffset }
        : { x: opts.startPosition + trackOffset, y: currentPosition },
    });
  });

  return updatedNodes;
}

/**
 * Extract timestamp from node data
 */
function extractTimestamp(node: GraphCanvasNode, timeKey: string): number | null {
  const value = node.data[timeKey];

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const timestamp = Date.parse(value);
    return isNaN(timestamp) ? null : timestamp;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return null;
}

/**
 * Group timeline nodes by time window
 */
function groupByTimeWindow(
  timelineNodes: TimelineNode[],
  windowSize: number
): TimelineNode[][] {
  const groups: TimelineNode[][] = [];
  let currentGroup: TimelineNode[] = [];
  let groupStartTime: number | null = null;

  timelineNodes.forEach((tn) => {
    if (groupStartTime === null) {
      groupStartTime = tn.timestamp;
      currentGroup.push(tn);
    } else if (tn.timestamp - groupStartTime <= windowSize) {
      currentGroup.push(tn);
    } else {
      groups.push(currentGroup);
      currentGroup = [tn];
      groupStartTime = tn.timestamp;
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Assign tracks to nodes to minimize edge crossings
 */
function assignTracks(
  groups: TimelineNode[][],
  edges: GraphCanvasEdge[],
  maxTracks: number
): void {
  // Build edge map for quick lookup
  const edgeMap = new Map<string, Set<string>>();
  edges.forEach((edge) => {
    if (!edgeMap.has(edge.source)) {
      edgeMap.set(edge.source, new Set());
    }
    edgeMap.get(edge.source)!.add(edge.target);
  });

  groups.forEach((group) => {
    // Track which tracks are occupied
    const occupiedTracks = new Set<number>();

    group.forEach((timelineNode) => {
      // Find the best available track
      let bestTrack = 0;
      let minConflicts = Infinity;

      for (let track = 0; track < maxTracks; track++) {
        if (occupiedTracks.has(track)) continue;

        // Count conflicts if we place node on this track
        const conflicts = countTrackConflicts(timelineNode, track, group, edgeMap);

        if (conflicts < minConflicts) {
          minConflicts = conflicts;
          bestTrack = track;
        }

        if (conflicts === 0) break; // Perfect track found
      }

      timelineNode.track = bestTrack;
      occupiedTracks.add(bestTrack);
    });
  });
}

/**
 * Count potential conflicts if node is placed on given track
 */
function countTrackConflicts(
  timelineNode: TimelineNode,
  track: number,
  group: TimelineNode[],
  edgeMap: Map<string, Set<string>>
): number {
  let conflicts = 0;

  // Check connections to other nodes in the group
  const nodeId = timelineNode.node.id;
  const connections = edgeMap.get(nodeId) || new Set();

  group.forEach((other) => {
    if (other === timelineNode) return;

    const isConnected =
      connections.has(other.node.id) || edgeMap.get(other.node.id)?.has(nodeId);

    if (isConnected) {
      // Prefer same track for connected nodes
      if (other.track !== track) {
        conflicts++;
      }
    } else {
      // Prefer different tracks for unconnected nodes
      if (other.track === track) {
        conflicts++;
      }
    }
  });

  return conflicts;
}

/**
 * Simple linear layout fallback for nodes without timestamps
 */
function applySimpleLinearLayout(
  nodes: GraphCanvasNode[],
  opts: Required<TimelineLayoutOptions>
): GraphCanvasNode[] {
  const isHorizontal = opts.orientation === 'horizontal';

  return nodes.map((node, index) => {
    if (node.data.isLocked) return node;

    const position = opts.startPosition + index * opts.spacing;
    const trackOffset = (index % opts.maxTracks) * opts.trackSpacing;

    return {
      ...node,
      position: isHorizontal
        ? { x: position, y: opts.startPosition + trackOffset }
        : { x: opts.startPosition + trackOffset, y: position },
    };
  });
}

/**
 * Apply swimlane timeline layout
 *
 * Groups nodes into horizontal/vertical lanes based on a category
 * and orders them chronologically within each lane
 */
export function applySwimLaneLayout(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  laneKey: keyof GraphCanvasNode['data'],
  options: TimelineLayoutOptions = {}
): GraphCanvasNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (nodes.length === 0) return nodes;

  // Group nodes by lane
  const lanes = new Map<unknown, GraphCanvasNode[]>();
  nodes.forEach((node) => {
    const laneValue = node.data[laneKey];
    if (!lanes.has(laneValue)) {
      lanes.set(laneValue, []);
    }
    lanes.get(laneValue)!.push(node);
  });

  // Sort lanes
  const sortedLanes = Array.from(lanes.entries()).sort((a, b) =>
    String(a[0]).localeCompare(String(b[0]))
  );

  const isHorizontal = opts.orientation === 'horizontal';
  const updatedNodes: GraphCanvasNode[] = [];

  sortedLanes.forEach(([_, laneNodes], laneIndex) => {
    const lanePosition = opts.startPosition + laneIndex * opts.trackSpacing;

    // Apply timeline layout within the lane
    const laneLayouted = applyTimelineLayout(laneNodes, edges, {
      ...opts,
      maxTracks: 1, // Single track per lane
    });

    // Adjust positions for lane offset
    laneLayouted.forEach((node) => {
      updatedNodes.push({
        ...node,
        position: isHorizontal
          ? { x: node.position.x, y: lanePosition }
          : { x: lanePosition, y: node.position.y },
      });
    });
  });

  return updatedNodes;
}

/**
 * Get recommended timeline options based on node count and time range
 */
export function getRecommendedTimelineOptions(
  nodes: GraphCanvasNode[],
  timeKey: string
): TimelineLayoutOptions {
  const timestamps = nodes
    .map((node) => extractTimestamp(node, timeKey))
    .filter((t): t is number => t !== null);

  if (timestamps.length === 0) {
    return DEFAULT_OPTIONS;
  }

  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const timeRange = maxTime - minTime;

  // Determine if we should group by time window
  const avgDensity = timestamps.length / (timeRange || 1);
  const groupWindow = avgDensity > 0.001 ? timeRange / 20 : 0; // Group if high density

  // Adjust spacing based on node count
  const spacing = nodes.length > 50 ? 100 : nodes.length > 20 ? 150 : 200;

  return {
    spacing,
    trackSpacing: 100,
    groupWindow,
    maxTracks: Math.min(5, Math.ceil(Math.sqrt(nodes.length))),
  };
}
