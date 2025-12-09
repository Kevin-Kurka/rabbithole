'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Sparkles, FileText, MessageCircle } from 'lucide-react';
import { DualScoreRings } from './ScoreRing';

interface SimilarInquiry {
    id: string;
    title: string;
    credibilityScore: number;
    consensusScore: number;
    evidenceCount: number;
    voteCount: number;
}

interface DuplicateDetectionPanelProps {
    similarInquiries: SimilarInquiry[];
    onMerge: (inquiryId: string) => void;
    onCreateNew: () => void;
    onClose: () => void;
}

export function DuplicateDetectionPanel({
    similarInquiries,
    onMerge,
    onCreateNew,
    onClose,
}: DuplicateDetectionPanelProps) {
    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 shadow-2xl"
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="relative p-6 border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white/10">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Similar Inquiries Found</h2>
                                <p className="text-sm text-zinc-400">
                                    Consider merging to build stronger evidence
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                        >
                            <X className="w-5 h-5 text-zinc-400" />
                        </button>
                    </div>

                    {/* Similar inquiries list */}
                    <div className="p-6 space-y-4 overflow-y-auto max-h-[50vh]">
                        {similarInquiries.map((inquiry, index) => (
                            <motion.div
                                key={inquiry.id}
                                className="group relative overflow-hidden rounded-xl bg-zinc-900/90 border border-zinc-800 p-5 hover:border-zinc-700 transition-all duration-300"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 opacity-0 group-hover:opacity-10 transition-opacity" />

                                <div className="relative z-10 space-y-4">
                                    {/* Title */}
                                    <h3 className="text-lg font-semibold text-white pr-8">{inquiry.title}</h3>

                                    {/* Scores */}
                                    <div className="flex justify-center">
                                        <DualScoreRings
                                            credibility={inquiry.credibilityScore}
                                            consensus={inquiry.consensusScore}
                                            size="sm"
                                        />
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center justify-center gap-6 text-sm text-zinc-500">
                                        <span className="flex items-center gap-1.5">
                                            <FileText className="w-4 h-4" />
                                            {inquiry.evidenceCount} evidence
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <MessageCircle className="w-4 h-4" />
                                            {inquiry.voteCount} votes
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => onMerge(inquiry.id)}
                                            className="flex-1 px-4 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold transition-colors flex items-center justify-center gap-2 group/btn"
                                        >
                                            <span>Merge with This</span>
                                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                /* View inquiry */
                                            }}
                                            className="px-4 py-2.5 rounded-lg border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white font-semibold transition-colors"
                                        >
                                            View
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-zinc-800">
                        <button
                            onClick={onCreateNew}
                            className="w-full px-6 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-semibold transition-all duration-300 hover:scale-[1.02]"
                        >
                            Create New Inquiry Anyway
                        </button>
                        <p className="mt-3 text-xs text-center text-zinc-600">
                            Your inquiry will be marked as distinct from these
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
