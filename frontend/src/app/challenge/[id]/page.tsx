"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { SEARCH_NODES } from '@/graphql/queries/activity';
import { ArrowLeft, ThumbsUp, ThumbsDown, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface EvidenceItem {
  id: string;
  title: string;
  body: string;
  sourceType: string;
  credibilityScore: number;
  relevanceScore: number;
  type: 'SUPPORTS' | 'REFUTES';
}

export default function ChallengePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [votedFor, setVotedFor] = useState(false);
  const [votedAgainst, setVotedAgainst] = useState(false);

  // Query to fetch the challenge node (using searchNodes with ID)
  const { data, loading, error } = useQuery(SEARCH_NODES, {
    variables: { query: id, limit: 1 },
  });

  // Mock challenge data - in production would come from GraphQL
  const challenge = {
    id,
    claimText: 'The single bullet theory accurately explains all non-fatal wounds in the Kennedy assassination.',
    rationale: 'Physical analysis of the Zapruder film, ballistic testing, and medical evidence suggest the single bullet trajectory is physically possible.',
    initialCredibilityScore: 45,
    supportingEvidence: [
      {
        id: 'ev-1',
        title: 'Zapruder Film Frame Analysis',
        body: 'Frame-by-frame analysis shows alignment consistent with proposed trajectory.',
        sourceType: 'Video Analysis',
        credibilityScore: 78,
        relevanceScore: 92,
        type: 'SUPPORTS',
      },
      {
        id: 'ev-2',
        title: 'Ballistic Testing Results',
        body: 'Modern ballistic tests show bullet deformation patterns consistent with the theory.',
        sourceType: 'Scientific Study',
        credibilityScore: 85,
        relevanceScore: 88,
        type: 'SUPPORTS',
      },
    ] as EvidenceItem[],
    refutingEvidence: [
      {
        id: 'ev-3',
        title: 'Acoustic Evidence Contradictions',
        body: 'Acoustic evidence suggests a fourth shot, incompatible with single bullet trajectory.',
        sourceType: 'Research Report',
        credibilityScore: 62,
        relevanceScore: 85,
        type: 'REFUTES',
      },
      {
        id: 'ev-4',
        title: 'Witness Testimony Discrepancies',
        body: 'Multiple witnesses reported shooting patterns inconsistent with single bullet theory.',
        sourceType: 'Historical Documentation',
        credibilityScore: 70,
        relevanceScore: 80,
        type: 'REFUTES',
      },
    ] as EvidenceItem[],
    aiAnalysis: {
      summary: 'The single bullet theory remains highly contested despite technical analyses.',
      keyPoints: [
        'Physical trajectory analysis is inconclusive',
        'Witness accounts vary significantly',
        'Medical evidence supports multiple interpretations',
        'Modern ballistic tests show mixed results',
      ],
      conclusion: 'Further investigation needed with modern forensic techniques.',
    },
  };

  const handleVoteFor = () => {
    setVotedFor(!votedFor);
    if (votedAgainst) setVotedAgainst(false);
  };

  const handleVoteAgainst = () => {
    setVotedAgainst(!votedAgainst);
    if (votedFor) setVotedFor(false);
  };

  const EvidenceCard = ({ evidence }: { evidence: EvidenceItem }) => (
    <Card className={`${evidence.type === 'SUPPORTS' ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-base">{evidence.title}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {evidence.sourceType}
              </Badge>
              {evidence.type === 'SUPPORTS' ? (
                <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Supporting
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Refuting
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{evidence.body}</p>
        <div className="flex gap-4 pt-2">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Credibility</div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${evidence.credibilityScore >= 70 ? 'bg-green-500' : evidence.credibilityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${evidence.credibilityScore}%` }}
                />
              </div>
              <span className="text-sm font-medium">{evidence.credibilityScore}%</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Relevance</div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${evidence.relevanceScore}%` }}
                />
              </div>
              <span className="text-sm font-medium">{evidence.relevanceScore}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold">Challenge</h1>
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Contested Claim
              </Badge>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Credibility: {challenge.initialCredibilityScore}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Challenge Statement */}
            <Card>
              <CardHeader>
                <CardTitle>Claim Under Challenge</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-accent rounded-lg border border-border">
                  <p className="text-lg font-medium">{challenge.claimText}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Rationale</h4>
                  <p className="text-muted-foreground">{challenge.rationale}</p>
                </div>
              </CardContent>
            </Card>

            {/* Evidence Tabs */}
            <Tabs defaultValue="supporting" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="supporting">
                  Supporting ({challenge.supportingEvidence.length})
                </TabsTrigger>
                <TabsTrigger value="refuting">
                  Refuting ({challenge.refutingEvidence.length})
                </TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="supporting" className="space-y-4 mt-4">
                {challenge.supportingEvidence.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No supporting evidence yet
                  </p>
                ) : (
                  challenge.supportingEvidence.map((evidence) => (
                    <EvidenceCard key={evidence.id} evidence={evidence} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="refuting" className="space-y-4 mt-4">
                {challenge.refutingEvidence.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No refuting evidence yet
                  </p>
                ) : (
                  challenge.refutingEvidence.map((evidence) => (
                    <EvidenceCard key={evidence.id} evidence={evidence} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="analysis" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Summary</h4>
                      <p className="text-muted-foreground">
                        {challenge.aiAnalysis.summary}
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3">Key Points</h4>
                      <ul className="space-y-2">
                        {challenge.aiAnalysis.keyPoints.map((point, idx) => (
                          <li key={idx} className="flex gap-3">
                            <span className="text-primary flex-shrink-0">•</span>
                            <span className="text-muted-foreground">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Conclusion</h4>
                      <p className="text-muted-foreground">
                        {challenge.aiAnalysis.conclusion}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Vote Widget */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleVoteFor}
                  variant={votedFor ? 'default' : 'outline'}
                  className="w-full gap-2"
                >
                  <ThumbsUp className="w-4 h-4" />
                  {votedFor ? 'Voted Supporting' : 'Support Challenge'}
                </Button>
                <Button
                  onClick={handleVoteAgainst}
                  variant={votedAgainst ? 'default' : 'outline'}
                  className="w-full gap-2"
                >
                  <ThumbsDown className="w-4 h-4" />
                  {votedAgainst ? 'Voted Against' : 'Oppose Challenge'}
                </Button>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Community Consensus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Supporting</span>
                    <span className="text-sm font-medium">64%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: '64%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Opposing</span>
                    <span className="text-sm font-medium">36%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: '36%' }} />
                  </div>
                </div>
                <Separator />
                <div className="text-sm text-muted-foreground">
                  Based on 342 community votes
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
