/**
 * Simple Credibility Badge Component
 * Displays credibility score with color coding
 */

import React from 'react';
import { Shield } from 'lucide-react';

interface CredibilityBadgeProps {
    score: number;
    evidenceCount?: number;
    challengeCount?: number;
    variant?: 'default' | 'compact';
}

export function CredibilityBadge({
    score,
    evidenceCount = 0,
    challengeCount = 0,
    variant = 'default',
}: CredibilityBadgeProps) {
    const getColor = () => {
        if (score >= 0.9) return 'text-green-400';
        if (score >= 0.7) return 'text-lime-400';
        if (score >= 0.4) return 'text-yellow-400';
        if (score >= 0.1) return 'text-orange-400';
        return 'text-red-400';
    };

    const percentage = Math.round(score * 100);

    if (variant === 'compact') {
        return (
            <div className="flex items-center gap-1">
                <Shield className={`w-3 h-3 ${getColor()}`} />
                <span className={`text-xs font-medium ${getColor()}`}>
                    {percentage}%
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <Shield className={`w-4 h-4 ${getColor()}`} />
            <div>
                <div className={`text-sm font-medium ${getColor()}`}>
                    {percentage}% Credibility
                </div>
                {evidenceCount > 0 && (
                    <div className="text-xs text-zinc-400">
                        {evidenceCount} evidence
                    </div>
                )}
            </div>
        </div>
    );
}
