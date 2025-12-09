'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Sparkles, Check, Search, Brain } from 'lucide-react';
import { InquiryTypeSelector } from './InquiryTypeSelector';
import { DuplicateDetectionPanel } from './DuplicateDetectionPanel';

interface CreateInquiryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (inquiry: any) => void;
    targetNode?: { id: string; title: string };
    prefilledContent?: string;
}

type Step = 'target' | 'type' | 'content' | 'review';

export function CreateInquiryModal({
    isOpen,
    onClose,
    onSubmit,
    targetNode,
    prefilledContent,
}: CreateInquiryModalProps) {
    const [currentStep, setCurrentStep] = useState<Step>('type');
    const [selectedType, setSelectedType] = useState<string>('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [content, setContent] = useState(prefilledContent || '');
    const [showDuplicates, setShowDuplicates] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

    const steps: Step[] = ['type', 'content', 'review'];
    const currentStepIndex = steps.indexOf(currentStep);

    const handleNext = () => {
        if (currentStep === 'type' && selectedType) {
            // Check for duplicates
            checkForDuplicates();
        } else if (currentStep === 'content') {
            setCurrentStep('review');
        }
    };

    const handleBack = () => {
        if (currentStep === 'content') setCurrentStep('type');
        else if (currentStep === 'review') setCurrentStep('content');
    };

    const checkForDuplicates = () => {
        // TODO: Call API to check for similar inquiries
        // For now, simulate
        const hasDuplicates = Math.random() > 0.7;
        if (hasDuplicates) {
            setShowDuplicates(true);
        } else {
            setCurrentStep('content');
        }
    };

    const handleSubmit = () => {
        onSubmit({
            type: selectedType,
            title,
            description,
            content,
            targetNodeId: targetNode?.id,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <AnimatePresence>
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 shadow-2xl"
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="relative p-6 border-b border-zinc-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-white/10">
                                        <Sparkles className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">Create Formal Inquiry</h2>
                                        {targetNode && (
                                            <p className="text-sm text-zinc-400">
                                                Investigating: <span className="text-white">{targetNode.title}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                                >
                                    <X className="w-5 h-5 text-zinc-400" />
                                </button>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-6 flex items-center gap-2">
                                {steps.map((step, index) => (
                                    <div key={step} className="flex-1 flex items-center gap-2">
                                        <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                                            <motion.div
                                                className="h-full bg-white"
                                                initial={{ width: 0 }}
                                                animate={{ width: index <= currentStepIndex ? '100%' : '0%' }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        </div>
                                        {index < steps.length - 1 && (
                                            <div
                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${index <= currentStepIndex
                                                    ? 'bg-white text-black'
                                                    : 'bg-zinc-800 text-zinc-500'
                                                    }`}
                                            >
                                                {index < currentStepIndex ? <Check className="w-4 h-4" /> : index + 1}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                            <AnimatePresence mode="wait">
                                {currentStep === 'type' && (
                                    <motion.div
                                        key="type"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <InquiryTypeSelector
                                            selectedType={selectedType}
                                            onSelect={setSelectedType}
                                            aiSuggestion="factual_accuracy"
                                        />
                                    </motion.div>
                                )}

                                {currentStep === 'content' && (
                                    <motion.div
                                        key="content"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center space-y-2">
                                            <h3 className="text-2xl font-bold text-white">Write Your Inquiry</h3>
                                            <p className="text-zinc-400">AI will help refine your content</p>
                                        </div>

                                        {/* Title */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-zinc-300">Title</label>
                                            <input
                                                type="text"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="Short, clear summary of your inquiry"
                                                className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:border-white focus:ring-2 focus:ring-white/20 outline-none transition-all"
                                            />
                                        </div>

                                        {/* Description */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-zinc-300">Description</label>
                                            <textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Context and background for your inquiry"
                                                rows={3}
                                                className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:border-white focus:ring-2 focus:ring-white/20 outline-none transition-all resize-none"
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-zinc-300">
                                                Detailed Argument
                                            </label>
                                            <textarea
                                                value={content}
                                                onChange={(e) => setContent(e.target.value)}
                                                placeholder="Provide your detailed argument with evidence..."
                                                rows={8}
                                                className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:border-white focus:ring-2 focus:ring-white/20 outline-none transition-all resize-none"
                                            />
                                        </div>

                                        {/* AI Suggestions */}
                                        {aiSuggestions.length > 0 && (
                                            <div className="p-4 rounded-lg bg-white/5 border border-zinc-800">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Sparkles className="w-4 h-4 text-white" />
                                                    <span className="text-sm font-semibold text-white">
                                                        AI Suggestions
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {aiSuggestions.map((suggestion, index) => (
                                                        <button
                                                            key={index}
                                                            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 hover:border-white hover:text-white transition-colors"
                                                        >
                                                            {suggestion}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {currentStep === 'review' && (
                                    <motion.div
                                        key="review"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center space-y-2">
                                            <h3 className="text-2xl font-bold text-white">Review & Submit</h3>
                                            <p className="text-zinc-400">Double-check your inquiry before submitting</p>
                                        </div>

                                        {/* Preview card */}
                                        <div className="p-6 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-4">
                                            <div className="flex items-center gap-2 text-zinc-400">
                                                {selectedType === 'factual_accuracy' ? (
                                                    <Search className="w-5 h-5" />
                                                ) : (
                                                    <Brain className="w-5 h-5" />
                                                )}
                                                <span className="text-sm font-semibold uppercase tracking-wider">
                                                    {selectedType.replace(/_/g, ' ')}
                                                </span>
                                            </div>

                                            <h3 className="text-2xl font-bold text-white">{title || 'Untitled'}</h3>

                                            {description && <p className="text-zinc-400">{description}</p>}

                                            {content && (
                                                <div className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
                                                    <p className="text-zinc-300 whitespace-pre-wrap">{content}</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-zinc-800 flex items-center justify-between">
                            <button
                                onClick={handleBack}
                                disabled={currentStep === 'type'}
                                className="px-6 py-2.5 rounded-lg border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>

                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 rounded-lg border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white font-semibold transition-all"
                                >
                                    Cancel
                                </button>

                                {currentStep === 'review' ? (
                                    <button
                                        onClick={handleSubmit}
                                        className="px-6 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold transition-all flex items-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        Submit Inquiry
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleNext}
                                        disabled={currentStep === 'type' && !selectedType}
                                        className="px-6 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        Next
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>

            {/* Duplicate detection panel */}
            {showDuplicates && (
                <DuplicateDetectionPanel
                    similarInquiries={[
                        {
                            id: '1',
                            title: 'JFK Single Bullet Theory Physics Issues',
                            credibilityScore: 0.73,
                            consensusScore: 0.68,
                            evidenceCount: 12,
                            voteCount: 8,
                        },
                        {
                            id: '2',
                            title: 'Ballistics Analysis of Single Bullet',
                            credibilityScore: 0.68,
                            consensusScore: 0.71,
                            evidenceCount: 8,
                            voteCount: 15,
                        },
                    ]}
                    onMerge={(id) => {
                        console.log('Merge with:', id);
                        setShowDuplicates(false);
                        onClose();
                    }}
                    onCreateNew={() => {
                        setShowDuplicates(false);
                        setCurrentStep('content');
                    }}
                    onClose={() => setShowDuplicates(false)}
                />
            )}
        </>
    );
}
