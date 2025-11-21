"use client";

import React, { useState, useCallback } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useLazyQuery } from '@apollo/client';
import { SEARCH_NODES, NodeSearchResult } from '@/graphql/queries/activity';
import { Link2, FileText } from 'lucide-react';
import { CreateNodeRelationshipDialog } from './create-node-relationship-dialog';

interface NodeLinkComboboxProps {
  sourceNodeId: string;
  sourceNodeTitle: string;
  onRelationshipCreated: (targetNodeId: string, description: string) => Promise<void>;
}

export function NodeLinkCombobox({
  sourceNodeId,
  sourceNodeTitle,
  onRelationshipCreated,
}: NodeLinkComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<NodeSearchResult | null>(null);
  const [relationshipDialogOpen, setRelationshipDialogOpen] = useState(false);

  const [searchNodes, { data, loading }] = useLazyQuery<{
    searchNodes: NodeSearchResult[];
  }>(SEARCH_NODES);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchTerm(value);
      if (value.trim().length > 0) {
        searchNodes({
          variables: {
            query: value,
            limit: 10,
          },
        });
      }
    },
    [searchNodes]
  );

  const handleSelect = (node: NodeSearchResult) => {
    setSelectedNode(node);
    setSearchTerm('');
    setOpen(false);
    setRelationshipDialogOpen(true);
  };

  const handleCreateRelationship = async (description: string) => {
    if (!selectedNode) return;
    await onRelationshipCreated(selectedNode.id, description);
    setSelectedNode(null);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Link2 className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 bg-background border" align="start">
          <Command shouldFilter={false} className="bg-transparent">
            <CommandInput
              placeholder="Search nodes to link..."
              value={searchTerm}
              onValueChange={handleSearch}
              className="bg-transparent"
            />
            <CommandList className="bg-transparent">
              {loading && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              )}
              {!loading && searchTerm && data?.searchNodes?.length === 0 && (
                <CommandEmpty>No nodes found.</CommandEmpty>
              )}
              {!loading && data?.searchNodes && data.searchNodes.length > 0 && (
                <CommandGroup className="bg-transparent">
                  {data.searchNodes
                    .filter((node) => node.id !== sourceNodeId)
                    .map((node) => (
                      <CommandItem
                        key={node.id}
                        value={node.id}
                        onSelect={() => handleSelect(node)}
                        className="cursor-pointer bg-transparent hover:bg-accent"
                      >
                        <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{node.title}</div>
                          <div className="text-xs text-muted-foreground">{node.type}</div>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedNode && (
        <CreateNodeRelationshipDialog
          open={relationshipDialogOpen}
          onOpenChange={setRelationshipDialogOpen}
          sourceNode={{ id: sourceNodeId, title: sourceNodeTitle }}
          targetNode={selectedNode}
          onCreateRelationship={handleCreateRelationship}
        />
      )}
    </>
  );
}
