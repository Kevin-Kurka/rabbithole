'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
    Search,
    Brain,
    FileText,
    BookOpen,
    Scale,
    BarChart3,
    Link2,
    Microscope,
    Scroll,
    Gavel,
    MessageCircle,
    BookMarked,
} from 'lucide-react';

interface InquiryType {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    color: string;
}

const inquiryTypes: InquiryType[] = [
    {
        id: 'factual_accuracy',
        label: 'Factual Accuracy',
        icon: Search,
        description: 'Verify claims against primary sources',
        color: 'from-blue-500 to-cyan-500',
    },
    {
        id: 'logical_fallacy',
        label: 'Logical Fallacy',
        icon: Brain,
        description: 'Detect reasoning errors in arguments',
        color: 'from-purple-500 to-pink-500',
    },
    {
        id: 'missing_context',
        label: 'Missing Context',
        icon: FileText,
        description: 'Identify important omitted information',
        color: 'from-orange-500 to-red-500',
    },
    {
        id: 'source_reliability',
        label: 'Source Reliability',
        icon: BookOpen,
        description: 'Assess credibility of information sources',
        color: 'from-green-500 to-emerald-500',
    },
    {
        id: 'bias_detection',
        label: 'Bias Detection',
        icon: Scale,
        description: 'Identify potential biases in arguments',
        color: 'from-yellow-500 to-orange-500',
    },
    {
        id: 'statistical_validity',
        label: 'Statistical Validity',
        icon: BarChart3,
        description: 'Verify proper use of statistics',
        color: 'from-indigo-500 to-purple-500',
    },
    {
        id: 'causal_relationship',
        label: 'Causal Relationship',
        icon: Link2,
        description: 'Evaluate cause-and-effect claims',
        color: 'from-teal-500 to-cyan-500',
    },
    {
        id: 'scientific_inquiry',
        label: 'Scientific Inquiry',
        icon: Microscope,
        description: 'Systematic investigation using scientific method',
        color: 'from-blue-600 to-indigo-600',
    },
    {
        id: 'historical_interpretation',
        label: 'Historical Interpretation',
        icon: Scroll,
        description: 'Analyze historical claims and interpretations',
        color: 'from-amber-600 to-orange-600',
    },
    {
        id: 'legal_analysis',
        label: 'Legal Analysis',
        icon: Gavel,
        description: 'Systematic evidence gathering (legal discovery)',
        color: 'from-slate-600 to-gray-600',
    },
    {
        id: 'ethical_evaluation',
        label: 'Ethical Evaluation',
        icon: MessageCircle,
        description: 'Analyze ethical dimensions of claims',
        color: 'from-rose-500 to-pink-500',
    },
    {
        id: 'definition_dispute',
        label: 'Definition Dispute',
        icon: BookMarked,
        description: 'Resolve disagreements about term definitions',
        color: 'from-violet-500 to-purple-500',
    },
];

interface InquiryTypeSelectorProps {
    selectedType?: string;
    onSelect: (typeId: string) => void;
    aiSuggestion?: string;
}

export function InquiryTypeSelector({
    selectedType,
    onSelect,
    aiSuggestion,
}: InquiryTypeSelectorProps) {
    const [hoveredType, setHoveredType] = useState<string | null>(null);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">Choose Inquiry Type</h2>
                <p className="text-zinc-400">Select the type that best fits your investigation</p>
            </div>

            {/* Grid of type cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {inquiryTypes.map((type) => {
                    const isSelected = selectedType === type.id;
                    const isSuggested = aiSuggestion === type.id;
                    const isHovered = hoveredType === type.id;

                    return (
                        <motion.button
                            key={type.id}
                            className="relative group"
                            whileHover={{ scale: 1.05, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onHoverStart={() => setHoveredType(type.id)}
                            onHoverEnd={() => setHoveredType(null)}
                            onClick={() => onSelect(type.id)}
                        >
                            {/* Card */}
                            <div
                                className={`
                  relative overflow-hidden rounded-xl p-4 text-left
                  transition-all duration-300
                  ${isSelected
                                        ? 'bg-zinc-800 border-2 border-white shadow-lg'
                                        : 'bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700'
                                    }
                  backdrop-blur-xl
                `}
                            >
                                {/* Content */}
                                <div className="relative z-10 space-y-3">
                                    {/* Icon and label */}
                                    <div className="flex items-start justify-between">
                                        <type.icon className="w-8 h-8 text-zinc-50" />
                                        {isSuggested && (
                                            <motion.div
                                                className="px-2 py-1 rounded-full bg-white/10 border border-white/30"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.2 }}
                                            >
                                                <span className="text-xs font-semibold text-white">AI Pick</span>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Label */}
                                    <h3 className="font-bold text-white text-sm leading-tight">{type.label}</h3>

                                    {/* Description */}
                                    <p className="text-xs text-zinc-500 line-clamp-2">{type.description}</p>
                                </div>

                                {/* Selection indicator */}
                                {isSelected && (
                                    <motion.div
                                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    >
                                        <svg
                                            className="w-4 h-4 text-black"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={3}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                    </motion.div>
                                )}
                            </div>

                            {/* AI suggestion pulse */}
                            {isSuggested && !isSelected && (
                                <motion.div
                                    className="absolute -inset-0.5 bg-white rounded-xl opacity-20 blur"
                                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
