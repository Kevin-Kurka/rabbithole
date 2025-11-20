"use client";

import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { ChevronLeft, User, Loader2, Plus, X, Calendar, Globe, Briefcase } from 'lucide-react';

const CREATE_PERSON_NODE = gql`
  mutation CreatePersonNode($input: CreateNodeInput!) {
    createNode(input: $input) {
      id
      title
      type
      props
    }
  }
`;

interface PersonFormProps {
  onBack: () => void;
  onClose: () => void;
  onSuccess: (nodeId: string) => void;
}

interface PersonFormData {
  fullName: string;
  birthDate: string;
  deathDate: string;
  nationality: string;
  occupation: string;
  bio: string;
  sources: string[];
}

export function PersonForm({ onBack, onClose, onSuccess }: PersonFormProps) {
  const [formData, setFormData] = useState<PersonFormData>({
    fullName: '',
    birthDate: '',
    deathDate: '',
    nationality: '',
    occupation: '',
    bio: '',
    sources: []
  });

  const [sourceInput, setSourceInput] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof PersonFormData, string>>>({});

  const [createNode, { loading }] = useMutation(CREATE_PERSON_NODE, {
    onCompleted: (data) => {
      onSuccess(data.createNode.id);
    },
    onError: (error) => {
      setErrors({ fullName: error.message });
    }
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PersonFormData, string>> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.bio.trim()) {
      newErrors.bio = 'Biography is required';
    }

    if (formData.birthDate && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(formData.birthDate)) {
      newErrors.birthDate = 'Use format: YYYY or YYYY-MM or YYYY-MM-DD';
    }

    if (formData.deathDate && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(formData.deathDate)) {
      newErrors.deathDate = 'Use format: YYYY or YYYY-MM or YYYY-MM-DD';
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
          title: formData.fullName,
          type: 'Person',
          props: {
            schema: 'schema.org/Person',
            fullName: formData.fullName,
            birthDate: formData.birthDate || undefined,
            deathDate: formData.deathDate || undefined,
            nationality: formData.nationality || undefined,
            occupation: formData.occupation || undefined,
            bio: formData.bio,
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
      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Full Name <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, fullName: e.target.value }));
              setErrors(prev => ({ ...prev, fullName: undefined }));
            }}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            placeholder="e.g., Jane Smith"
          />
        </div>
        {errors.fullName && (
          <p className="mt-1 text-sm text-red-400">{errors.fullName}</p>
        )}
      </div>

      {/* Birth Date and Death Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Birth Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={formData.birthDate}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, birthDate: e.target.value }));
                setErrors(prev => ({ ...prev, birthDate: undefined }));
              }}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              placeholder="YYYY-MM-DD"
            />
          </div>
          {errors.birthDate && (
            <p className="mt-1 text-sm text-red-400">{errors.birthDate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Death Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={formData.deathDate}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, deathDate: e.target.value }));
                setErrors(prev => ({ ...prev, deathDate: undefined }));
              }}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              placeholder="YYYY-MM-DD"
            />
          </div>
          {errors.deathDate && (
            <p className="mt-1 text-sm text-red-400">{errors.deathDate}</p>
          )}
        </div>
      </div>

      {/* Nationality and Occupation */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Nationality
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={formData.nationality}
              onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              placeholder="e.g., American"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Occupation
          </label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={formData.occupation}
              onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              placeholder="e.g., Scientist"
            />
          </div>
        </div>
      </div>

      {/* Biography */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Biography <span className="text-red-400">*</span>
        </label>
        <textarea
          value={formData.bio}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, bio: e.target.value }));
            setErrors(prev => ({ ...prev, bio: undefined }));
          }}
          rows={4}
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
          placeholder="Brief biography including key achievements and historical significance..."
        />
        {errors.bio && (
          <p className="mt-1 text-sm text-red-400">{errors.bio}</p>
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
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              placeholder="Enter URL or reference (press Enter to add)"
            />
            <button
              type="button"
              onClick={handleAddSource}
              className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-300 hover:bg-blue-600/30 transition-all flex items-center gap-2"
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
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-lg text-white transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Person'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
