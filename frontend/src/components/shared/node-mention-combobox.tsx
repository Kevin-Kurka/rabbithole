"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLazyQuery } from '@apollo/client';
import { SEARCH_NODES, NodeSearchResult } from '@/graphql/queries/activity';
import { FileText } from 'lucide-react';

interface NodeMentionComboboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (node: NodeSearchResult) => void;
  anchorEl?: HTMLElement | null;
}

export function NodeMentionCombobox({
  open,
  onOpenChange,
  onSelect,
  anchorEl,
}: NodeMentionComboboxProps) {
  const [searchTerm, setSearchTerm] = useState('');
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
    onSelect(node);
    onOpenChange(false);
    setSearchTerm('');
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <span className="hidden" />
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0"
        align="start"
        side="bottom"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search nodes..."
            value={searchTerm}
            onValueChange={handleSearch}
          />
          <CommandList>
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {!loading && searchTerm && data?.searchNodes?.length === 0 && (
              <CommandEmpty>No nodes found.</CommandEmpty>
            )}
            {!loading && data?.searchNodes && data.searchNodes.length > 0 && (
              <CommandGroup>
                {data.searchNodes.map((node) => (
                  <CommandItem
                    key={node.id}
                    value={node.id}
                    onSelect={() => handleSelect(node)}
                    className="cursor-pointer"
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
  );
}
