"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { SEARCH_NODES } from '@/graphql/queries/activity';
import { ArrowLeft, FileText, Link2, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { renderMarkdown } from '@/lib/markdown';
import DOMPurify from 'isomorphic-dompurify';

interface ConnectedNode {
  id: string;
  title: string;
  type: string;
  credibility: number;
  summary?: string;
}

export default function TheoryPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  // Query to fetch the theory node
  const { data, loading, error } = useQuery(SEARCH_NODES, {
    variables: { query: id, limit: 1 },
  });

  // Mock theory data - in production would come from GraphQL
  const theory = {
    id,
    title: 'JFK Assassination Conspiracy: Multiple Shooters Theory',
    summary: 'This theory proposes that President Kennedy was assassinated by multiple shooters from different locations, contradicting the official single-shooter narrative.',
    body: `# Multiple Shooters Theory

## Overview
This comprehensive theory examines evidence suggesting that President John F. Kennedy was assassinated by more than one shooter on November 22, 1963, in Dallas, Texas. The theory challenges the Warren Commission's single-shooter conclusion.

## Key Arguments

### Acoustic Evidence
Modern acoustic analysis of the Zapruder film suggests at least four distinct shots were fired, inconsistent with a single shooter's capabilities and positioning.

### Witness Testimony
Over 90 witnesses present at Dealey Plaza reported hearing shots from multiple directions. Analysis of their testimonies reveals patterns suggesting gunfire from both the Texas School Book Depository and the grassy knoll.

### Ballistic Analysis
Physical examination of the trajectories of shots that struck President Kennedy and Governor Connally suggests they could not have come from a single firearm position.

### Photographic Evidence
Analysis of photographs taken during and immediately after the assassination shows potential muzzle flashes from locations other than the known sniper's nest.

## Supporting Evidence
- CIA documents mentioning known assassination plots
- Paraffin test results suggesting gunshot residue on Oswald's hands
- Conflicting autopsy findings

## Challenges to This Theory
- The Zapruder film does not clearly show multiple shooters
- No conclusive physical evidence of additional weapons found at the scene
- The single-bullet theory, while controversial, does explain some wounds

## Conclusion
While substantial evidence supports the possibility of multiple shooters, the complexity of the Kennedy assassination remains one of the most debated historical events. Further analysis with modern forensic techniques continues to yield new insights.`,
    credibility: 72,
    connectedNodes: [
      {
        id: 'n-1',
        title: 'Zapruder Film Frame Analysis',
        type: 'EVIDENCE',
        credibility: 85,
        summary: 'Frame-by-frame analysis of the assassination footage reveals motion inconsistencies.',
      },
      {
        id: 'n-2',
        title: 'Witness Testimony Report',
        type: 'ARTICLE',
        credibility: 78,
        summary: 'Comprehensive compilation of 90+ witness accounts from Dealey Plaza.',
      },
      {
        id: 'n-3',
        title: 'Acoustic Evidence Analysis',
        type: 'EVIDENCE',
        credibility: 68,
        summary: 'Technical analysis of gunshot sounds recorded during the assassination.',
      },
      {
        id: 'n-4',
        title: 'CIA Involvement Theories',
        type: 'THEORY',
        credibility: 55,
        summary: 'Examination of declassified documents revealing potential CIA connections.',
      },
      {
        id: 'n-5',
        title: 'Single Bullet Theory Challenge',
        type: 'CHALLENGE',
        credibility: 72,
        summary: 'Critical analysis challenging the validity of the single-bullet hypothesis.',
      },
    ] as ConnectedNode[],
  };

  const getNodeTypeIcon = (type: string) => {
    switch (type) {
      case 'EVIDENCE':
        return <FileText className="w-4 h-4" />;
      case 'ARTICLE':
        return <FileText className="w-4 h-4" />;
      case 'THEORY':
        return <Brain className="w-4 h-4" />;
      case 'CHALLENGE':
        return <FileText className="w-4 h-4" />;
      default:
        return <Link2 className="w-4 h-4" />;
    }
  };

  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'EVIDENCE':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'ARTICLE':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'THEORY':
        return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400';
      case 'CHALLENGE':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const handleNodeClick = (nodeId: string) => {
    router.push(`/nodes/${nodeId}`);
  };

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
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold">{theory.title}</h1>
              </div>
              <div className="flex-shrink-0 ml-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {theory.credibility}%
                  </div>
                  <div className="text-xs text-muted-foreground">Credibility</div>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">
              <Brain className="w-3 h-3 mr-1" />
              Theory
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="connected">
                  Connected ({theory.connectedNodes.length})
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-muted-foreground mb-6">{theory.summary}</p>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(renderMarkdown(theory.body)),
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Connected Nodes Tab */}
              <TabsContent value="connected" className="space-y-4 mt-6">
                {theory.connectedNodes.length === 0 ? (
                  <Card>
                    <CardContent className="pt-12 text-center">
                      <p className="text-muted-foreground">No connected nodes yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  theory.connectedNodes.map((node) => (
                    <Card
                      key={node.id}
                      className="cursor-pointer hover:border-primary hover:bg-accent transition-all"
                      onClick={() => handleNodeClick(node.id)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${getNodeTypeColor(node.type)}`}>
                                  {getNodeTypeIcon(node.type)}
                                  {node.type}
                                </span>
                              </div>
                              <h3 className="font-semibold truncate hover:text-primary">
                                {node.title}
                              </h3>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <div className="text-sm font-medium text-muted-foreground">
                                {node.credibility}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Credibility
                              </div>
                            </div>
                          </div>
                          {node.summary && (
                            <p className="text-sm text-muted-foreground pt-2">
                              {node.summary}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Theory Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Theory Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Type</div>
                  <p className="text-sm font-medium">Historical Theory</p>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Credibility Score</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${theory.credibility >= 80 ? 'bg-green-500' : theory.credibility >= 50 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                        style={{ width: `${theory.credibility}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{theory.credibility}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Connected Nodes</div>
                  <p className="text-sm font-medium">{theory.connectedNodes.length} items</p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/challenge?theory=${id}`)}
                >
                  Challenge Theory
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/formal-inquiry?target=${id}`)}
                >
                  Start Inquiry
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
