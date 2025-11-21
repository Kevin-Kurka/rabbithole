import React from 'react';
import { Lock } from 'lucide-react';
import { theme } from '../styles/theme';

export interface VeracityBadgeProps {
  score: number;
  isLevel0?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface VeracityColor {
  background: string;
  text: string;
  label: string;
}

const getVeracityColor = (score: number, isLevel0: boolean): VeracityColor => {
  if (isLevel0) {
    return {
      background: '#10b981',
      text: '#ffffff',
      label: 'Verified',
    };
  }

  if (score >= 0.7) {
    return {
      background: '#84cc16',
      text: '#000000',
      label: 'High Confidence',
    };
  }

  if (score >= 0.4) {
    return {
      background: '#eab308',
      text: '#000000',
      label: 'Medium Confidence',
    };
  }

  if (score >= 0.1) {
    return {
      background: '#f97316',
      text: '#ffffff',
      label: 'Low Confidence',
    };
  }

  return {
    background: '#ef4444',
    text: '#ffffff',
    label: 'Very Low Confidence',
  };
};

const sizeConfig = {
  sm: {
    container: 'h-5 px-1.5',
    text: 'text-xs',
    icon: 10,
    gap: 'gap-0.5',
  },
  md: {
    container: 'h-6 px-2',
    text: 'text-sm',
    icon: 12,
    gap: 'gap-1',
  },
  lg: {
    container: 'h-8 px-3',
    text: 'text-base',
    icon: 14,
    gap: 'gap-1.5',
  },
};

export const VeracityBadge: React.FC<VeracityBadgeProps> = ({
  score,
  isLevel0 = false,
  size = 'md',
}) => {
  const percentage = Math.round(score * 100);
  const colors = getVeracityColor(score, isLevel0);
  const config = sizeConfig[size];

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 ${config.container} ${config.gap}`}
      style={{
        backgroundColor: colors.background,
        color: colors.text,
      }}
      role="status"
      aria-label={`Veracity score: ${percentage}% - ${colors.label}`}
      title={colors.label}
    >
      {isLevel0 && <Lock size={config.icon} strokeWidth={2.5} />}
      <span className={config.text}>{percentage}%</span>
    </div>
  );
};

export default VeracityBadge;
