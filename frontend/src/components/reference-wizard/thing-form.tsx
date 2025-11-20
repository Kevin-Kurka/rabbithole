"use client";

import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { ChevronLeft, Box, Loader2, Plus, X, Tag } from 'lucide-react';

const CREATE_THING_NODE = gql`
  mutation CreateThingNode($input: CreateNodeInput!) {
    createNode(input: $input) {
      id
      title
      type
      props
    }
  }
`;

interface ThingFormProps {
  onBack: () => void;
  onClose: () => void;
  onSuccess: (nodeId: string) => void;
}

interface ThingFormData {
  name: string;
  category: string;
  manufacturer: string;
  dateCreated: string;
  material: string;
  description: string;
  sources: string[];
}

export function ThingForm({ onBack, onClose, onSuccess }: ThingFormProps) {
  const [formData, setFormData] = useState<ThingFormData>({
    name: '',
    category: '',
    manufacturer: '',
    dateCreated: '',
    material: '',
    description: '',
    sources: []
  });

  const [sourceInput, setSourceInput] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof ThingFormData, string>>>({});

  const [createNode, { loading }] = useMutation(CREATE_THING_NODE, {
    onCompleted: (data) => {
      onSuccess(data.createNode.id);
    },
    onError: (error) => {
      setErrors({ name: error.message });
    }
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ThingFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.dateCreated && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(formData.dateCreated)) {
      newErrors.dateCreated = 'Use format: YYYY or YYYY-MM or YYYY-MM-DD';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.sources.length === 0) {
      newErrors.sources = 'At least one source is required';
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
          title: formData.name,
          type: 'Thing',
          props: {
            schema: 'schema.org/Thing',
            name: formData.name,
            category: formData.category || undefined,
            manufacturer: formData.manufacturer || undefined,
            dateCreated: formData.dateCreated || undefined,
            material: formData.material || undefined,
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
      {/* Thing Name */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Name <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, name: e.target.value }));
              setErrors(prev => ({ ...prev, name: undefined }));
            }}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            placeholder="e.g., Gutenberg Bible"
          />
        </div>
        {errors.name && (
          <p className="mt-1 text-sm text-red-400">{errors.name}</p>
        )}
      </div>

      {/* Category and Manufacturer */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Category
          </label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              placeholder="e.g., Book, Artifact"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Manufacturer/Creator
          </label>
          <input
            type="text"
            value={formData.manufacturer}
            onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            placeholder="e.g., Johannes Gutenberg"
          />
        </div>
      </div>

      {/* Date Created and Material */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Date Created
          </label>
          <input
            type="text"
            value={formData.dateCreated}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, dateCreated: e.target.value }));
              setErrors(prev => ({ ...prev, dateCreated: undefined }));
            }}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            placeholder="YYYY-MM-DD"
          />
          {errors.dateCreated && (
            <p className="mt-1 text-sm text-red-400">{errors.dateCreated}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Material
          </label>
          <input
            type="text"
            value={formData.material}
            onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            placeholder="e.g., Paper, Vellum"
          />
        </div>
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
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
          placeholder="Describe the object, its significance, and notable features..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-400">{errors.description}</p>
        )}
      </div>

      {/* Sources */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Primary Sources <span className="text-red-400">*</span>
        </label>
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
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              placeholder="Enter URL or reference (press Enter to add)"
            />
            <button
              type="button"
              onClick={handleAddSource}
              className="px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-600/30 transition-all flex items-center gap-2"
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
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 border border-purple-500 rounded-lg text-white transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Thing'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
