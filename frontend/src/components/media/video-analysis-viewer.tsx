'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/base/card';
import { Badge } from '@/components/base/badge';
import { Button } from '@/components/base/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/base/tabs';
import { ScrollArea } from '@/components/base/scroll-area';
import { Progress } from '@/components/base/progress';
import {
  Clock,
  Image as ImageIcon,
  Video,
  Download,
  Eye,
  Film,
  Grid3x3,
  BarChart3
} from 'lucide-react';

/**
 * VideoAnalysisViewer
 *
 * React component for displaying video analysis results with:
 * - Video metadata (duration, resolution, codec, bitrate)
 * - Frame thumbnails with timestamps
 * - Object detection results with class breakdown
 * - Scene detection visualization
 * - Export capabilities
 *
 * Props:
 * - analysis: Full video analysis result object
 * - onFrameClick: Callback when frame thumbnail is clicked (for video player sync)
 */

export interface ExtractedFrame {
  index: number;
  timestamp: number;
  path: string;
  width: number;
  height: number;
  fileSize: number;
  isKeyframe?: boolean;
  sceneScore?: number;
}

export interface VideoObjectDetectionSummary {
  totalObjects: number;
  totalFrames: number;
  avgObjectsPerFrame: number;
  allClasses: string[];
}

export interface VideoAnalysisResult {
  success: boolean;
  duration?: number;
  frameRate?: number;
  width?: number;
  height?: number;
  codec?: string;
  bitrate?: number;
  frames?: ExtractedFrame[];
  detectedObjects?: VideoObjectDetectionSummary;
  thumbnail?: string;
  audioTrack?: boolean;
  processingTime: number;
  error?: string;
}

interface VideoAnalysisViewerProps {
  analysis: VideoAnalysisResult;
  onFrameClick?: (timestamp: number) => void;
}

const formatTimestamp = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatBitrate = (bps: number): string => {
  if (bps < 1000) return `${bps} bps`;
  if (bps < 1000000) return `${(bps / 1000).toFixed(1)} kbps`;
  return `${(bps / 1000000).toFixed(1)} Mbps`;
};

export function VideoAnalysisViewer({
  analysis,
  onFrameClick
}: VideoAnalysisViewerProps) {
  const [selectedFrame, setSelectedFrame] = useState<ExtractedFrame | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'video-analysis.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFrameClick = (frame: ExtractedFrame) => {
    setSelectedFrame(frame);
    onFrameClick?.(frame.timestamp);
  };

  if (!analysis.success) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Video Analysis Failed</CardTitle>
          <CardDescription>{analysis.error || 'Unknown error'}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Video Analysis</CardTitle>
            <CardDescription className="flex items-center gap-4 mt-2">
              {analysis.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatTimestamp(analysis.duration)}
                </span>
              )}
              {analysis.width && analysis.height && (
                <span className="flex items-center gap-1">
                  <Video className="w-4 h-4" />
                  {analysis.width}x{analysis.height}
                </span>
              )}
              {analysis.codec && (
                <Badge variant="outline">{analysis.codec.toUpperCase()}</Badge>
              )}
              {analysis.audioTrack !== undefined && (
                <Badge variant={analysis.audioTrack ? 'default' : 'secondary'}>
                  {analysis.audioTrack ? 'Audio' : 'No Audio'}
                </Badge>
              )}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="metadata">
          <TabsList>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            {analysis.frames && analysis.frames.length > 0 && (
              <TabsTrigger value="frames">
                Frames ({analysis.frames.length})
              </TabsTrigger>
            )}
            {analysis.detectedObjects && (
              <TabsTrigger value="objects">
                Objects ({analysis.detectedObjects.totalObjects})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Metadata View */}
          <TabsContent value="metadata" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Video Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {analysis.duration !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{formatTimestamp(analysis.duration)}</span>
                    </div>
                  )}
                  {analysis.frameRate !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frame Rate</span>
                      <span className="font-medium">{analysis.frameRate.toFixed(2)} fps</span>
                    </div>
                  )}
                  {analysis.width && analysis.height && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Resolution</span>
                      <span className="font-medium">{analysis.width}x{analysis.height}</span>
                    </div>
                  )}
                  {analysis.codec && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Codec</span>
                      <span className="font-medium">{analysis.codec.toUpperCase()}</span>
                    </div>
                  )}
                  {analysis.bitrate !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bitrate</span>
                      <span className="font-medium">{formatBitrate(analysis.bitrate)}</span>
                    </div>
                  )}
                  {analysis.audioTrack !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Audio Track</span>
                      <span className="font-medium">{analysis.audioTrack ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Processing Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processing Time</span>
                    <span className="font-medium">{(analysis.processingTime / 1000).toFixed(2)}s</span>
                  </div>
                  {analysis.frames && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Extracted Frames</span>
                      <span className="font-medium">{analysis.frames.length}</span>
                    </div>
                  )}
                  {analysis.detectedObjects && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Detected Objects</span>
                        <span className="font-medium">{analysis.detectedObjects.totalObjects}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Unique Classes</span>
                        <span className="font-medium">{analysis.detectedObjects.allClasses.length}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Thumbnail Preview */}
            {analysis.thumbnail && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Thumbnail</CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={analysis.thumbnail}
                    alt="Video thumbnail"
                    className="w-full rounded-lg border"
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Frames View */}
          {analysis.frames && analysis.frames.length > 0 && (
            <TabsContent value="frames" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {analysis.frames.length} frames extracted
                </p>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <Film className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[600px]">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-3 gap-4">
                    {analysis.frames.map((frame) => (
                      <Card
                        key={frame.index}
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => handleFrameClick(frame)}
                      >
                        <CardContent className="p-3">
                          <div className="aspect-video bg-muted rounded-md flex items-center justify-center mb-2">
                            <ImageIcon className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary">{formatTimestamp(frame.timestamp)}</Badge>
                              {frame.isKeyframe && (
                                <Badge variant="default">Keyframe</Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground">
                              Frame {frame.index + 1} • {formatFileSize(frame.fileSize)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {analysis.frames.map((frame) => (
                      <Card
                        key={frame.index}
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => handleFrameClick(frame)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-32 h-20 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{formatTimestamp(frame.timestamp)}</Badge>
                                {frame.isKeyframe && <Badge variant="default">Keyframe</Badge>}
                                {frame.sceneScore !== undefined && (
                                  <Badge variant="outline">Scene: {frame.sceneScore.toFixed(2)}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Frame {frame.index + 1} • {frame.width}x{frame.height} • {formatFileSize(frame.fileSize)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          )}

          {/* Objects View */}
          {analysis.detectedObjects && (
            <TabsContent value="objects" className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold">{analysis.detectedObjects.totalObjects}</p>
                      <p className="text-sm text-muted-foreground">Total Objects</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold">{analysis.detectedObjects.allClasses.length}</p>
                      <p className="text-sm text-muted-foreground">Unique Classes</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold">
                        {analysis.detectedObjects.avgObjectsPerFrame.toFixed(1)}
                      </p>
                      <p className="text-sm text-muted-foreground">Avg per Frame</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Detected Object Classes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="flex flex-wrap gap-2">
                      {analysis.detectedObjects.allClasses.sort().map((className) => (
                        <Badge key={className} variant="secondary">
                          {className}
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
