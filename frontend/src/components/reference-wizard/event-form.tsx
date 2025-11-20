"use client";

import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { ChevronLeft, Calendar, Loader2, Plus, X, MapPin, Users } from 'lucide-react';

const CREATE_EVENT_NODE = gql`
  mutation CreateEventNode($input: CreateNodeInput!) {
    createNode(input: $input) {
      id
      title
      type
      props
    }
  }
`;

interface EventFormProps {
  onBack: () => void;
  onClose: () => void;
  onSuccess: (nodeId: string) => void;
}

interface EventFormData {
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  participants: string[];
  description: string;
  sources: string[];
}

export function EventForm({ onBack, onClose, onSuccess }: EventFormProps) {
  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    startDate: '',
    endDate: '',
    location: '',
    participants: [],
    description: '',
    sources: []
  });

  const [participantInput, setParticipantInput] = useState('');
  const [sourceInput, setSourceInput] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof EventFormData, string>>>({});

  const [createNode, { loading }] = useMutation(CREATE_EVENT_NODE, {
    onCompleted: (data) => {
      onSuccess(data.createNode.id);
    },
    onError: (error) => {
      setErrors({ name: error.message });
    }
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof EventFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Event name is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    } else if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(formData.startDate)) {
      newErrors.startDate = 'Use format: YYYY or YYYY-MM or YYYY-MM-DD';
    }

    if (formData.endDate && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(formData.endDate)) {
      newErrors.endDate = 'Use format: YYYY or YYYY-MM or YYYY-MM-DD';
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
          type: 'Event',
          props: {
            schema: 'schema.org/Event',
            name: formData.name,
            startDate: formData.startDate,
            endDate: formData.endDate || undefined,
            location: formData.location || undefined,
            participants: formData.participants,
            description: formData.description,
            sources: formData.sources
          }
        }
      }
    });
  };

  const handleAddParticipant = () => {
    if (participantInput.trim()) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, participantInput.trim()]
      }));
      setParticipantInput('');
    }
  };

  const handleRemoveParticipant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index)
    }));
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
      {/* Event Name */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Event Name <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, name: e.target.value }));
              setErrors(prev => ({ ...prev, name: undefined }));
            }}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
            placeholder="e.g., Battle of Gettysburg"
          />
        </div>
        {errors.name && (
          <p className="mt-1 text-sm text-red-400">{errors.name}</p>
        )}
      </div>

      {/* Start Date and End Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Start Date <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={formData.startDate}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, startDate: e.target.value }));
                setErrors(prev => ({ ...prev, startDate: undefined }));
              }}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
              placeholder="YYYY-MM-DD"
            />
          </div>
          {errors.startDate && (
            <p className="mt-1 text-sm text-red-400">{errors.startDate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            End Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={formData.endDate}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, endDate: e.target.value }));
                setErrors(prev => ({ ...prev, endDate: undefined }));
              }}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
              placeholder="YYYY-MM-DD"
            />
          </div>
          {errors.endDate && (
            <p className="mt-1 text-sm text-red-400">{errors.endDate}</p>
          )}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Location
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
            placeholder="e.g., Gettysburg, Pennsylvania"
          />
        </div>
      </div>

      {/* Participants */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Key Participants
        </label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={participantInput}
                onChange={(e) => setParticipantInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddParticipant();
                  }
                }}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
                placeholder="Add participant name (press Enter)"
              />
            </div>
            <button
              type="button"
              onClick={handleAddParticipant}
              className="px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-lg text-green-300 hover:bg-green-600/30 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {formData.participants.length > 0 && (
            <div className="space-y-2 mt-3">
              {formData.participants.map((participant, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                >
                  <span className="flex-1 text-sm text-zinc-300">{participant}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(index)}
                    className="text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 resize-none"
          placeholder="Describe what happened, the significance, and key outcomes..."
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
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
              placeholder="Enter URL or reference (press Enter to add)"
            />
            <button
              type="button"
              onClick={handleAddSource}
              className="px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-lg text-green-300 hover:bg-green-600/30 transition-all flex items-center gap-2"
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
            className="px-6 py-2 bg-green-600 hover:bg-green-700 border border-green-500 rounded-lg text-white transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Event'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
