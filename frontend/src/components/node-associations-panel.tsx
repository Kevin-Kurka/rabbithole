"use client";

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  Paperclip,
  Link2,
  Quote,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { FileAttachmentList } from '@/components/media/file-attachment-list';
import { NodeLinkCombobox } from '@/components/node-link-combobox';
import { UploadFileDialog } from '@/components/upload-file-dialog';
import { AddReferenceDialog } from '@/components/add-reference-dialog';
import { AIReferenceProcessorDialog } from '@/components/ai-reference-processor-dialog';
import { useFileViewerStore } from '@/stores/file-viewer-store';
import type { NodeSearchResult } from '@/graphql/queries/activity';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_NODE_REFERENCES,
  GET_NODE_ASSOCIATIONS,
  ADD_REFERENCE,
  ADD_NODE_ASSOCIATION,
  type NodeReference,
  type NodeAssociation,
} from '@/graphql/queries/evidence-files';

interface NodeAssociationsPanelProps {
  nodeId: string;
  evidenceId?: string;
  nodeData?: {
    title?: string;
    type: string;
    credibility: number;
    created_at: string;
    updated_at: string;
    relatedCount: number;
  };
}

export function NodeAssociationsPanel({ nodeId, evidenceId, nodeData }: NodeAssociationsPanelProps) {
  const { openFile } = useFileViewerStore();

  // Section open states - Quick Facts open by default, others collapsed
  const [quickFactsOpen, setQuickFactsOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(false);
  const [nodesOpen, setNodesOpen] = useState(false);
  const [referencesOpen, setReferencesOpen] = useState(false);
  const [citationsOpen, setCitationsOpen] = useState(false);

  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [addReferenceDialogOpen, setAddReferenceDialogOpen] = useState(false);
  const [addCitationDialogOpen, setAddCitationDialogOpen] = useState(false);
  const [aiProcessorOpen, setAIProcessorOpen] = useState(false);
  const [selectedReference, setSelectedReference] = useState<string | null>(null);

  // GraphQL queries
  const { data: referencesData, refetch: refetchReferences } = useQuery<{
    getNodeReferences: NodeReference[];
  }>(GET_NODE_REFERENCES, {
    variables: { nodeId, type: 'reference' },
    skip: !nodeId,
  });

  const { data: citationsData, refetch: refetchCitations } = useQuery<{
    getNodeReferences: NodeReference[];
  }>(GET_NODE_REFERENCES, {
    variables: { nodeId, type: 'citation' },
    skip: !nodeId,
  });

  const { data: associationsData, refetch: refetchAssociations } = useQuery<{
    getNodeAssociations: NodeAssociation[];
  }>(GET_NODE_ASSOCIATIONS, {
    variables: { nodeId },
    skip: !nodeId,
  });

  // GraphQL mutations
  const [addReferenceMutation] = useMutation(ADD_REFERENCE);
  const [addNodeAssociationMutation] = useMutation(ADD_NODE_ASSOCIATION);

  const references = referencesData?.getNodeReferences || [];
  const citations = citationsData?.getNodeReferences || [];
  const associatedNodes = associationsData?.getNodeAssociations || [];

  const handleFileClick = (file: any) => {
    openFile({
      id: file.id,
      name: file.original_filename || file.title,
      url: file.url,
      mimeType: file.mime_type,
      size: file.file_size,
    });
  };

  const handleNodeClick = (nodeId: string) => {
    window.location.href = `/nodes/${nodeId}`;
  };

  const handleReferenceClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleProcessReference = (referenceUrl: string) => {
    setSelectedReference(referenceUrl);
    setAIProcessorOpen(true);
  };

  const handleAddReference = async (reference: any) => {
    try {
      await addReferenceMutation({
        variables: {
          input: {
            nodeId,
            url: reference.url,
            title: reference.title,
            description: reference.description,
            type: reference.type,
          },
        },
      });

      // Refetch to update the list
      if (reference.type === 'citation') {
        await refetchCitations();
      } else {
        await refetchReferences();
      }
    } catch (error) {
      console.error('Error adding reference:', error);
    }
  };

  const handleAddNodeAssociation = async (targetNodeId: string, description: string) => {
    try {
      // Determine relationship type from description using simple keyword matching
      // TODO: Replace with actual AI service call
      const lowerDesc = description.toLowerCase();
      let relationshipType = 'related';

      if (lowerDesc.includes('cause') || lowerDesc.includes('led to') || lowerDesc.includes('resulted in')) {
        relationshipType = 'causes';
      } else if (lowerDesc.includes('support') || lowerDesc.includes('evidence') || lowerDesc.includes('proves')) {
        relationshipType = 'supports';
      } else if (lowerDesc.includes('contradict') || lowerDesc.includes('refute') || lowerDesc.includes('disproves')) {
        relationshipType = 'contradicts';
      } else if (lowerDesc.includes('similar') || lowerDesc.includes('like') || lowerDesc.includes('same as')) {
        relationshipType = 'similar_to';
      } else if (lowerDesc.includes('part of') || lowerDesc.includes('component') || lowerDesc.includes('belongs to')) {
        relationshipType = 'part_of';
      } else if (lowerDesc.includes('temporal') || lowerDesc.includes('before') || lowerDesc.includes('after')) {
        relationshipType = 'temporal';
      } else if (lowerDesc.includes('cites') || lowerDesc.includes('references') || lowerDesc.includes('quoted')) {
        relationshipType = 'cites';
      }

      await addNodeAssociationMutation({
        variables: {
          input: {
            sourceNodeId: nodeId,
            targetNodeId,
            confidence: 0.8,
            relationshipType,
            description, // This will be stored in Edge.props
          },
        },
      });

      // Refetch to update the list
      await refetchAssociations();
    } catch (error) {
      console.error('Error adding node association:', error);
    }
  };

  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Get file count from FileAttachmentList (we'll need to track this)
  const [fileCount, setFileCount] = useState(0);

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Quick Facts Section */}
        <Collapsible open={quickFactsOpen} onOpenChange={setQuickFactsOpen}>
          <div className="flex items-center gap-2 py-2 hover:bg-accent/50 rounded px-2 transition-colors">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1">
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${quickFactsOpen ? 'rotate-0' : '-rotate-90'}`} />
              <CardTitle className="text-sm font-semibold">Quick Facts</CardTitle>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="pl-6 pr-2 py-2 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium">{nodeData?.type || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Credibility:</span>
                <span className="font-medium text-primary">{nodeData?.credibility || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">{nodeData?.created_at || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated:</span>
                <span className="font-medium">{nodeData?.updated_at || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Related Nodes:</span>
                <span className="font-medium">{nodeData?.relatedCount || 0}</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Files Section */}
        <Collapsible open={filesOpen} onOpenChange={setFilesOpen}>
          <div className="group flex items-center justify-between py-2 hover:bg-accent/50 rounded px-2 transition-colors">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1">
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${filesOpen ? 'rotate-0' : '-rotate-90'}`} />
              <CardTitle className="text-sm font-semibold">Files</CardTitle>
              {fileCount > 0 && (
                <span className="text-xs text-muted-foreground ml-1">({fileCount})</span>
              )}
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setUploadDialogOpen(true);
              }}
              title="Upload files"
            >
              <Paperclip className="h-3 w-3" />
            </Button>
          </div>
          <CollapsibleContent>
            <div className="pl-6 pr-2 py-2">
              {evidenceId ? (
                <FileAttachmentList
                  evidenceId={evidenceId}
                  onFileDeleted={() => {
                    // Refresh file list
                  }}
                />
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No files attached.
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Nodes Section */}
        <Collapsible open={nodesOpen} onOpenChange={setNodesOpen}>
          <div className="group flex items-center justify-between py-2 hover:bg-accent/50 rounded px-2 transition-colors">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1">
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${nodesOpen ? 'rotate-0' : '-rotate-90'}`} />
              <CardTitle className="text-sm font-semibold">Nodes</CardTitle>
              {associatedNodes.length > 0 && (
                <span className="text-xs text-muted-foreground ml-1">({associatedNodes.length})</span>
              )}
            </CollapsibleTrigger>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <NodeLinkCombobox
                sourceNodeId={nodeId}
                sourceNodeTitle={nodeData?.title || 'Unknown Node'}
                onRelationshipCreated={handleAddNodeAssociation}
              />
            </div>
          </div>
          <CollapsibleContent>
            <div className="pl-6 pr-2 py-2">
              {associatedNodes.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No nodes associated. Click the link icon to connect nodes.
                </div>
              ) : (
                <div className="space-y-2">
                  {associatedNodes.map((node) => (
                    <div
                      key={node.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-accent cursor-pointer"
                      onClick={() => handleNodeClick(node.targetNode.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{node.targetNode.title}</div>
                        <div className="text-xs text-muted-foreground">{node.targetNode.type}</div>
                      </div>
                      <div className={`text-xs font-medium ${getConfidenceColor(node.confidence)}`}>
                        {formatConfidence(node.confidence)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* References Section */}
        <Collapsible open={referencesOpen} onOpenChange={setReferencesOpen}>
          <div className="group flex items-center justify-between py-2 hover:bg-accent/50 rounded px-2 transition-colors">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1">
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${referencesOpen ? 'rotate-0' : '-rotate-90'}`} />
              <CardTitle className="text-sm font-semibold">References</CardTitle>
              {references.length > 0 && (
                <span className="text-xs text-muted-foreground ml-1">({references.length})</span>
              )}
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setAddReferenceDialogOpen(true);
              }}
              title="Add reference"
            >
              <Quote className="h-3 w-3" />
            </Button>
          </div>
          <CollapsibleContent>
            <div className="pl-6 pr-2 py-2">
              {references.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No references added. Click the quote icon to add a reference.
                </div>
              ) : (
                <div className="space-y-2">
                  {references.map((ref) => (
                    <div
                      key={ref.id}
                      className="group relative p-2 rounded hover:bg-accent"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{ref.title}</div>
                          <div
                            className="text-xs text-muted-foreground truncate cursor-pointer hover:text-primary"
                            onClick={() => handleReferenceClick(ref.url)}
                          >
                            <ExternalLink className="inline w-3 h-3 mr-1" />
                            {ref.url}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {ref.confidence ? (
                            <div className={`text-xs font-medium ${getConfidenceColor(ref.confidence)}`}>
                              {formatConfidence(ref.confidence)}
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-100"
                              onClick={() => handleProcessReference(ref.url)}
                              title="Process with AI"
                            >
                              <Sparkles className="h-3 w-3 text-primary" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Citations Section */}
        <Collapsible open={citationsOpen} onOpenChange={setCitationsOpen}>
          <div className="group flex items-center justify-between py-2 hover:bg-accent/50 rounded px-2 transition-colors">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1">
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${citationsOpen ? 'rotate-0' : '-rotate-90'}`} />
              <CardTitle className="text-sm font-semibold">Citations</CardTitle>
              {citations.length > 0 && (
                <span className="text-xs text-muted-foreground ml-1">({citations.length})</span>
              )}
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setAddCitationDialogOpen(true);
              }}
              title="Add citation"
            >
              <Quote className="h-3 w-3" />
            </Button>
          </div>
          <CollapsibleContent>
            <div className="pl-6 pr-2 py-2">
              {citations.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No citations added. Click the quote icon to add a citation.
                </div>
              ) : (
                <div className="space-y-2">
                  {citations.map((cite) => (
                    <div
                      key={cite.id}
                      className="group relative p-2 rounded hover:bg-accent"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{cite.title}</div>
                          <div
                            className="text-xs text-muted-foreground truncate cursor-pointer hover:text-primary"
                            onClick={() => handleReferenceClick(cite.url)}
                          >
                            <ExternalLink className="inline w-3 h-3 mr-1" />
                            {cite.url}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {cite.confidence ? (
                            <div className={`text-xs font-medium ${getConfidenceColor(cite.confidence)}`}>
                              {formatConfidence(cite.confidence)}
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-100"
                              onClick={() => handleProcessReference(cite.url)}
                              title="Process with AI"
                            >
                              <Sparkles className="h-3 w-3 text-primary" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      {/* Dialogs */}
      {evidenceId && (
        <UploadFileDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          evidenceId={evidenceId}
          onUploadComplete={() => {
            setUploadDialogOpen(false);
          }}
        />
      )}

      <AddReferenceDialog
        open={addReferenceDialogOpen}
        onOpenChange={setAddReferenceDialogOpen}
        nodeId={nodeId}
        type="reference"
        onAdd={(reference) => {
          handleAddReference(reference);
          setAddReferenceDialogOpen(false);
        }}
      />

      <AddReferenceDialog
        open={addCitationDialogOpen}
        onOpenChange={setAddCitationDialogOpen}
        nodeId={nodeId}
        type="citation"
        onAdd={(citation) => {
          handleAddReference(citation);
          setAddCitationDialogOpen(false);
        }}
      />

      {selectedReference && (
        <AIReferenceProcessorDialog
          open={aiProcessorOpen}
          onOpenChange={setAIProcessorOpen}
          referenceUrl={selectedReference}
          nodeId={nodeId}
          onProcessComplete={(newNode) => {
            setAIProcessorOpen(false);
            // Refetch references to show updated confidence score
            refetchReferences();
            refetchCitations();
          }}
        />
      )}
    </Card>
  );
}
