'use client';

import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/base/card';
import { Button } from '@/components/base/button';
import { Input } from '@/components/base/input';
import { Label } from '@/components/base/label';
import { Switch } from '@/components/base/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/base/tabs';
import { Alert, AlertDescription } from '@/components/base/alert';
import { FileDropZone } from '@/components/media/file-drop-zone';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

const UPLOAD_AUDIO_MUTATION = gql`
  mutation UploadAudio($file: Upload!, $options: AudioTranscriptionOptions) {
    uploadAndTranscribeAudio(file: $file, options: $options) {
      jobId
      fileId
      status
    }
  }
`;

const UPLOAD_VIDEO_MUTATION = gql`
  mutation UploadVideo($file: Upload!, $options: VideoAnalysisOptions) {
    uploadAndAnalyzeVideo(file: $file, options: $options) {
      jobId
      fileId
      status
    }
  }
`;

export default function MediaUploadPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Audio options
  const [audioLanguage, setAudioLanguage] = useState('en');
  const [speakerDiarization, setSpeakerDiarization] = useState(false);

  // Video options
  const [extractFrames, setExtractFrames] = useState(true);
  const [frameRate, setFrameRate] = useState(1);
  const [maxFrames, setMaxFrames] = useState(300);
  const [detectScenes, setDetectScenes] = useState(true);
  const [detectObjects, setDetectObjects] = useState(true);
  const [generateThumbnail, setGenerateThumbnail] = useState(true);

  const [uploadAudio, { loading: audioLoading }] = useMutation(UPLOAD_AUDIO_MUTATION);
  const [uploadVideo, { loading: videoLoading }] = useMutation(UPLOAD_VIDEO_MUTATION);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadStatus('idle');
    setJobId(null);
    setErrorMessage('');
  };

  const handleAudioUpload = async () => {
    if (!selectedFile) return;

    setUploadStatus('uploading');
    setErrorMessage('');

    try {
      const { data } = await uploadAudio({
        variables: {
          file: selectedFile,
          options: {
            language: audioLanguage,
            speakerDiarization,
          },
        },
      });

      setJobId(data.uploadAndTranscribeAudio.jobId);
      setUploadStatus('success');

      // Navigate to job page after 2 seconds
      setTimeout(() => {
        router.push(`/media/audio/${data.uploadAndTranscribeAudio.jobId}`);
      }, 2000);
    } catch (error: any) {
      console.error('Audio upload failed:', error);
      setErrorMessage(error.message || 'Upload failed');
      setUploadStatus('error');
    }
  };

  const handleVideoUpload = async () => {
    if (!selectedFile) return;

    setUploadStatus('uploading');
    setErrorMessage('');

    try {
      const { data } = await uploadVideo({
        variables: {
          file: selectedFile,
          options: {
            extractFrames,
            frameRate,
            maxFrames,
            detectScenes,
            detectObjects,
            generateThumbnail,
          },
        },
      });

      setJobId(data.uploadAndAnalyzeVideo.jobId);
      setUploadStatus('success');

      // Navigate to job page after 2 seconds
      setTimeout(() => {
        router.push(`/media/video/${data.uploadAndAnalyzeVideo.jobId}`);
      }, 2000);
    } catch (error: any) {
      console.error('Video upload failed:', error);
      setErrorMessage(error.message || 'Upload failed');
      setUploadStatus('error');
    }
  };

  const isAudioFile = selectedFile?.type.startsWith('audio/');
  const isVideoFile = selectedFile?.type.startsWith('video/');

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Media Upload</h1>
        <p className="text-muted-foreground mt-1">
          Upload audio or video files for processing
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select File</CardTitle>
          <CardDescription>
            Supported formats: MP3, WAV, M4A, FLAC, OGG (audio) | MP4, MOV, AVI, WebM (video)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileDropZone
            onFileSelect={handleFileSelect}
            accept={{
              'audio/*': ['.mp3', '.wav', '.m4a', '.flac', '.ogg'],
              'video/*': ['.mp4', '.mov', '.avi', '.webm'],
            }}
            maxSize={100 * 1024 * 1024} // 100MB
          />

          {selectedFile && (
            <>
              <Alert>
                <AlertDescription>
                  Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </AlertDescription>
              </Alert>

              <Tabs defaultValue={isAudioFile ? 'audio' : 'video'}>
                <TabsList className="w-full">
                  <TabsTrigger value="audio" disabled={!isAudioFile} className="flex-1">
                    Audio Options
                  </TabsTrigger>
                  <TabsTrigger value="video" disabled={!isVideoFile} className="flex-1">
                    Video Options
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="audio" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Input
                      id="language"
                      value={audioLanguage}
                      onChange={(e) => setAudioLanguage(e.target.value)}
                      placeholder="en"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="speaker-diarization"
                      checked={speakerDiarization}
                      onCheckedChange={setSpeakerDiarization}
                    />
                    <Label htmlFor="speaker-diarization">Enable speaker diarization (requires AssemblyAI)</Label>
                  </div>

                  <Button
                    onClick={handleAudioUpload}
                    disabled={audioLoading || uploadStatus === 'uploading' || uploadStatus === 'success'}
                    className="w-full"
                  >
                    {uploadStatus === 'uploading' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {uploadStatus === 'success' && <CheckCircle2 className="w-4 h-4 mr-2" />}
                    {uploadStatus === 'idle' && <Upload className="w-4 h-4 mr-2" />}
                    {uploadStatus === 'uploading' ? 'Uploading...' : uploadStatus === 'success' ? 'Upload Complete!' : 'Upload & Transcribe'}
                  </Button>
                </TabsContent>

                <TabsContent value="video" className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="extract-frames"
                      checked={extractFrames}
                      onCheckedChange={setExtractFrames}
                    />
                    <Label htmlFor="extract-frames">Extract frames</Label>
                  </div>

                  {extractFrames && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="frame-rate">Frame rate (fps)</Label>
                        <Input
                          id="frame-rate"
                          type="number"
                          value={frameRate}
                          onChange={(e) => setFrameRate(Number(e.target.value))}
                          min={0.1}
                          max={60}
                          step={0.1}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max-frames">Maximum frames</Label>
                        <Input
                          id="max-frames"
                          type="number"
                          value={maxFrames}
                          onChange={(e) => setMaxFrames(Number(e.target.value))}
                          min={1}
                          max={1000}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="detect-scenes"
                          checked={detectScenes}
                          onCheckedChange={setDetectScenes}
                        />
                        <Label htmlFor="detect-scenes">Detect scene changes</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="detect-objects"
                          checked={detectObjects}
                          onCheckedChange={setDetectObjects}
                        />
                        <Label htmlFor="detect-objects">Detect objects (TensorFlow.js)</Label>
                      </div>
                    </>
                  )}

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="generate-thumbnail"
                      checked={generateThumbnail}
                      onCheckedChange={setGenerateThumbnail}
                    />
                    <Label htmlFor="generate-thumbnail">Generate thumbnail</Label>
                  </div>

                  <Button
                    onClick={handleVideoUpload}
                    disabled={videoLoading || uploadStatus === 'uploading' || uploadStatus === 'success'}
                    className="w-full"
                  >
                    {uploadStatus === 'uploading' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {uploadStatus === 'success' && <CheckCircle2 className="w-4 h-4 mr-2" />}
                    {uploadStatus === 'idle' && <Upload className="w-4 h-4 mr-2" />}
                    {uploadStatus === 'uploading' ? 'Uploading...' : uploadStatus === 'success' ? 'Upload Complete!' : 'Upload & Analyze'}
                  </Button>
                </TabsContent>
              </Tabs>

              {uploadStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {uploadStatus === 'success' && jobId && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Upload successful! Redirecting to job page...
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
