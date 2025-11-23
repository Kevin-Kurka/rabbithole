'use client';

import { use, useEffect, useState } from 'react';
import { useQuery, useSubscription, gql } from '@apollo/client';
import { VideoAnalysisViewer, VideoAnalysisResult } from '@/components/media/video-analysis-viewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

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

export default function VideoAnalysisPage({ params }: { params: Promise<{ jobId: string }> }) {
  const resolvedParams = use(params);
  const [analysis, setAnalysis] = useState<VideoAnalysisResult | null>(null);

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
        setAnalysis(result);
      } catch (err) {
        console.error('Failed to parse analysis result:', err);
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
              Analysis Failed
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
            <CardTitle>Analyzing Video</CardTitle>
            <CardDescription>
              Job ID: {resolvedParams.jobId}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm">
                {jobData.status === 'queued' ? 'Waiting in queue...' : 'Analyzing video...'}
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

  if (!analysis) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <span className="text-muted-foreground">No analysis data available</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Video Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">Job ID: {resolvedParams.jobId}</p>
      </div>
      <VideoAnalysisViewer analysis={analysis} />
    </div>
  );
}
