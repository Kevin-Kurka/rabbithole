/**
 * Graph Color Utilities
 *
 * Provides consistent color assignment for multi-graph overlays
 */

/**
 * Predefined color palette for graphs
 * Using colors that are visually distinct and work well in dark/light themes
 */
const GRAPH_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#a855f7', // Violet
];

/**
 * Get a color for a graph based on its ID
 * Uses consistent hashing to ensure the same graph always gets the same color
 */
export function getGraphColor(graphId: string, graphIds: string[]): string {
  const index = graphIds.indexOf(graphId);
  if (index === -1) return GRAPH_COLORS[0];
  return GRAPH_COLORS[index % GRAPH_COLORS.length];
}

/**
 * Get all graph colors as a map
 */
export function getGraphColorMap(graphIds: string[]): Map<string, string> {
  const colorMap = new Map<string, string>();
  graphIds.forEach((id, index) => {
    colorMap.set(id, GRAPH_COLORS[index % GRAPH_COLORS.length]);
  });
  return colorMap;
}

/**
 * Lighten a hex color by a percentage (for hover/active states)
 */
export function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

/**
 * Darken a hex color by a percentage (for shadow/border states)
 */
export function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = ((num >> 8) & 0x00ff) - amt;
  const B = (num & 0x0000ff) - amt;
  return (
    '#' +
    (
      0x1000000 +
      (R > 0 ? R : 0) * 0x10000 +
      (G > 0 ? G : 0) * 0x100 +
      (B > 0 ? B : 0)
    )
      .toString(16)
      .slice(1)
  );
}
