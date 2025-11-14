import {
  FileText,
  CheckCircle,
  MessageSquare,
  User,
  MapPin,
  Calendar,
  Box,
  HelpCircle,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

/**
 * Node Type Icon Mapping
 * Maps node types to their corresponding Lucide icons
 */

export type NodeType =
  | 'article'
  | 'fact'
  | 'claim'
  | 'person'
  | 'place'
  | 'event'
  | 'thing'
  | 'unknown';

export const nodeTypeIcons: Record<NodeType, LucideIcon> = {
  article: FileText,
  fact: CheckCircle,
  claim: MessageSquare,
  person: User,
  place: MapPin,
  event: Calendar,
  thing: Box,
  unknown: HelpCircle,
};

/**
 * Get the icon component for a given node type
 * @param type - The node type string (case-insensitive)
 * @returns The corresponding Lucide icon component
 */
export function getNodeTypeIcon(type: string): LucideIcon {
  const normalizedType = type.toLowerCase() as NodeType;
  return nodeTypeIcons[normalizedType] || nodeTypeIcons.unknown;
}

/**
 * Get all available node types
 * @returns Array of node type strings
 */
export function getAllNodeTypes(): NodeType[] {
  return Object.keys(nodeTypeIcons) as NodeType[];
}

/**
 * Check if a string is a valid node type
 * @param type - The type string to check
 * @returns True if the type is valid
 */
export function isValidNodeType(type: string): boolean {
  return (Object.keys(nodeTypeIcons) as NodeType[]).includes(type.toLowerCase() as NodeType);
}
