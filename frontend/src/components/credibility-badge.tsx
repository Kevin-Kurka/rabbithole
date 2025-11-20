"use client";

import React, { useState } from 'react';
import { Award, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface CredibilityBadgeProps {
  score: number; // 0.0-1.0
  evidenceCount?: number;
  challengeCount?: number;
  variant?: 'compact' | 'full';
  onClick?: () => void;
}

/**
 * CredibilityBadge - Visual indicator for node credibility
 *
 * Tiers:
 * - Gold (🏆): >0.9 - Highly credible, well-sourced
 * - Silver (🥈): 0.7-0.9 - Credible, good sources
 * - Bronze (🥉): 0.5-0.7 - Moderately credible
 * - Yellow (⚠️): 0.3-0.5 - Low credibility, disputed
 * - Red (❌): <0.3 - Very low credibility, unreliable
 */
export function CredibilityBadge({
  score,
  evidenceCount = 0,
  challengeCount = 0,
  variant = 'compact',
  onClick
}: CredibilityBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Calculate tier based on score
  const getTier = (score: number) => {
    if (score >= 0.9) return 'gold';
    if (score >= 0.7) return 'silver';
    if (score >= 0.5) return 'bronze';
    if (score >= 0.3) return 'yellow';
    return 'red';
  };

  const tier = getTier(score);
  const percentage = Math.round(score * 100);

  // Tier-specific styling
  const tierStyles = {
    gold: {
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-400/40',
      text: 'text-yellow-300',
      icon: '🏆'
    },
    silver: {
      bg: 'bg-gray-400/20',
      border: 'border-gray-300/40',
      text: 'text-gray-200',
      icon: '🥈'
    },
    bronze: {
      bg: 'bg-orange-600/20',
      border: 'border-orange-500/40',
      text: 'text-orange-300',
      icon: '🥉'
    },
    yellow: {
      bg: 'bg-yellow-600/20',
      border: 'border-yellow-500/40',
      text: 'text-yellow-400',
      icon: '⚠️'
    },
    red: {
      bg: 'bg-red-600/20',
      border: 'border-red-500/40',
      text: 'text-red-400',
      icon: '❌'
    }
  };

  const style = tierStyles[tier];

  // Compact variant (for cards)
  if (variant === 'compact') {
    return (
      <div
        className="relative inline-flex items-center"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={onClick}
      >
        <div
          className={`flex items-center gap-1.5 px-2 py-1 ${style.bg} ${style.border} border rounded ${onClick ? 'cursor-pointer hover:opacity-80' : ''} transition-all`}
          style={{ borderWidth: '1px' }}
        >
          <span className="text-xs">{style.icon}</span>
          <span className={`text-xs font-semibold ${style.text}`}>
            {percentage}%
          </span>
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64">
            <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl p-3" style={{ borderWidth: '1px' }}>
              <div className="flex items-start gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-white mb-1">
                    Credibility Score: {percentage}%
                  </p>
                  <p className="text-xs text-zinc-400">
                    {tier === 'gold' && 'Highly credible with strong evidence'}
                    {tier === 'silver' && 'Credible with good supporting evidence'}
                    {tier === 'bronze' && 'Moderately credible, some verification needed'}
                    {tier === 'yellow' && 'Low credibility, disputed or lacking sources'}
                    {tier === 'red' && 'Very low credibility, unreliable sources'}
                  </p>
                </div>
              </div>

              {(evidenceCount > 0 || challengeCount > 0) && (
                <div className="pt-2 border-t border-white/10 space-y-1">
                  {evidenceCount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span>{evidenceCount} evidence item{evidenceCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {challengeCount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <AlertTriangle className="w-3 h-3 text-yellow-400" />
                      <span>{challengeCount} active challenge{challengeCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full variant (for headers)
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${style.bg} ${style.border} border rounded-lg ${onClick ? 'cursor-pointer hover:opacity-80' : ''} transition-all`}
      style={{ borderWidth: '1px' }}
      onClick={onClick}
    >
      <div className="text-2xl">{style.icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-lg font-bold ${style.text}`}>
            {percentage}%
          </span>
          <span className="text-sm text-zinc-400">Credibility</span>
        </div>
        <p className="text-xs text-zinc-400">
          {tier === 'gold' && 'Highly credible with strong evidence'}
          {tier === 'silver' && 'Credible with good supporting evidence'}
          {tier === 'bronze' && 'Moderately credible, some verification needed'}
          {tier === 'yellow' && 'Low credibility, disputed or lacking sources'}
          {tier === 'red' && 'Very low credibility, unreliable sources'}
        </p>
      </div>

      {(evidenceCount > 0 || challengeCount > 0) && (
        <div className="flex flex-col gap-1 text-xs text-zinc-400">
          {evidenceCount > 0 && (
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span>{evidenceCount} evidence</span>
            </div>
          )}
          {challengeCount > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
              <span>{challengeCount} challenges</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
