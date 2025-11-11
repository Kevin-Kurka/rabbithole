/**
 * CategoryGrid Component
 *
 * Grid of category cards for exploring different node types.
 * 2-column layout on mobile, adaptive for larger screens.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  Users,
  BookOpen,
  Target,
  MessageCircle,
  TrendingUp,
  LucideIcon,
} from 'lucide-react';
import { mobileTheme } from '@/styles/mobileTheme';

export interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  count?: number;
  href: string;
}

export interface CategoryGridProps {
  categories?: Category[];
  title?: string;
  columns?: number;
}

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'articles',
    label: 'Articles',
    icon: FileText,
    color: 'bg-blue-500',
    count: 142,
    href: '/explore/articles',
  },
  {
    id: 'investigations',
    label: 'Investigations',
    icon: Target,
    color: 'bg-purple-500',
    count: 28,
    href: '/explore/investigations',
  },
  {
    id: 'communities',
    label: 'Communities',
    icon: Users,
    color: 'bg-green-500',
    count: 15,
    href: '/explore/communities',
  },
  {
    id: 'discussions',
    label: 'Discussions',
    icon: MessageCircle,
    color: 'bg-orange-500',
    count: 89,
    href: '/explore/discussions',
  },
  {
    id: 'research',
    label: 'Research',
    icon: BookOpen,
    color: 'bg-indigo-500',
    count: 56,
    href: '/explore/research',
  },
  {
    id: 'trending',
    label: 'Trending',
    icon: TrendingUp,
    color: 'bg-pink-500',
    count: 34,
    href: '/explore/trending',
  },
];

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories = DEFAULT_CATEGORIES,
  title = 'Explore Categories',
  columns = 2,
}) => {
  return (
    <section className="py-4 px-4">
      {/* Section Header */}
      {title && (
        <h2 className="text-lg font-semibold text-foreground mb-3">{title}</h2>
      )}

      {/* Grid */}
      <div
        className={`grid gap-3`}
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {categories.map((category) => {
          const Icon = category.icon;

          return (
            <Link
              key={category.id}
              href={category.href}
              className="flex flex-col items-center justify-center p-4 bg-card border border-border rounded-lg hover:border-primary transition-all active:scale-95"
              style={{
                minHeight: mobileTheme.touch.large,
              }}
            >
              {/* Icon */}
              <div
                className={`flex items-center justify-center w-12 h-12 ${category.color} rounded-full mb-2`}
              >
                <Icon className="w-6 h-6 text-white" />
              </div>

              {/* Label */}
              <div className="text-sm font-medium text-foreground text-center">
                {category.label}
              </div>

              {/* Count */}
              {category.count !== undefined && (
                <div className="text-xs text-muted-foreground mt-1">
                  {category.count} items
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryGrid;
