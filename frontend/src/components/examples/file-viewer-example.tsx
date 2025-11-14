"use client"

/**
 * Example usage of the UniversalFileViewer component
 *
 * This file demonstrates how to integrate the file viewer into your application.
 * Place the UniversalFileViewer component at the root of your app (e.g., in layout.tsx)
 * and use the useFileViewer hook to open files from anywhere.
 */

import { Button } from '@/components/ui/button';
import { useFileViewer } from '@/hooks/use-file-viewer';
import { FileIcon, FileImage, FileVideo, FileAudio, FileText } from 'lucide-react';

export function FileViewerExample() {
  const { openFile } = useFileViewer();

  // Example files
  const exampleFiles = [
    {
      id: '1',
      name: 'sample-image.jpg',
      mimeType: 'image/jpeg',
      size: 1024000,
      url: 'https://picsum.photos/1920/1080',
    },
    {
      id: '2',
      name: 'sample-video.mp4',
      mimeType: 'video/mp4',
      size: 5120000,
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    },
    {
      id: '3',
      name: 'sample-document.pdf',
      mimeType: 'application/pdf',
      size: 2048000,
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    },
    {
      id: '4',
      name: 'sample-text.txt',
      mimeType: 'text/plain',
      size: 1024,
      url: 'data:text/plain;base64,VGhpcyBpcyBhIHNhbXBsZSB0ZXh0IGZpbGUuCgpJdCBjb250YWlucyBtdWx0aXBsZSBsaW5lcy4KClRoaXMgaXMgdGhlIHRoaXJkIGxpbmUu',
    },
  ];

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType.startsWith('video/')) return FileVideo;
    if (mimeType.startsWith('audio/')) return FileAudio;
    if (mimeType.startsWith('text/')) return FileText;
    return FileIcon;
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Universal File Viewer</h1>
        <p className="text-muted-foreground">
          Click on any file below to open it in the universal file viewer
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exampleFiles.map((file) => {
          const Icon = getFileIcon(file.mimeType);
          return (
            <Button
              key={file.id}
              variant="outline"
              className="h-auto flex-col items-start p-4 space-y-2"
              onClick={() => openFile(file)}
            >
              <div className="flex items-center gap-2 w-full">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium truncate">{file.name}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {file.mimeType} • {Math.round(file.size / 1024)} KB
              </div>
            </Button>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Integration Instructions</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Add UniversalFileViewer to your root layout (layout.tsx)</li>
          <li>Import useFileViewer hook in any component</li>
          <li>Call openFile with file metadata to display the file</li>
        </ol>
        <pre className="mt-4 p-4 bg-background rounded text-xs overflow-x-auto">
{`import { useFileViewer } from '@/hooks/use-file-viewer';

const { openFile } = useFileViewer();

<Button onClick={() => openFile({
  id: file.id,
  name: file.name,
  mimeType: file.mimeType,
  size: file.size,
  url: file.url
})}>
  View File
</Button>`}
        </pre>
      </div>
    </div>
  );
}
