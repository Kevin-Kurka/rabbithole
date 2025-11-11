/**
 * HeroSection Component
 *
 * Mobile hero section with logo and search.
 * Sticky header that shrinks on scroll.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { mobileTheme } from '@/styles/mobileTheme';

export interface HeroSectionProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  showLogo?: boolean;
  animated?: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSearch,
  placeholder = 'Explore the knowledge graph...',
  showLogo = true,
  animated = true,
}) => {
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && onSearch) {
      onSearch(query.trim());
    }
  };

  return (
    <section
      className={`sticky top-0 z-20 bg-background border-b transition-all duration-200 ${
        scrolled ? 'shadow-md' : ''
      }`}
      style={{
        paddingTop: mobileTheme.spacing[4],
        paddingBottom: mobileTheme.spacing[4],
      }}
    >
      <div className="px-4">
        {/* Logo & Title */}
        {showLogo && (
          <div
            className={`flex items-center gap-3 mb-4 transition-all duration-200 ${
              scrolled ? 'scale-90 mb-2' : ''
            }`}
          >
            <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-full">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1
                className={`font-bold text-foreground transition-all duration-200 ${
                  scrolled ? 'text-xl' : 'text-2xl'
                }`}
              >
                Rabbit Hole
              </h1>
              <p
                className={`text-muted-foreground transition-all duration-200 ${
                  scrolled ? 'text-xs opacity-0 h-0' : 'text-sm'
                }`}
              >
                Knowledge Graph Explorer
              </p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full h-12 pl-11 pr-4 bg-muted rounded-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              style={{
                fontSize: mobileTheme.fontSize.base,
                minHeight: mobileTheme.touch.comfortable,
              }}
            />
          </div>
        </form>
      </div>
    </section>
  );
};

export default HeroSection;
