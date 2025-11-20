"use client";

import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { ChevronLeft, MapPin, Loader2, Plus, X, Globe } from 'lucide-react';

const CREATE_PLACE_NODE = gql`
  mutation CreatePlaceNode($input: CreateNodeInput!) {
    createNode(input: $input) {
      id
      title
      type
      props
    }
  }
`;

interface PlaceFormProps {
  onBack: () => void;
  onClose: () => void;
  onSuccess: (nodeId: string) => void;
}

interface PlaceFormData {
  name: string;
  address: string;
  city: string;
  region: string;
  country: string;
  coordinates: string;
  description: string;
  sources: string[];
}

export function PlaceForm({ onBack, onClose, onSuccess }: PlaceFormProps) {
  const [formData, setFormData] = useState<PlaceFormData>({
    name: '',
    address: '',
    city: '',
    region: '',
    country: '',
    coordinates: '',
    description: '',
    sources: []
  });

  const [sourceInput, setSourceInput] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof PlaceFormData, string>>>({});

  const [createNode, { loading }] = useMutation(CREATE_PLACE_NODE, {
    onCompleted: (data) => {
      onSuccess(data.createNode.id);
    },
    onError: (error) => {
      setErrors({ name: error.message });
    }
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PlaceFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Place name is required';
    }

    if (formData.coordinates && !/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(formData.coordinates.trim())) {
      newErrors.coordinates = 'Use format: latitude, longitude (e.g., 40.7128, -74.0060)';
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
          type: 'Place',
          props: {
            schema: 'schema.org/Place',
            name: formData.name,
            address: formData.address || undefined,
            city: formData.city || undefined,
            region: formData.region || undefined,
            country: formData.country || undefined,
            coordinates: formData.coordinates || undefined,
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
      {/* Place Name */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Place Name <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, name: e.target.value }));
              setErrors(prev => ({ ...prev, name: undefined }));
            }}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
            placeholder="e.g., The White House"
          />
        </div>
        {errors.name && (
          <p className="mt-1 text-sm text-red-400">{errors.name}</p>
        )}
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Street Address
        </label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
          placeholder="e.g., 1600 Pennsylvania Avenue NW"
        />
      </div>

      {/* City, Region, Country */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            City
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
            placeholder="City"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            State/Region
          </label>
          <input
            type="text"
            value={formData.region}
            onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
            placeholder="State"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Country
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
              placeholder="Country"
            />
          </div>
        </div>
      </div>

      {/* Coordinates */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Coordinates (Latitude, Longitude)
        </label>
        <input
          type="text"
          value={formData.coordinates}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, coordinates: e.target.value }));
            setErrors(prev => ({ ...prev, coordinates: undefined }));
          }}
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
          placeholder="e.g., 38.8977, -77.0365"
        />
        {errors.coordinates && (
          <p className="mt-1 text-sm text-red-400">{errors.coordinates}</p>
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
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 resize-none"
          placeholder="Describe the place, its historical significance, and notable features..."
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
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
              placeholder="Enter URL or reference (press Enter to add)"
            />
            <button
              type="button"
              onClick={handleAddSource}
              className="px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-600/30 transition-all flex items-center gap-2"
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
            className="px-6 py-2 bg-red-600 hover:bg-red-700 border border-red-500 rounded-lg text-white transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Place'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
