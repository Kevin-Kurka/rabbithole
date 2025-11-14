"use client";

import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Search,
  Filter,
  Grid,
  List,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  Film,
  FileArchive,
  Calendar,
  HardDrive,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

// Placeholder query - adjust based on actual schema
const GET_ALL_EVIDENCE_FILES = `
  query GetAllEvidenceFiles {
    getAllEvidence {
      id
      target_node_id
      evidence_type
      is_verified
      created_at
      files: getEvidenceFiles(evidenceId: id) {
        id
        file_type
        is_primary
        file_size
        mime_type
        original_filename
        file_extension
        has_preview
        thumbnail_storage_key
        created_at
        uploaded_by
        download_count
      }
    }
  }
`;

interface EvidenceFile {
  id: string;
  file_type: string;
  is_primary: boolean;
  file_size: number;
  mime_type: string;
  original_filename: string;
  file_extension: string;
  has_preview: boolean;
  thumbnail_storage_key?: string;
  created_at: Date;
  uploaded_by: string;
  download_count: number;
}

interface Evidence {
  id: string;
  target_node_id?: string;
  evidence_type: string;
  is_verified: boolean;
  created_at: Date;
  files: EvidenceFile[];
}

const getFileIcon = (mimeType: string, size = 'w-8 h-8') => {
  if (mimeType.startsWith('image/')) return <ImageIcon className={size} />;
  if (mimeType.startsWith('video/')) return <Film className={size} />;
  if (mimeType === 'application/pdf') return <FileText className={size} />;
  if (mimeType.includes('zip') || mimeType.includes('archive')) return <FileArchive className={size} />;
  return <FileText className={size} />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export default function EvidenceFilesPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedFile, setSelectedFile] = useState<EvidenceFile | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Mock data for now - replace with actual GraphQL query
  const mockFiles: EvidenceFile[] = [
    {
      id: '1',
      file_type: 'image',
      is_primary: true,
      file_size: 2458000,
      mime_type: 'image/jpeg',
      original_filename: 'zapruder_frame_313.jpg',
      file_extension: 'jpg',
      has_preview: true,
      created_at: new Date('2024-01-15'),
      uploaded_by: 'user123',
      download_count: 45,
    },
    {
      id: '2',
      file_type: 'document',
      is_primary: false,
      file_size: 15680000,
      mime_type: 'application/pdf',
      original_filename: 'warren_commission_report.pdf',
      file_extension: 'pdf',
      has_preview: true,
      created_at: new Date('2024-01-14'),
      uploaded_by: 'user456',
      download_count: 123,
    },
    {
      id: '3',
      file_type: 'video',
      is_primary: false,
      file_size: 45680000,
      mime_type: 'video/mp4',
      original_filename: 'dealey_plaza_footage.mp4',
      file_extension: 'mp4',
      has_preview: true,
      created_at: new Date('2024-01-13'),
      uploaded_by: 'user789',
      download_count: 89,
    },
  ];

  // Filter files
  const filteredFiles = mockFiles.filter((file) => {
    const matchesSearch = file.original_filename
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || file.file_type === filterType;
    return matchesSearch && matchesType;
  });

  // Calculate statistics
  const totalSize = mockFiles.reduce((acc, file) => acc + file.file_size, 0);
  const totalDownloads = mockFiles.reduce((acc, file) => acc + file.download_count, 0);

  const handleFileClick = (file: EvidenceFile) => {
    setSelectedFile(file);
    setDetailsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Evidence Files</h1>
              <p className="text-muted-foreground mt-1">
                Manage uploaded evidence files and attachments
              </p>
            </div>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{mockFiles.length}</p>
                    <p className="text-xs text-muted-foreground">Total Files</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{formatFileSize(totalSize)}</p>
                    <p className="text-xs text-muted-foreground">Storage Used</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Download className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{totalDownloads}</p>
                    <p className="text-xs text-muted-foreground">Total Downloads</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">
                      {mockFiles.filter(f => f.file_type === 'image').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Images</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Filters and Search */}
        <div className="flex items-center gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter by Type */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="archive">Archives</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Files Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <Card
                key={file.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleFileClick(file)}
              >
                <CardContent className="p-4">
                  {/* File Preview/Icon */}
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center mb-3">
                    {getFileIcon(file.mime_type, 'w-12 h-12')}
                  </div>

                  {/* File Info */}
                  <h3 className="font-medium text-sm truncate mb-1">
                    {file.original_filename}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>{file.file_extension.toUpperCase()}</span>
                  </div>

                  {/* Badges */}
                  <div className="flex gap-1 mt-2">
                    {file.is_primary && (
                      <Badge variant="secondary" className="text-xs">
                        Primary
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {file.download_count} downloads
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFiles.map((file) => (
              <Card
                key={file.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleFileClick(file)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                      {getFileIcon(file.mime_type, 'w-6 h-6')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">
                        {file.original_filename}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>{file.file_extension.toUpperCase()}</span>
                        <span>{format(new Date(file.created_at), 'MMM d, yyyy')}</span>
                        <span>{file.download_count} downloads</span>
                      </div>
                    </div>
                    {file.is_primary && (
                      <Badge variant="secondary">Primary</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredFiles.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No files found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload your first evidence file to get started'}
            </p>
          </div>
        )}
      </main>

      {/* File Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>File Details</DialogTitle>
            <DialogDescription>
              View and manage file information
            </DialogDescription>
          </DialogHeader>

          {selectedFile && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                {getFileIcon(selectedFile.mime_type, 'w-16 h-16')}
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Filename</p>
                  <p className="font-medium break-all">{selectedFile.original_filename}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">File Type</p>
                  <p className="font-medium">{selectedFile.file_extension.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Size</p>
                  <p className="font-medium">{formatFileSize(selectedFile.file_size)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Uploaded</p>
                  <p className="font-medium">
                    {format(new Date(selectedFile.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Downloads</p>
                  <p className="font-medium">{selectedFile.download_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Status</p>
                  <Badge variant={selectedFile.is_primary ? 'default' : 'secondary'}>
                    {selectedFile.is_primary ? 'Primary' : 'Secondary'}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" className="flex-1">
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Button>
                <Button variant="destructive" size="icon">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
