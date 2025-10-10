/**
 * Graph Export Utilities
 *
 * Functions for exporting graph visualizations in different formats:
 * - PNG: Raster image using html2canvas
 * - SVG: Vector graphics export
 * - JSON: Graph data structure
 */

import html2canvas from 'html2canvas';
import { GraphCanvasNode, GraphCanvasEdge } from '@/types/graph';

/**
 * Export format types
 */
export type ExportFormat = 'png' | 'svg' | 'json';

/**
 * Export metadata
 */
export interface ExportMetadata {
  title?: string;
  description?: string;
  methodology?: string;
  exportDate: string;
  version: string;
}

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  metadata?: Partial<ExportMetadata>;
  quality?: number; // For PNG export (0-1)
  scale?: number; // For PNG export (1-3)
}

/**
 * Main export function
 */
export async function exportGraph(
  format: ExportFormat,
  graphId: string,
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  options?: Partial<ExportOptions>
): Promise<void> {
  const defaultFilename = `graph-${graphId}-${Date.now()}`;
  const filename = options?.filename || defaultFilename;

  switch (format) {
    case 'png':
      await exportToPNG(filename, options);
      break;
    case 'svg':
      await exportToSVG(filename, nodes, edges);
      break;
    case 'json':
      await exportToJSON(filename, nodes, edges, options?.metadata);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Export graph as PNG image
 */
export async function exportToPNG(
  filename: string,
  options?: Partial<ExportOptions>
): Promise<void> {
  const canvasElement = document.querySelector('.react-flow') as HTMLElement;

  if (!canvasElement) {
    throw new Error('Canvas element not found');
  }

  try {
    const quality = options?.quality || 1.0;
    const scale = options?.scale || 2;

    const canvas = await html2canvas(canvasElement, {
      backgroundColor: '#1a1a1a',
      scale,
      logging: false,
      useCORS: true,
    });

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          downloadBlob(blob, `${filename}.png`);
        } else {
          throw new Error('Failed to create PNG blob');
        }
      },
      'image/png',
      quality
    );
  } catch (error) {
    console.error('PNG export failed:', error);
    throw error;
  }
}

/**
 * Export graph as SVG
 */
export async function exportToSVG(
  filename: string,
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[]
): Promise<void> {
  try {
    // Find bounds
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach((node) => {
      minX = Math.min(minX, node.position.x);
      maxX = Math.max(maxX, node.position.x + 150); // Node width
      minY = Math.min(minY, node.position.y);
      maxY = Math.max(maxY, node.position.y + 80); // Node height
    });

    const width = maxX - minX + 100;
    const height = maxY - minY + 100;
    const padding = 50;

    // Create SVG
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .node { fill: #3b82f6; stroke: #1e40af; stroke-width: 2; }
      .node-text { fill: #ffffff; font-family: Arial, sans-serif; font-size: 14px; text-anchor: middle; }
      .edge { stroke: #6b7280; stroke-width: 2; fill: none; }
      .edge-arrow { fill: #6b7280; }
    </style>
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" class="edge-arrow" />
    </marker>
  </defs>
  <rect width="${width}" height="${height}" fill="#1a1a1a"/>
`;

    // Add edges
    edges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      if (sourceNode && targetNode) {
        const x1 = sourceNode.position.x - minX + padding + 75; // Center of node
        const y1 = sourceNode.position.y - minY + padding + 40;
        const x2 = targetNode.position.x - minX + padding + 75;
        const y2 = targetNode.position.y - minY + padding + 40;

        svg += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="edge" marker-end="url(#arrowhead)"/>\n`;
      }
    });

    // Add nodes
    nodes.forEach((node) => {
      const x = node.position.x - minX + padding;
      const y = node.position.y - minY + padding;
      const label = node.data.label || 'Node';
      const color = getVeracityColorForSVG(node.data.weight);

      svg += `  <g>
    <rect x="${x}" y="${y}" width="150" height="80" rx="8" fill="${color}" stroke="${color}" stroke-width="2"/>
    <text x="${x + 75}" y="${y + 45}" class="node-text">${escapeXml(label)}</text>
  </g>\n`;
    });

    svg += '</svg>';

    // Download SVG
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    downloadBlob(blob, `${filename}.svg`);
  } catch (error) {
    console.error('SVG export failed:', error);
    throw error;
  }
}

/**
 * Export graph as JSON
 */
export async function exportToJSON(
  filename: string,
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  customMetadata?: Partial<ExportMetadata>
): Promise<void> {
  try {
    const metadata: ExportMetadata = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      ...customMetadata,
    };

    const data = {
      metadata,
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        data: edge.data,
      })),
      stats: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        averageVeracity:
          nodes.reduce((sum, n) => sum + n.data.weight, 0) / nodes.length || 0,
      },
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, `${filename}.json`);
  } catch (error) {
    console.error('JSON export failed:', error);
    throw error;
  }
}

/**
 * Helper: Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper: Get veracity color for SVG
 */
function getVeracityColorForSVG(weight: number): string {
  if (weight >= 1.0) return '#10b981'; // green-500
  if (weight >= 0.7) return '#84cc16'; // lime-500
  if (weight >= 0.4) return '#eab308'; // yellow-500
  if (weight >= 0.1) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

/**
 * Helper: Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Get export format from filename extension
 */
export function getFormatFromFilename(filename: string): ExportFormat | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'png' || ext === 'svg' || ext === 'json') {
    return ext;
  }
  return null;
}

/**
 * Validate export options
 */
export function validateExportOptions(options: ExportOptions): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!['png', 'svg', 'json'].includes(options.format)) {
    errors.push(`Invalid export format: ${options.format}`);
  }

  if (options.quality !== undefined) {
    if (options.quality < 0 || options.quality > 1) {
      errors.push('Quality must be between 0 and 1');
    }
  }

  if (options.scale !== undefined) {
    if (options.scale < 1 || options.scale > 3) {
      errors.push('Scale must be between 1 and 3');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
