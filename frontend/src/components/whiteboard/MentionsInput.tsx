/**
 * Mentions Input Component
 *
 * Text input with @mentions support and autocomplete
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AtSign, X } from 'lucide-react';

export interface Mention {
  id: string;
  name: string;
  type?: 'user' | 'node';
}

export interface MentionsInputProps {
  value: string;
  onChange: (value: string, mentions: Mention[]) => void;
  onSearch?: (query: string) => Promise<Mention[]>;
  placeholder?: string;
  className?: string;
  rows?: number;
}

const MentionsInput: React.FC<MentionsInputProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Type @ to mention...',
  className = '',
  rows = 3,
}) => {
  const [suggestions, setSuggestions] = useState<Mention[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detect @ mentions
  useEffect(() => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtSymbol + 1);
      // Check if there's no space after @
      if (!textAfterAt.includes(' ')) {
        setMentionTriggerIndex(lastAtSymbol);
        // Search for mentions
        if (onSearch) {
          onSearch(textAfterAt).then((results) => {
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
            setSelectedIndex(0);
          });
        }
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [value, onSearch]);

  const insertMention = (mention: Mention) => {
    if (mentionTriggerIndex === -1) return;

    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeMention = value.slice(0, mentionTriggerIndex);
    const textAfterCursor = value.slice(cursorPosition);

    const newValue = `${textBeforeMention}@${mention.name} ${textAfterCursor}`;
    const newMentions = [...mentions, mention];

    setMentions(newMentions);
    onChange(newValue, newMentions);
    setShowSuggestions(false);
    setMentionTriggerIndex(-1);

    // Focus and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionTriggerIndex + mention.name.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  const removeMention = (mentionId: string) => {
    const newMentions = mentions.filter((m) => m.id !== mentionId);
    setMentions(newMentions);
    onChange(value, newMentions);
  };

  return (
    <div className="relative">
      {/* Mentions Tags */}
      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {mentions.map((mention) => (
            <div
              key={mention.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
            >
              <AtSign className="w-3 h-3" />
              <span>{mention.name}</span>
              <button
                onClick={() => removeMention(mention.id)}
                className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value, mentions)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={`
          w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500
          text-sm resize-none
          ${className}
        `}
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => insertMention(suggestion)}
              className={`
                w-full px-3 py-2 text-left text-sm flex items-center gap-2
                transition-colors
                ${
                  index === selectedIndex
                    ? 'bg-blue-100 text-blue-900'
                    : 'hover:bg-gray-100 text-gray-800'
                }
              `}
            >
              <AtSign className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <div className="font-medium">{suggestion.name}</div>
                {suggestion.type && (
                  <div className="text-xs text-gray-500">{suggestion.type}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Hint */}
      <div className="mt-1 text-xs text-gray-500">
        <AtSign className="w-3 h-3 inline mr-1" />
        Type @ to mention users or nodes
      </div>
    </div>
  );
};

export default MentionsInput;
