'use client';

import { motion } from 'framer-motion';
import { DualScoreRings } from './ScoreRing';
import { FileText, MessageCircle, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
    Search,
    Brain,
    FileText as FileTextIcon,
    BookOpen,
    Scale,
    BarChart3,
    Link2,
    Microscope,
    Scroll,
    Gavel,
    MessageCircle as MessageCircleIcon,
    BookMarked,
} from 'lucide-react';

interface InquiryCardProps {
    id: string;
    type: string;
    title: string;
    targetTitle: string;
    credibilityScore: number;
    consensusScore: number;
    evidenceCount: number;
    voteCount: number;
    createdAt: Date;
    createdBy: string;
    onClick?: () => void;
}

const inquiryTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    factual_accuracy: Search,
    logical_fallacy: Brain,
    missing_context: FileTextIcon,
    source_reliability: BookOpen,
    bias_detection: Scale,
    statistical_validity: BarChart3,
    causal_relationship: Link2,
    scientific_inquiry: Microscope,
    historical_interpretation: Scroll,
    legal_analysis: Gavel,
    ethical_evaluation: MessageCircleIcon,
    definition_dispute: BookMarked,
};

const inquiryTypeLabels: Record<string, string> = {
    factual_accuracy: 'Factual Accuracy',
    logical_fallacy: 'Logical Fallacy',
    missing_context: 'Missing Context',
    source_reliability: 'Source Reliability',
    bias_detection: 'Bias Detection',
    statistical_validity: 'Statistical Validity',
    causal_relationship: 'Causal Relationship',
    scientific_inquiry: 'Scientific Inquiry',
    historical_interpretation: 'Historical Interpretation',
    legal_analysis: 'Legal Analysis',
    ethical_evaluation: 'Ethical Evaluation',
    definition_dispute: 'Definition Dispute',
};

export function InquiryCard({
    id,
    type,
    title,
    targetTitle,
    credibilityScore,
    consensusScore,
    evidenceCount,
    voteCount,
    createdAt,
    createdBy,
    onClick,
}: InquiryCardProps) {
    const IconComponent = inquiryTypeIcons[type] || Search;
    const typeLabel = inquiryTypeLabels[type] || type;

    return (
        <motion.div
            className="group relative cursor-pointer"
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            onClick={onClick}
        >
            {/* Glassmorphic card */}
            <div className="relative overflow-hidden rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 p-6 shadow-xl transition-all duration-300 group-hover:border-zinc-700 group-hover:shadow-2xl">

                {/* Content */}
                <div className="relative z-10 space-y-4">
                    {/* Type badge */}
                    <div className="flex items-center gap-2">
                        <IconComponent className="w-5 h-5 text-zinc-50" />
                        <span className="text-sm font-semibold text-zinc-400">{typeLabel}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-white line-clamp-2 transition-colors">
                        {title}
                    </h3>

                    {/* Target */}
                    <p className="text-sm text-zinc-500">
                        Investigating: <span className="text-zinc-300">{targetTitle}</span>
                    </p>

                    {/* Scores */}
                    <div className="flex justify-center py-4">
                        <DualScoreRings
                            credibility={credibilityScore}
                            consensus={consensusScore}
                            size="sm"
                        />
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-3 text-sm text-zinc-500">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span>{evidenceCount} Evidence</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            <span>{voteCount} Votes</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{formatDistanceToNow(createdAt, { addSuffix: true })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>@{createdBy}</span>
                        </div>
                    </div>
                </div>


            </div>
        </motion.div>
    );
}
