'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ScoreRingProps {
    score: number; // 0.0 - 1.0
    label: string; // "CRED" or "CONS"
    size?: 'sm' | 'md' | 'lg';
    showPercentage?: boolean;
    animate?: boolean;
}

export function ScoreRing({
    score,
    label,
    size = 'md',
    showPercentage = true,
    animate = true,
}: ScoreRingProps) {
    const [displayScore, setDisplayScore] = useState(0);

    // Animate score on mount
    useEffect(() => {
        if (animate) {
            const timer = setTimeout(() => setDisplayScore(score), 100);
            return () => clearTimeout(timer);
        } else {
            setDisplayScore(score);
        }
    }, [score, animate]);

    // Size configurations
    const sizes = {
        sm: { ring: 60, stroke: 6, text: 'text-sm', label: 'text-xs' },
        md: { ring: 80, stroke: 8, text: 'text-lg', label: 'text-sm' },
        lg: { ring: 120, stroke: 10, text: 'text-2xl', label: 'text-base' },
    };

    const config = sizes[size];
    const radius = (config.ring - config.stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (displayScore * circumference);

    // Color based on score
    const getColor = (score: number) => {
        if (score >= 0.8) return { from: '#10B981', to: '#34D399' }; // green
        if (score >= 0.5) return { from: '#F59E0B', to: '#FBBF24' }; // orange
        return { from: '#EF4444', to: '#F87171' }; // red
    };

    const colors = getColor(score);
    const percentage = Math.round(score * 100);

    return (
        <div className="flex flex-col items-center gap-1">
            <div className="relative" style={{ width: config.ring, height: config.ring }}>
                {/* Background ring */}
                <svg className="transform -rotate-90" width={config.ring} height={config.ring}>
                    <circle
                        cx={config.ring / 2}
                        cy={config.ring / 2}
                        r={radius}
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth={config.stroke}
                        fill="none"
                    />
                    {/* Animated progress ring */}
                    <motion.circle
                        cx={config.ring / 2}
                        cy={config.ring / 2}
                        r={radius}
                        stroke={`url(#gradient-${label})`}
                        strokeWidth={config.stroke}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                    {/* Gradient definition */}
                    <defs>
                        <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={colors.from} />
                            <stop offset="100%" stopColor={colors.to} />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                        className={`font-bold ${config.text}`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.3 }}
                    >
                        {showPercentage ? `${percentage}%` : score.toFixed(2)}
                    </motion.div>
                </div>
            </div>

            {/* Label */}
            <div className={`font-semibold text-gray-400 ${config.label} uppercase tracking-wider`}>
                {label}
            </div>
        </div>
    );
}

interface DualScoreRingsProps {
    credibility: number;
    consensus: number;
    size?: 'sm' | 'md' | 'lg';
    showBreakdown?: boolean;
}

export function DualScoreRings({
    credibility,
    consensus,
    size = 'md',
    showBreakdown = false,
}: DualScoreRingsProps) {
    return (
        <div className="flex items-center gap-4">
            <ScoreRing score={credibility} label="CRED" size={size} />
            <ScoreRing score={consensus} label="CONS" size={size} />
        </div>
    );
}
