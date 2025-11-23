"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Clock, GitBranch, User, RotateCcw, Eye, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const GET_GRAPH_VERSIONS = gql`
  query GetGraphVersions($graphId: ID!) {
    graphVersions(graphId: $graphId) {
      id
      versionNumber
      description
      createdAt
      createdBy {
        id
        username
      }
      nodeCount
      edgeCount
      isSnapshot
    }
  }
`;

const CREATE_VERSION = gql`
  mutation CreateGraphVersion($graphId: ID!, $description: String!) {
    createGraphVersion(graphId: $graphId, description: $description) {
      id
      versionNumber
      description
      createdAt
    }
  }
`;

const RESTORE_VERSION = gql`
  mutation RestoreGraphVersion($versionId: ID!) {
    restoreGraphVersion(versionId: $versionId) {
      id
      versionNumber
    }
  }
`;

interface GraphVersion {
  id: string;
  versionNumber: number;
  description: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
  } | null;
  nodeCount: number;
  edgeCount: number;
  isSnapshot: boolean;
}

interface VersionHistoryProps {
  graphId: string;
  onVersionRestore?: () => void;
  className?: string;
}

export function VersionHistory({
  graphId,
  onVersionRestore,
  className,
}: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<GraphVersion | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newVersionDescription, setNewVersionDescription] = useState('');

  const { data, loading, error, refetch } = useQuery(GET_GRAPH_VERSIONS, {
    variables: { graphId },
  });

  const [createVersion, { loading: creating }] = useMutation(CREATE_VERSION, {
    onCompleted: () => {
      refetch();
      setCreateDialogOpen(false);
      setNewVersionDescription('');
    },
  });

  const [restoreVersion, { loading: restoring }] = useMutation(RESTORE_VERSION, {
    onCompleted: () => {
      refetch();
      setRestoreDialogOpen(false);
      if (onVersionRestore) {
        onVersionRestore();
      }
    },
  });

  const handleCreateVersion = async () => {
    await createVersion({
      variables: {
        graphId,
        description: newVersionDescription || `Version created on ${new Date().toLocaleString()}`,
      },
    });
  };

  const handleRestoreClick = (version: GraphVersion) => {
    setSelectedVersion(version);
    setRestoreDialogOpen(true);
  };

  const handleRestoreConfirm = async () => {
    if (selectedVersion) {
      await restoreVersion({
        variables: { versionId: selectedVersion.id },
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <Card className={cn("bg-zinc-900 border-zinc-800", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Clock className="w-5 h-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("bg-zinc-900 border-zinc-800", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <XCircle className="w-5 h-5 text-red-500" />
            Error Loading Versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-400">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  const versions: GraphVersion[] = data?.graphVersions || [];

  return (
    <>
      <Card className={cn("bg-zinc-900 border-zinc-800", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <Clock className="w-5 h-5" />
              Version History
            </CardTitle>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <GitBranch className="w-4 h-4 mr-2" />
              Create Version
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No versions yet</p>
              <p className="text-xs mt-1">Create a version to save the current state</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={cn(
                    "group relative p-4 rounded-lg border transition-all",
                    index === 0
                      ? "bg-blue-500/10 border-blue-500/50"
                      : "bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={index === 0 ? "default" : "secondary"}
                          className={cn(
                            "font-mono text-xs",
                            index === 0 && "bg-blue-600"
                          )}
                        >
                          v{version.versionNumber}
                        </Badge>
                        {version.isSnapshot && (
                          <Badge variant="outline" className="text-xs">
                            Snapshot
                          </Badge>
                        )}
                        {index === 0 && (
                          <Badge className="bg-green-600 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Current
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-zinc-200 mb-2">
                        {version.description || 'No description'}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        {version.createdBy && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {version.createdBy.username}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(version.createdAt)}
                        </div>
                        <div className="flex items-center gap-3">
                          <span>{version.nodeCount} nodes</span>
                          <span>{version.edgeCount} edges</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestoreClick(version)}
                        disabled={index === 0 || restoring}
                        className="text-zinc-400 hover:text-zinc-200"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Restore
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Version Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Create New Version</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Save the current state of the graph as a new version
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Description (optional)
              </label>
              <textarea
                value={newVersionDescription}
                onChange={(e) => setNewVersionDescription(e.target.value)}
                placeholder="Describe what changed in this version..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateVersion}
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {creating ? 'Creating...' : 'Create Version'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Restore Version?</DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will restore the graph to version {selectedVersion?.versionNumber}.
              The current state will be saved as a new version.
            </DialogDescription>
          </DialogHeader>
          {selectedVersion && (
            <div className="py-4 space-y-2 border-y border-zinc-800">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Version:</span>
                <span className="text-zinc-200">v{selectedVersion.versionNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Created:</span>
                <span className="text-zinc-200">{formatDate(selectedVersion.createdAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Nodes/Edges:</span>
                <span className="text-zinc-200">
                  {selectedVersion.nodeCount} / {selectedVersion.edgeCount}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRestoreDialogOpen(false)}
              disabled={restoring}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestoreConfirm}
              disabled={restoring}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {restoring ? 'Restoring...' : 'Restore Version'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
