'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { VotingSection } from './voting-section';
import type { FormalInquiry } from '@/graphql/queries/formal-inquiries';
import { formatDistanceToNow } from 'date-fns';

interface FormalInquiryCardProps {
  inquiry: FormalInquiry;
  onVoteChange?: () => void;
}

export function FormalInquiryCard({ inquiry, onVoteChange }: FormalInquiryCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'evaluating':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'evaluated':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'resolved':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'withdrawn':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getConfidenceColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 0.8) return 'text-green-600 dark:text-green-400';
    if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 0.4) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const hasBeenEvaluated = inquiry.status === 'evaluated' || inquiry.status === 'resolved';

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-xl">{inquiry.title}</CardTitle>
            {inquiry.description && (
              <CardDescription className="text-sm">{inquiry.description}</CardDescription>
            )}
          </div>
          <Badge className={getStatusColor(inquiry.status)}>
            {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground pt-2">
          Created {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Inquiry Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-sm whitespace-pre-wrap">{inquiry.content}</p>
        </div>

        {/* EVIDENCE-BASED CREDIBILITY SECTION */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold">Evidence-Based Confidence Score</h3>
            <Badge variant="outline" className="ml-auto text-xs">
              AI-Judged
            </Badge>
          </div>

          {hasBeenEvaluated ? (
            <>
              {/* Confidence Score Display */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Confidence Score</span>
                  <span className={`text-2xl font-bold ${getConfidenceColor(inquiry.confidence_score)}`}>
                    {inquiry.confidence_score?.toFixed(2) ?? 'N/A'}
                  </span>
                </div>

                {/* Confidence Score Bar */}
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      (inquiry.confidence_score ?? 0) >= 0.8
                        ? 'bg-green-500'
                        : (inquiry.confidence_score ?? 0) >= 0.6
                        ? 'bg-yellow-500'
                        : (inquiry.confidence_score ?? 0) >= 0.4
                        ? 'bg-orange-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${(inquiry.confidence_score ?? 0) * 100}%` }}
                  />
                </div>

                {/* Ceiling Warning */}
                {inquiry.max_allowed_score && inquiry.confidence_score &&
                 inquiry.max_allowed_score < 1.0 && (
                  <div className="flex items-start gap-2 mt-3 pt-3 border-t border-blue-300 dark:border-blue-800">
                    <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-900 dark:text-blue-100">
                      <p className="font-medium">Score Capped by Weakest Link Rule</p>
                      <p className="text-blue-700 dark:text-blue-300 mt-1">
                        Maximum allowed: {inquiry.max_allowed_score.toFixed(2)} (based on weakest related node: {inquiry.weakest_node_credibility?.toFixed(2)})
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Determination */}
              {inquiry.ai_determination && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">AI Determination</h4>
                  <p className="text-sm text-muted-foreground">{inquiry.ai_determination}</p>
                </div>
              )}

              {/* AI Rationale */}
              {inquiry.ai_rationale && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Rationale</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {inquiry.ai_rationale}
                  </p>
                </div>
              )}

              {inquiry.evaluated_at && (
                <p className="text-xs text-muted-foreground">
                  Evaluated {formatDistanceToNow(new Date(inquiry.evaluated_at), { addSuffix: true })}
                </p>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm text-muted-foreground">
                ⏳ This inquiry is awaiting AI evaluation. The confidence score will be determined based
                on evidence quality and logical reasoning.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950">
            <p className="text-xs text-yellow-900 dark:text-yellow-100">
              <strong>⚠️ Important:</strong> This score is determined by AI evaluation of evidence quality.
              It is NOT influenced by votes or popular opinion.
            </p>
          </div>
        </div>

        <Separator />

        {/* COMMUNITY OPINION SECTION (VOTING) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold">Community Opinion</h3>
            <Badge variant="outline" className="ml-auto text-xs">
              Not Evidence-Based
            </Badge>
          </div>

          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950">
            <p className="text-xs text-orange-900 dark:text-orange-100">
              <strong>⚠️ Note:</strong> Votes show community agreement, NOT evidence quality.
              Vote counts do NOT affect confidence scores.
            </p>
          </div>

          <VotingSection inquiry={inquiry} onVoteChange={onVoteChange} />
        </div>
      </CardContent>
    </Card>
  );
}
