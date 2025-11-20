"use client";

import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { ChevronLeft, FileText, Loader2, Plus, X, User, Calendar, Link } from 'lucide-react';

const CREATE_SOURCE_NODE = gql`
  mutation CreateSourceNode($input: CreateNodeInput!) {
    createNode(input: $input) {
      id
      title
      type
      props
    }
  }
`;

interface SourceFormProps {
  onBack: () => void;
  onClose: () => void;
  onSuccess: (nodeId: string) => void;
}

interface SourceFormData {
  title: string;
  author: string;
  datePublished: string;
  publisher: string;
  url: string;
  sourceType: string;
  description: string;
  sources: string[];
}

export function SourceForm({ onBack, onClose, onSuccess }: SourceFormProps) {
  const [formData, setFormData] = useState<SourceFormData>({
    title: '',
    author: '',
    datePublished: '',
    publisher: '',
    url: '',
    sourceType: '',
    description: '',
    sources: []
  });

  const [sourceInput, setSourceInput] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof SourceFormData, string>>>({});

  const [createNode, { loading }] = useMutation(CREATE_SOURCE_NODE, {
    onCompleted: (data) => {
      onSuccess(data.createNode.id);
    },
    onError: (error) => {
      setErrors({ title: error.message });
    }
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof SourceFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.datePublished && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(formData.datePublished)) {
      newErrors.datePublished = 'Use format: YYYY or YYYY-MM or YYYY-MM-DD';
    }

    if (formData.url && !/^https?:\/\/.+/.test(formData.url)) {
      newErrors.url = 'URL must start with http:// or https://';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.sources.length === 0) {
      newErrors.sources = 'At least one verification source is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await createNode({
      variables: {
        input: {
          title: formData.title,
          type: 'Source',
          props: {
            schema: 'schema.org/CreativeWork',
            title: formData.title,
            author: formData.author || undefined,
            datePublished: formData.datePublished || undefined,
            publisher: formData.publisher || undefined,
            url: formData.url || undefined,
            sourceType: formData.sourceType || undefined,
            description: formData.description,
            sources: formData.sources
          }
        }
      }
    });
  };

  const handleAddSource = () => {
    if (sourceInput.trim()) {
      setFormData(prev => ({
        ...prev,
        sources: [...prev.sources, sourceInput.trim()]
      }));
      setSourceInput('');
      setErrors(prev => ({ ...prev, sources: undefined }));
    }
  };

  const handleRemoveSource = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sources: prev.sources.filter((_, i) => i !== index)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Source Title */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Title <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={formData.title}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, title: e.target.value }));
              setErrors(prev => ({ ...prev, title: undefined }));
            }}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
            placeholder="e.g., The New York Times Article on..."
          />
        </div>
        {errors.title && (
          <p className="mt-1 text-sm text-red-400">{errors.title}</p>
        )}
      </div>

      {/* Author and Publisher */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Author
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
              placeholder="e.g., Jane Doe"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Publisher
          </label>
          <input
            type="text"
            value={formData.publisher}
            onChange={(e) => setFormData(prev => ({ ...prev, publisher: e.target.value }))}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
            placeholder="e.g., New York Times"
          />
        </div>
      </div>

      {/* Date Published and Source Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Date Published
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={formData.datePublished}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, datePublished: e.target.value }));
                setErrors(prev => ({ ...prev, datePublished: undefined }));
              }}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
              placeholder="YYYY-MM-DD"
            />
          </div>
          {errors.datePublished && (
            <p className="mt-1 text-sm text-red-400">{errors.datePublished}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Source Type
          </label>
          <select
            value={formData.sourceType}
            onChange={(e) => setFormData(prev => ({ ...prev, sourceType: e.target.value }))}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
          >
            <option value="">Select type...</option>
            <option value="Article">Article</option>
            <option value="Book">Book</option>
            <option value="Report">Report</option>
            <option value="Website">Website</option>
            <option value="Video">Video</option>
            <option value="Podcast">Podcast</option>
            <option value="Interview">Interview</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* URL */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          URL
        </label>
        <div className="relative">
          <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={formData.url}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, url: e.target.value }));
              setErrors(prev => ({ ...prev, url: undefined }));
            }}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
            placeholder="https://example.com/article"
          />
        </div>
        {errors.url && (
          <p className="mt-1 text-sm text-red-400">{errors.url}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, description: e.target.value }));
            setErrors(prev => ({ ...prev, description: undefined }));
          }}
          rows={4}
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 resize-none"
          placeholder="Summarize the content and explain why this is a credible source..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-400">{errors.description}</p>
        )}
      </div>

      {/* Verification Sources */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Verification Sources <span className="text-red-400">*</span>
        </label>
        <p className="text-xs text-zinc-400 mb-2">
          Provide sources that verify the authenticity and credibility of this primary source
        </p>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={sourceInput}
              onChange={(e) => setSourceInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSource();
                }
              }}
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
              placeholder="Enter URL or reference (press Enter to add)"
            />
            <button
              type="button"
              onClick={handleAddSource}
              className="px-4 py-2 bg-yellow-600/20 border border-yellow-500/30 rounded-lg text-yellow-300 hover:bg-yellow-600/30 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {formData.sources.length > 0 && (
            <div className="space-y-2 mt-3">
              {formData.sources.map((source, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                >
                  <span className="flex-1 text-sm text-zinc-300 truncate">{source}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSource(index)}
                    className="text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {errors.sources && (
            <p className="mt-1 text-sm text-red-400">{errors.sources}</p>
          )}
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="px-4 py-2 text-zinc-400 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 border border-yellow-500 rounded-lg text-white transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Source'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
