"use client";

import React, { useState } from 'react';
import { X, User, MapPin, Calendar, Box, FileText, ChevronRight } from 'lucide-react';
import { PersonForm } from './person-form';

export type NodeType = 'Person' | 'Event' | 'Place' | 'Thing' | 'Source';

interface ReferenceWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (nodeId: string) => void;
}

/**
 * ReferenceWizard - Step-by-step wizard for creating typed reference nodes
 *
 * Supports creating:
 * - Person: Individuals with biographical data
 * - Event: Historical or significant events
 * - Place: Locations and addresses
 * - Thing: Physical objects or concepts
 * - Source: Primary sources and references
 */
export function ReferenceWizard({ isOpen, onClose, onSuccess }: ReferenceWizardProps) {
  const [step, setStep] = useState<'select' | 'form'>('select');
  const [selectedType, setSelectedType] = useState<NodeType | null>(null);

  const nodeTypes = [
    {
      type: 'Person' as NodeType,
      icon: User,
      title: 'Person',
      description: 'Individual with biographical information',
      color: 'blue'
    },
    {
      type: 'Event' as NodeType,
      icon: Calendar,
      title: 'Event',
      description: 'Historical or significant occurrence',
      color: 'green'
    },
    {
      type: 'Place' as NodeType,
      icon: MapPin,
      title: 'Place',
      description: 'Location or geographical area',
      color: 'red'
    },
    {
      type: 'Thing' as NodeType,
      icon: Box,
      title: 'Thing',
      description: 'Physical object or concept',
      color: 'purple'
    },
    {
      type: 'Source' as NodeType,
      icon: FileText,
      title: 'Source',
      description: 'Primary source or reference document',
      color: 'yellow'
    }
  ];

  const handleTypeSelect = (type: NodeType) => {
    setSelectedType(type);
    setStep('form');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedType(null);
  };

  const handleFormClose = () => {
    setStep('select');
    setSelectedType(null);
    onClose();
  };

  const handleFormSuccess = (nodeId: string) => {
    setStep('select');
    setSelectedType(null);
    onClose();
    if (onSuccess) {
      onSuccess(nodeId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden">
        <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl overflow-hidden" style={{ borderWidth: '1px' }}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {step === 'select' ? 'Create Reference Node' : `Create ${selectedType}`}
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                {step === 'select'
                  ? 'Select the type of reference node to create'
                  : 'Fill in the details below'}
              </p>
            </div>
            <button
              onClick={handleFormClose}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {step === 'select' && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {nodeTypes.map((nodeType) => {
                    const Icon = nodeType.icon;
                    return (
                      <button
                        key={nodeType.type}
                        onClick={() => handleTypeSelect(nodeType.type)}
                        className="flex items-start gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition-all text-left group"
                      >
                        <div className={`p-3 bg-${nodeType.color}-600/20 border border-${nodeType.color}-500/40 rounded-lg`}>
                          <Icon className={`w-6 h-6 text-${nodeType.color}-300`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-base font-semibold text-white">
                              {nodeType.title}
                            </h3>
                            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                          </div>
                          <p className="text-sm text-zinc-400">
                            {nodeType.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 'form' && selectedType === 'Person' && (
              <PersonForm
                onBack={handleBack}
                onClose={handleFormClose}
                onSuccess={handleFormSuccess}
              />
            )}

            {step === 'form' && selectedType !== 'Person' && (
              <div className="p-6">
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Coming Soon</h3>
                  <p className="text-zinc-400 max-w-md mx-auto mb-6">
                    The {selectedType} form is being developed. For now, only Person nodes can be created.
                  </p>
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                  >
                    Back to Selection
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
