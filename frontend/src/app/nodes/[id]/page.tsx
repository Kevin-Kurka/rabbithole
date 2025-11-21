"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { Network, User, LogIn, Moon, Sun, ChevronDown, List, FileText, Link2, Shield, AlertTriangle, CheckCircle, LayoutGrid, Plus, Target, X, Users, Calendar, FileCheck, Upload } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { CreateInquirySidebar } from '@/components/create-inquiry-sidebar';
import { FormalInquiryCard } from '@/components/formal-inquiry-card';
import { TextSelectionMenu } from '@/components/text-selection-menu';
import { AddCommentDialog } from '@/components/add-comment-dialog';
import { ArticleWithBadges } from '@/components/article-with-badges';
import { useQuery } from '@apollo/client';
import { GET_FORMAL_INQUIRIES, type FormalInquiry } from '@/graphql/queries/formal-inquiries';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadFileDialog } from '@/components/upload-file-dialog';
import { FileAttachmentList } from '@/components/file-attachment-list';
import { ActivityFeed } from '@/components/activity-feed';
import { NodeAssociationsPanel } from '@/components/node-associations-panel';

interface RelatedNode {
  id: string;
  title: string;
  type: string;
  credibility: number;
  x: number;
  y: number;
  connections: string[];
}

interface BreadcrumbItem {
  id: string;
  title: string;
}

