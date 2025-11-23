'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, User, Download, Search, Copy, CheckCircle } from 'lucide-react';

/**
 * AudioTranscriptionViewer
 *
 * React component for displaying audio transcription results with:
 * - Full text view with copy functionality
 * - Segmented view with timestamps
 * - Speaker diarization with color coding
 * - Search/filter capabilities
 * - Export options (text, JSON, SRT)
 *
 * Props:
 * - transcription: Full transcription result object
 * - onSegmentClick: Callback when segment is clicked (for audio player sync)
 */

export interface TranscriptionSegment {
  text: string;
  timestamp: number;
  duration: number;
  speaker?: string;
  confidence?: number;
}

export interface Speaker {
  id: string;
  label: string;
  segments: number[];
}

export interface AudioTranscriptionResult {
  success: boolean;
  fullText: string;
  segments: TranscriptionSegment[];
  speakers?: Speaker[];
  language?: string;
  duration?: number;
  processingTime: number;
  error?: string;
}

interface AudioTranscriptionViewerProps {
  transcription: AudioTranscriptionResult;
  onSegmentClick?: (timestamp: number) => void;
}

const SPEAKER_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
];

const formatTimestamp = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const getSpeakerColor = (speakerId: string, speakers?: Speaker[]): string => {
  if (!speakers) return '';
  const index = speakers.findIndex(s => s.id === speakerId);
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
};

export function AudioTranscriptionViewer({
  transcription,
  onSegmentClick
}: AudioTranscriptionViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedText, setCopiedText] = useState(false);

  const handleCopyFullText = async () => {
    await navigator.clipboard.writeText(transcription.fullText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleExportText = () => {
    const blob = new Blob([transcription.fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcription.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(transcription, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcription.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSRT = () => {
    let srtContent = '';
    transcription.segments.forEach((segment, index) => {
      const start = formatTimestamp(segment.timestamp).replace(/:/g, ',');
      const end = formatTimestamp(segment.timestamp + segment.duration).replace(/:/g, ',');
      srtContent += `${index + 1}\n${start} --> ${end}\n${segment.text}\n\n`;
    });

    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcription.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSegments = transcription.segments.filter(segment =>
    segment.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!transcription.success) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Transcription Failed</CardTitle>
          <CardDescription>{transcription.error || 'Unknown error'}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Audio Transcription</CardTitle>
            <CardDescription>
              {transcription.language && (
                <Badge variant="outline" className="mr-2">
                  {transcription.language.toUpperCase()}
                </Badge>
              )}
              {transcription.duration && (
                <span className="text-sm text-muted-foreground">
                  <Clock className="inline w-4 h-4 mr-1" />
                  {formatTimestamp(transcription.duration)}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyFullText}>
              {copiedText ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copiedText ? 'Copied!' : 'Copy'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportText}>
              <Download className="w-4 h-4 mr-2" />
              Text
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportSRT}>
              <Download className="w-4 h-4 mr-2" />
              SRT
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="w-4 h-4 mr-2" />
              JSON
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="segments">
          <TabsList>
            <TabsTrigger value="segments">Segments</TabsTrigger>
            <TabsTrigger value="full">Full Text</TabsTrigger>
            {transcription.speakers && transcription.speakers.length > 0 && (
              <TabsTrigger value="speakers">Speakers</TabsTrigger>
            )}
          </TabsList>

          {/* Segments View */}
          <TabsContent value="segments" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search transcription..."
                className="w-full pl-10 pr-4 py-2 border rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {filteredSegments.map((segment, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => onSegmentClick?.(segment.timestamp)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {formatTimestamp(segment.timestamp)}
                      </Badge>
                      {segment.speaker && (
                        <Badge className={getSpeakerColor(segment.speaker, transcription.speakers)}>
                          <User className="w-3 h-3 mr-1" />
                          {segment.speaker}
                        </Badge>
                      )}
                      {segment.confidence !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {Math.round(segment.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{segment.text}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Full Text View */}
          <TabsContent value="full">
            <ScrollArea className="h-[600px] pr-4">
              <div className="prose dark:prose-invert max-w-none">
                <p className="leading-relaxed whitespace-pre-wrap">{transcription.fullText}</p>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Speakers View */}
          {transcription.speakers && transcription.speakers.length > 0 && (
            <TabsContent value="speakers" className="space-y-4">
              <div className="grid gap-4">
                {transcription.speakers.map((speaker, index) => {
                  const speakerSegments = speaker.segments.map(i => transcription.segments[i]);
                  const totalWords = speakerSegments.reduce(
                    (sum, seg) => sum + seg.text.split(' ').length,
                    0
                  );
                  const totalDuration = speakerSegments.reduce(
                    (sum, seg) => sum + seg.duration,
                    0
                  );

                  return (
                    <Card key={speaker.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Badge className={getSpeakerColor(speaker.id, transcription.speakers)}>
                            <User className="w-4 h-4 mr-2" />
                            {speaker.label}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {speaker.segments.length} segments • {totalWords} words • {formatTimestamp(totalDuration)} speaking time
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-2">
                            {speakerSegments.map((segment, segIndex) => (
                              <div
                                key={segIndex}
                                className="p-3 border rounded-md hover:bg-accent cursor-pointer transition-colors"
                                onClick={() => onSegmentClick?.(segment.timestamp)}
                              >
                                <Badge variant="secondary" className="text-xs mb-2">
                                  {formatTimestamp(segment.timestamp)}
                                </Badge>
                                <p className="text-sm">{segment.text}</p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Metadata Footer */}
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex justify-between">
          <span>{transcription.segments.length} segments</span>
          <span>Processed in {(transcription.processingTime / 1000).toFixed(2)}s</span>
        </div>
      </CardContent>
    </Card>
  );
}
