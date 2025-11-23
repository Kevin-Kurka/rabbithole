/**
 * EvidenceFileResolver - TEMPORARILY DISABLED
 *
 * This resolver has been temporarily disabled during the schema refactor.
 * It queries many dropped tables:
 * - public."EvidenceFiles"
 * - public."Evidence"
 * - public."EvidenceReviews"
 * - public."EvidenceMetadata"
 * - public."Sources"
 * - public."DocumentProcessingResults"
 * - public."DocumentTables", public."DocumentFigures", public."DocumentSections"
 * - public."VideoMetadata", public."VideoFrames", public."VideoScenes"
 *
 * REFACTORING STRATEGY:
 * 1. Store file metadata in node props with type "EvidenceFile"
 * 2. Use FileStorage service directly (works with filesystem/S3)
 * 3. Store extracted text/metadata in node props
 * 4. Video/document processing results as separate nodes linked by edges
 * 5. Reviews as edges with review data in props
 *
 * This refactor is complex and requires product decisions about:
 * - How to represent file attachments in the node-based schema
 * - Whether to keep separate tables for media processing results
 * - How to handle complex queries like video frame search
 *
 * For now, this resolver is disabled to unblock other refactoring work.
 * It can be re-enabled once the architecture is finalized.
 */

import { Resolver } from 'type-graphql';

@Resolver()
export class EvidenceFileResolver {
  // All mutations and queries temporarily disabled
  // See comment above for refactoring strategy
}

// Export empty class to prevent build errors
export default EvidenceFileResolver;