export default function NodeDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Dragging state for related nodes graph
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Related tab view state
  const [relatedView, setRelatedView] = useState<'list' | 'graph'>('list');

  // Active tab state
  const [activeTab, setActiveTab] = useState('article');

  // Breadcrumb navigation history
  const [breadcrumbPath, setBreadcrumbPath] = useState<BreadcrumbItem[]>([]);

  // Selected inquiry for sidebar
  const [selectedInquiry, setSelectedInquiry] = useState<string | null>(null);

  // Create inquiry dialog state
  const [createInquiryOpen, setCreateInquiryOpen] = useState(false);

  // File upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Comment dialog state
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [textSelection, setTextSelection] = useState<Selection | null>(null);

  // Mock evidence ID - replace with actual evidence from GraphQL
  const mockEvidenceId = 'evidence-1';

  // Mock citations for article content
  const mockCitations = [
    {
      id: 'cite-1',
      text: 'Zapruder film frame analysis',
      url: 'https://example.com/zapruder-analysis',
      title: 'Zapruder Film Technical Analysis',
      startOffset: 150,
      endOffset: 180,
    },
    {
      id: 'cite-2',
      text: 'Warren Commission Report',
      url: 'https://example.com/warren-commission',
      title: 'Official Warren Commission Report',
      startOffset: 300,
      endOffset: 325,
    },
  ];

  // Mock node links for article content
  const mockNodeLinks = [
    {
      id: 'link-1',
      nodeId: '2',
      nodeTitle: 'Warren Commission',
      text: 'Warren Commission',
      startOffset: 200,
      endOffset: 218,
    },
    {
      id: 'link-2',
      nodeId: '3',
      nodeTitle: 'Lee Harvey Oswald',
      text: 'Lee Harvey Oswald',
      startOffset: 400,
      endOffset: 417,
    },
  ];

  // Mock related nodes - replace with actual GraphQL query
  const [relatedNodes, setRelatedNodes] = useState<RelatedNode[]>([
    {
      id: '1',
      title: 'JFK Assassination',
      type: 'Investigation',
      credibility: 85,
      x: 50,
      y: 30,
      connections: ['2', '3']
    },
    {
      id: '2',
      title: 'Warren Commission',
      type: 'Evidence',
      credibility: 72,
      x: 30,
      y: 60,
      connections: ['1']
    },
    {
      id: '3',
      title: 'Lee Harvey Oswald',
      type: 'Person',
      credibility: 90,
      x: 70,
      y: 60,
      connections: ['1']
    },
  ]);

  // Query formal inquiries for this node
  const { data: inquiriesData, loading: inquiriesLoading, refetch: refetchInquiries } = useQuery<{
    getFormalInquiries: FormalInquiry[];
  }>(GET_FORMAL_INQUIRIES, {
    variables: { nodeId: id },
    skip: !id,
  });

  // Mock inquiries data
  const mockInquiries = [
    {
      id: '1',
      title: 'Single Bullet Theory Analysis',
      status: 'In Progress',
      description: 'Investigate the trajectory and evidence supporting or refuting the single bullet theory.',
      startedDate: 'Jan 15, 2024',
      contributors: 3,
      evidenceCount: 12,
      methodology: 'Scientific Method',
      objective: 'Determine whether a single bullet could have caused all the non-fatal wounds to President Kennedy and Governor Connally as described in the Warren Commission Report.',
      hypothesis: 'The single bullet trajectory is physically possible given the seating positions and wound patterns.',
      currentStep: 'Evidence Collection',
      findings: [
        'Zapruder film frame analysis suggests possible alignment',
        'Ballistic tests show bullet deformation consistent with multiple impacts',
        'Medical evidence shows entry and exit wounds align with proposed trajectory'
      ]
    },
    {
      id: '2',
      title: 'Witness Testimony Verification',
      status: 'Completed',
      description: 'Cross-reference and validate witness testimonies from Dealey Plaza.',
      completedDate: 'Jan 10, 2024',
      contributors: 5,
      evidenceCount: 28,
      methodology: 'Legal Discovery',
      objective: 'Verify consistency and credibility of eyewitness accounts from Dealey Plaza on November 22, 1963.',
      findings: [
        'Identified 28 distinct witness accounts',
        'Found 3 major areas of consensus among witnesses',
        'Documented 5 conflicting testimonies requiring further investigation',
        'Verified chain of custody for 12 witness statements'
      ],
      conclusion: 'Majority of witness testimonies show consistent patterns regarding shot direction and timing, though some discrepancies remain unexplained.'
    },
  ];

  // Mock node data - replace with actual GraphQL query
  const node = {
    id,
    title: 'JFK Assassination Evidence Analysis',
    type: 'Investigation',
    credibility: 85,
    content: 'Detailed analysis of evidence related to the JFK assassination...',
    created_at: '2024-01-15',
    updated_at: '2024-01-20',
    inquiriesCount: inquiriesData?.getFormalInquiries?.length || 0,
    activityCount: 0, // Will be populated by ActivityFeed component
    relatedCount: relatedNodes.length,
  };

  // Manage breadcrumb navigation history
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Get existing history from sessionStorage
    const storedHistory = sessionStorage.getItem('nodeBreadcrumbs');
    const history: BreadcrumbItem[] = storedHistory ? JSON.parse(storedHistory) : [];

    // Check if current node is already in history
    const existingIndex = history.findIndex(item => item.id === id);

    if (existingIndex !== -1) {
      // If node exists in history, truncate to that point
      setBreadcrumbPath(history.slice(0, existingIndex));
      sessionStorage.setItem('nodeBreadcrumbs', JSON.stringify(history.slice(0, existingIndex)));
    } else {
      // Add current node to history
      const newPath = [...history, { id, title: node.title }];
      setBreadcrumbPath(history);
      sessionStorage.setItem('nodeBreadcrumbs', JSON.stringify(newPath));
    }
  }, [id, node.title]);

  // Drag handlers for related nodes
  const handleMouseDown = (e: React.MouseEvent, nodeId: string, node: RelatedNode) => {
    e.stopPropagation();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const nodeX = (node.x / 100) * rect.width;
    const nodeY = (node.y / 100) * rect.height;

    setDraggedNodeId(nodeId);
    setDragOffset({
      x: e.clientX - nodeX,
      y: e.clientY - nodeY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNodeId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = ((e.clientX - dragOffset.x) / rect.width) * 100;
    const newY = ((e.clientY - dragOffset.y) / rect.height) * 100;

    const clampedX = Math.max(0, Math.min(100, newX));
    const clampedY = Math.max(0, Math.min(100, newY));

    setRelatedNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === draggedNodeId
          ? { ...node, x: clampedX, y: clampedY }
          : node
      )
    );
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
  };

  const getNodeTypeIcon = (type: string) => {
    switch (type) {
      case 'Investigation':
        return <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1} />;
      case 'Evidence':
        return <Shield className="w-3.5 h-3.5" strokeWidth={1} />;
      case 'Person':
        return <User className="w-3.5 h-3.5" strokeWidth={1} />;
      default:
        return <FileText className="w-3.5 h-3.5" strokeWidth={1} />;
    }
  };

  const handleTextComment = (text: string, selection: Selection) => {
    setSelectedText(text);
    setTextSelection(selection);
    setCommentDialogOpen(true);
  };

  const handleTextInquiry = (text: string, selection: Selection) => {
    setSelectedText(text);
    setTextSelection(selection);
    setCreateInquiryOpen(true);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card flex-shrink-0">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Breadcrumb Navigation */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" title="Back to Graph">
                    <Network className="h-4 w-4" />
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbPath.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink href={`/nodes/${item.id}`}>
                        {item.title}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-muted-foreground">
                    {node.title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* User Menu */}
            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>

              {session ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session.user?.image || undefined} />
                        <AvatarFallback>
                          {session.user?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline">{session.user?.name}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/api/auth/signout')}>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => router.push('/login')}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
              )}
            </div>
          </div>

          {/* Node Title and Metadata */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">{node.title}</h1>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {node.credibility}%
                  </div>
                  <div className="text-xs text-muted-foreground">Credibility</div>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <div className="text-sm text-muted-foreground">
                  Type: <span className="font-medium text-foreground">{node.type}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Full Height */}
      <div className="flex-1 container mx-auto px-4 py-6 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Left Column - Main Content with Tabs - Full Height */}
          <div className="lg:col-span-2 flex flex-col h-full">
            <Card className="flex flex-col h-full overflow-hidden">
              <CardContent className="p-0 flex flex-col h-full">
                <Tabs defaultValue="article" className="flex flex-col h-full" onValueChange={setActiveTab}>
                  <TabsList className="w-full h-auto justify-start rounded-none bg-transparent p-0 border-0 px-6 pt-4 flex-shrink-0">
                    {/* Contents Dropdown Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 mr-2"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="z-[100] bg-card border border-border shadow-lg"
                      >
                        <DropdownMenuLabel>Contents</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            const element = document.getElementById('section-overview');
                            element?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="cursor-pointer"
                        >
                          Overview
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const element = document.getElementById('section-evidence');
                            element?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="cursor-pointer"
                        >
                          Evidence Analysis
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const element = document.getElementById('section-conclusions');
                            element?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="cursor-pointer"
                        >
                          Conclusions
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <TabsTrigger
                      value="article"
                      className="rounded-none border-0 bg-transparent shadow-none data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-normal hover:font-bold px-4 py-2"
                    >
                      Article
                    </TabsTrigger>
                    <TabsTrigger
                      value="inquiries"
                      className="rounded-none border-0 bg-transparent shadow-none data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-normal hover:font-bold px-4 py-2"
                    >
                      <span className="flex items-center gap-1.5">
                        Inquiries
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {node.inquiriesCount}
                        </span>
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="activity"
                      className="rounded-none border-0 bg-transparent shadow-none data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-normal hover:font-bold px-4 py-2"
                    >
                      <span className="flex items-center gap-1.5">
                        Activity
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {node.activityCount}
                        </span>
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="related"
                      className="rounded-none border-0 bg-transparent shadow-none data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-normal hover:font-bold px-4 py-2"
                    >
                      <span className="flex items-center gap-1.5">
                        Related
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {node.relatedCount}
                        </span>
                      </span>
                    </TabsTrigger>

                    {/* Action Buttons - Conditional based on active tab */}
                    <div className="ml-auto">
                      {/* Start Inquiry Button - Only visible when Inquiries tab is active */}
                      {activeTab === 'inquiries' && (
                        <Button
                          size="sm"
                          className="gap-2 h-8"
                          onClick={() => setCreateInquiryOpen(true)}
                        >
                          <Plus className="w-3 h-3" />
                          Start Inquiry
                        </Button>
                      )}

                      {/* View Toggle - Only visible when Related tab is active */}
                      {activeTab === 'related' && (
                        <button
                          type="button"
                          onClick={() => setRelatedView(relatedView === 'list' ? 'graph' : 'list')}
                          className="p-2 hover:bg-muted rounded transition-colors"
                          title={relatedView === 'list' ? 'Switch to graph view' : 'Switch to list view'}
                        >
                          {relatedView === 'list' ? (
                            <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <List className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </div>
                  </TabsList>

                  <div className="flex-1 overflow-y-auto p-6">
                    <TabsContent value="article" className="mt-0 h-full">
                      <ArticleWithBadges
                        onNavigateToNode={(nodeId) => router.push(`/nodes/${nodeId}`)}
                      />
                      {activeTab === 'article' && (
                        <TextSelectionMenu
                          onComment={handleTextComment}
                          onInquiry={handleTextInquiry}
                          containerId="article-content"
                        />
                      )}
                    </TabsContent>

                    <TabsContent value="inquiries" className="mt-0 h-full">
                      <div className="space-y-4">
                        {inquiriesLoading && (
                          <div className="text-center py-8 text-muted-foreground">
                            Loading inquiries...
                          </div>
                        )}

                        {!inquiriesLoading && inquiriesData?.getFormalInquiries.length === 0 && (
                          <div className="text-center py-8">
                            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground mb-4">
                              No formal inquiries yet. Start one to begin evidence-based evaluation.
                            </p>
                            <Button onClick={() => setCreateInquiryOpen(true)}>
                              <Plus className="w-4 h-4 mr-2" />
                              Start First Inquiry
                            </Button>
                          </div>
                        )}

                        {inquiriesData?.getFormalInquiries.map((inquiry) => (
                          <FormalInquiryCard
                            key={inquiry.id}
                            inquiry={inquiry}
                            onVoteChange={() => refetchInquiries()}
                          />
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="activity" className="mt-0 h-full">
                      <ActivityFeed
                        nodeId={id}
                        user={session?.user ? {
                          name: session.user.name || undefined,
                          email: session.user.email || '',
                          image: session.user.image || undefined,
                        } : undefined}
                      />
                    </TabsContent>

                    <TabsContent value="related" className="mt-0 h-full flex flex-col">
                      {/* List View */}
                      {relatedView === 'list' && (
                        <div className="flex-1 overflow-y-auto space-y-2">
                          {relatedNodes.map((relatedNode) => (
                            <Card
                              key={relatedNode.id}
                              className="cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => router.push(`/nodes/${relatedNode.id}`)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="text-muted-foreground">
                                      {getNodeTypeIcon(relatedNode.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-sm truncate">
                                        {relatedNode.title}
                                      </h4>
                                      <p className="text-xs text-muted-foreground">
                                        {relatedNode.type}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className="flex items-center gap-1">
                                      <div
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{
                                          backgroundColor:
                                            relatedNode.credibility >= 80
                                              ? 'rgb(34, 197, 94)'
                                              : relatedNode.credibility >= 50
                                              ? 'rgb(234, 179, 8)'
                                              : 'rgb(239, 68, 68)',
                                        }}
                                      />
                                      <span className="text-xs text-muted-foreground">
                                        {relatedNode.credibility}%
                                      </span>
                                    </div>
                                    <Link2 className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      {/* Graph View */}
                      {relatedView === 'graph' && (
                        <div className="flex-1 relative bg-black/50 rounded overflow-hidden">
                          <div
                            ref={canvasRef}
                            className="absolute inset-0"
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                          >
                            {/* Connection Lines */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                              {relatedNodes.flatMap(node =>
                                node.connections.map(targetId => {
                                  const target = relatedNodes.find(n => n.id === targetId);
                                  if (!target) return null;
                                  return (
                                    <line
                                      key={`${node.id}-${targetId}`}
                                      x1={`${node.x}%`}
                                      y1={`${node.y}%`}
                                      x2={`${target.x}%`}
                                      y2={`${target.y}%`}
                                      stroke="rgba(255, 255, 255, 0.15)"
                                      strokeWidth="1"
                                    />
                                  );
                                })
                              )}
                            </svg>

                            {/* Node Cards */}
                            {relatedNodes.map(relatedNode => (
                              <div
                                key={relatedNode.id}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                                style={{
                                  left: `${relatedNode.x}%`,
                                  top: `${relatedNode.y}%`,
                                  cursor: draggedNodeId === relatedNode.id ? 'grabbing' : 'grab',
                                }}
                                onMouseDown={(e) => handleMouseDown(e, relatedNode.id, relatedNode)}
                              >
                                <div
                                  onClick={(e) => {
                                    if (draggedNodeId === null) {
                                      router.push(`/nodes/${relatedNode.id}`);
                                    }
                                  }}
                                  className="group relative"
                                >
                                  <div className="w-56 bg-zinc-900 border border-white/20 rounded shadow-2xl hover:border-white/40 hover:bg-zinc-800 transition-all overflow-hidden" style={{ borderWidth: '1px', borderRadius: '8px' }}>
                                    <div className="px-4 py-3 border-b border-white/10" style={{ borderBottomWidth: '1px' }}>
                                      <h3 className="text-sm font-medium text-white line-clamp-2">{relatedNode.title}</h3>
                                    </div>

                                    <div className="px-4 py-3 flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2">
                                        <div className="text-zinc-400">{getNodeTypeIcon(relatedNode.type)}</div>
                                        <span className="text-xs text-zinc-400">{relatedNode.type}</span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                          <div
                                            className="w-1.5 h-1.5 rounded-full"
                                            style={{
                                              backgroundColor:
                                                relatedNode.credibility >= 80
                                                  ? 'rgb(34, 197, 94)'
                                                  : relatedNode.credibility >= 50
                                                  ? 'rgb(234, 179, 8)'
                                                  : 'rgb(239, 68, 68)',
                                            }}
                                          />
                                          <span className="text-xs font-medium text-zinc-300">{relatedNode.credibility}%</span>
                                        </div>

                                        <div className="text-zinc-400 group-hover:text-white transition-colors">
                                          <Link2 className="w-3.5 h-3.5" strokeWidth={1} />
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Single Scrollable Container */}
          <div className="h-full">
            <NodeAssociationsPanel
              nodeId={id}
              evidenceId={mockEvidenceId}
              nodeData={{
                title: node.title,
                type: node.type,
                credibility: node.credibility,
                created_at: node.created_at,
                updated_at: node.updated_at,
                relatedCount: node.relatedCount,
              }}
            />
          </div>
        </div>
      </div>

      {/* Inquiry Details Sidebar */}
      {selectedInquiry && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setSelectedInquiry(null)}
          />

          {/* Sidebar */}
          <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-zinc-950 dark:bg-zinc-950 border-l z-50 overflow-y-auto">
            {(() => {
              const inquiry = mockInquiries.find(i => i.id === selectedInquiry);
              if (!inquiry) return null;

              return (
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-primary" />
                        <h2 className="text-2xl font-bold">{inquiry.title}</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded text-sm ${
                          inquiry.status === 'In Progress'
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-green-500/10 text-green-500'
                        }`}>
                          {inquiry.status}
                        </span>
                        <span className="text-sm text-muted-foreground">{inquiry.methodology}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedInquiry(null)}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {inquiry.status === 'In Progress' ? 'Started' : 'Completed'}
                          </span>
                        </div>
                        <p className="text-sm font-medium">
                          {inquiry.status === 'In Progress' ? inquiry.startedDate : inquiry.completedDate}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Contributors</span>
                        </div>
                        <p className="text-sm font-medium">{inquiry.contributors}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <FileCheck className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Evidence</span>
                        </div>
                        <p className="text-sm font-medium">{inquiry.evidenceCount} items</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">{inquiry.description}</p>
                  </div>

                  {/* Objective */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Objective</h3>
                    <p className="text-sm text-muted-foreground">{inquiry.objective}</p>
                  </div>

                  {/* Hypothesis (for in progress inquiries) */}
                  {inquiry.status === 'In Progress' && 'hypothesis' in inquiry && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">Hypothesis</h3>
                      <p className="text-sm text-muted-foreground">{inquiry.hypothesis}</p>
                    </div>
                  )}

                  {/* Current Step (for in progress inquiries) */}
                  {inquiry.status === 'In Progress' && 'currentStep' in inquiry && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">Current Step</h3>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        <p className="text-sm font-medium">{inquiry.currentStep}</p>
                      </div>
                    </div>
                  )}

                  {/* Findings */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">
                      {inquiry.status === 'In Progress' ? 'Findings So Far' : 'Key Findings'}
                    </h3>
                    <ul className="space-y-2">
                      {inquiry.findings.map((finding, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Conclusion (for completed inquiries) */}
                  {inquiry.status === 'Completed' && 'conclusion' in inquiry && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">Conclusion</h3>
                      <Card className="bg-muted">
                        <CardContent className="p-4">
                          <p className="text-sm">{inquiry.conclusion}</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* Create Inquiry Sidebar */}
      <CreateInquirySidebar
        open={createInquiryOpen}
        onOpenChange={setCreateInquiryOpen}
        targetNodeId={id}
        relatedNodeIds={relatedNodes.map(n => n.id)}
      />

      {/* Upload File Dialog */}
      <UploadFileDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        evidenceId={mockEvidenceId}
        onUploadComplete={() => {
          // Refresh file list
          setUploadDialogOpen(false);
        }}
      />

      {/* Add Comment Dialog */}
      <AddCommentDialog
        open={commentDialogOpen}
        onOpenChange={setCommentDialogOpen}
        selectedText={selectedText}
        nodeId={id}
        onCommentAdded={() => {
          // Refresh comments or activity feed
          setCommentDialogOpen(false);
        }}
      />
    </div>
  );
}
