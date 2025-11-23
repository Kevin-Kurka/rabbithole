'use client';

import { use, useEffect, useState } from 'react';
import { useQuery, useSubscription, gql } from '@apollo/client';
import { AudioTranscriptionViewer, AudioTranscriptionResult } from '@/components/media/audio-transcription-viewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/base/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/base/progress';

const GET_JOB_STATUS = gql`
  query GetMediaProcessingJob($jobId: String!) {
    mediaProcessingJob(jobId: $jobId) {
      jobId
      fileId
      status
      progress
      error
      result
    }
  }
`;

const JOB_UPDATES_SUBSCRIPTION = gql`
  subscription OnJobUpdate($jobId: String!) {
    mediaProcessingJobUpdates(jobId: $jobId) {
      jobId
      fileId
      status
      progress
      error
      result
    }
  }
`;

export default function AudioTranscriptionPage({ params }: { params: Promise<{ jobId: string }> }) {
  const resolvedParams = use(params);
  const [transcription, setTranscription] = useState<AudioTranscriptionResult | null>(null);

  const { data, loading, error } = useQuery(GET_JOB_STATUS, {
    variables: { jobId: resolvedParams.jobId },
    pollInterval: 5000, // Poll every 5 seconds as fallback
  });

  // Subscribe to real-time updates
  const { data: subscriptionData } = useSubscription(JOB_UPDATES_SUBSCRIPTION, {
    variables: { jobId: resolvedParams.jobId },
  });

  // Use subscription data if available, otherwise use query data
  const jobData = subscriptionData?.mediaProcessingJobUpdates || data?.mediaProcessingJob;

  useEffect(() => {
    if (jobData?.status === 'completed' && jobData?.result) {
      try {
        const result = typeof jobData.result === 'string'
          ? JSON.parse(jobData.result)
          : jobData.result;
        setTranscription(result);
      } catch (err) {
        console.error('Failed to parse transcription result:', err);
      }
    }
  }, [jobData]);

  if (loading && !jobData) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading job status...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Error Loading Job
            </CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (jobData?.status === 'failed') {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Transcription Failed
            </CardTitle>
            <CardDescription>{jobData.error || 'Unknown error occurred'}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (jobData?.status === 'queued' || jobData?.status === 'processing') {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Processing Audio</CardTitle>
            <CardDescription>
              Job ID: {resolvedParams.jobId}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm">
                {jobData.status === 'queued' ? 'Waiting in queue...' : 'Transcribing audio...'}
              </span>
            </div>
            {jobData.progress !== undefined && jobData.progress > 0 && (
              <div className="space-y-2">
                <Progress value={jobData.progress} />
                <p className="text-xs text-muted-foreground text-right">{jobData.progress}%</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!transcription) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <span className="text-muted-foreground">No transcription data available</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Audio Transcription</h1>
        <p className="text-sm text-muted-foreground mt-1">Job ID: {resolvedParams.jobId}</p>
      </div>
      <AudioTranscriptionViewer transcription={transcription} />
    </div>
  );
}
