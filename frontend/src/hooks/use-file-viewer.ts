import { useFileViewerStore, FileViewerFile } from '@/stores/file-viewer-store';
import { useCallback } from 'react';

/**
 * Hook to interact with the universal file viewer
 *
 * Usage:
 * ```tsx
 * const { openFile } = useFileViewer();
 *
 * <Button onClick={() => openFile({
 *   id: file.id,
 *   name: file.name,
 *   mimeType: file.mimeType,
 *   size: file.size,
 *   url: file.url
 * })}>
 *   View File
 * </Button>
 * ```
 */
export function useFileViewer() {
  const { openFile: storeOpenFile, closeFile } = useFileViewerStore();

  const openFile = useCallback((file: FileViewerFile) => {
    storeOpenFile(file);
  }, [storeOpenFile]);

  const openFileById = useCallback(async (fileId: string) => {
    // This would typically fetch file metadata from GraphQL
    // For now, it's a placeholder for future implementation
    console.warn('openFileById not yet implemented. Use openFile with full file data instead.');
  }, []);

  return {
    openFile,
    openFileById,
    closeFile,
  };
}
