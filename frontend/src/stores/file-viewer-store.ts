import { create } from 'zustand';

export interface FileViewerFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  nodeId?: string;
  uploadedBy?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

interface FileViewerState {
  isOpen: boolean;
  currentFile: FileViewerFile | null;
  openFile: (file: FileViewerFile) => void;
  closeFile: () => void;
}

export const useFileViewerStore = create<FileViewerState>((set) => ({
  isOpen: false,
  currentFile: null,
  openFile: (file: FileViewerFile) => set({ isOpen: true, currentFile: file }),
  closeFile: () => set({ isOpen: false, currentFile: null }),
}));
