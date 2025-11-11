/**
 * MobileHomePage Component
 *
 * Mobile-optimized home page with vertical feed layout.
 * Features: hero search, trending nodes, categories, activity feed.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { MobileLayout } from './MobileLayout';
import { MobileHeader } from './MobileHeader';
import { HeroSection } from './HeroSection';
import { FeaturedNodes, type FeaturedNode } from './FeaturedNodes';
import { CategoryGrid } from './CategoryGrid';
import { ActivityFeed, type ActivityItem } from './ActivityFeed';
import { FAB } from './FAB';
import { PullToRefresh } from './PullToRefresh';

export interface MobileHomePageProps {
  /** Initial featured nodes */
  featuredNodes?: FeaturedNode[];
  /** Initial activity items */
  activityItems?: ActivityItem[];
  /** User session data */
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

// Mock data for demo - replace with GraphQL queries
const MOCK_FEATURED_NODES: FeaturedNode[] = [
  {
    id: '1',
    title: 'JFK Assassination Evidence Analysis',
    type: 'Investigation',
    credibility: 85,
    preview: 'Comprehensive review of primary evidence...',
    created_at: '2024-01-15',
    author: 'Research Team',
  },
  {
    id: '2',
    title: 'Warren Commission Report',
    type: 'Evidence',
    credibility: 72,
    preview: 'Official government investigation findings...',
    created_at: '2024-01-10',
    author: 'Historical Archives',
  },
  {
    id: '3',
    title: 'Ballistics Expert Analysis',
    type: 'Research',
    credibility: 90,
    preview: 'Forensic examination of bullet trajectories...',
    created_at: '2024-01-08',
    author: 'Dr. Smith',
  },
];

const MOCK_ACTIVITY_ITEMS: ActivityItem[] = [
  {
    id: '4',
    title: 'Climate Change Research Compilation',
    type: 'Research',
    credibility: 92,
    preview: 'Latest peer-reviewed studies on global warming trends and impacts...',
    created_at: '2024-01-20',
    author: 'Climate Research Team',
  },
  {
    id: '5',
    title: 'Ancient Egyptian Hieroglyphics',
    type: 'Article',
    credibility: 88,
    preview: 'Decoding the symbolic language of ancient Egypt...',
    created_at: '2024-01-19',
    author: 'Dr. Johnson',
  },
  {
    id: '6',
    title: 'Quantum Computing Breakthrough',
    type: 'News',
    credibility: 95,
    preview: 'New algorithm achieves quantum supremacy milestone...',
    created_at: '2024-01-18',
    author: 'Tech News',
  },
  {
    id: '7',
    title: 'COVID-19 Vaccine Development Timeline',
    type: 'Investigation',
    credibility: 87,
    preview: 'Comprehensive analysis of vaccine development process...',
    created_at: '2024-01-17',
    author: 'Medical Research',
  },
  {
    id: '8',
    title: 'Mars Rover Discovery',
    type: 'News',
    credibility: 93,
    preview: 'New evidence of ancient water on Mars surface...',
    created_at: '2024-01-16',
    author: 'NASA',
  },
];

export const MobileHomePage: React.FC<MobileHomePageProps> = ({
  featuredNodes = MOCK_FEATURED_NODES,
  activityItems = MOCK_ACTIVITY_ITEMS,
  user,
}) => {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Handlers
  const handleSearch = useCallback((query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }, [router]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // TODO: Refresh data from GraphQL
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  }, []);

  const handleViewAllFeatured = useCallback(() => {
    router.push('/explore/trending');
  }, [router]);

  const handleViewAllActivity = useCallback(() => {
    router.push('/activity');
  }, [router]);

  const handleCreateNode = useCallback(() => {
    router.push('/nodes/create');
  }, [router]);

  const handleFavorite = useCallback((id: string) => {
    console.log('Favorite node:', id);
    // TODO: Implement favorite mutation
  }, []);

  const handleArchive = useCallback((id: string) => {
    console.log('Archive node:', id);
    // TODO: Implement archive mutation
  }, []);

  const handleDelete = useCallback((id: string) => {
    console.log('Delete node:', id);
    // TODO: Implement delete mutation
  }, []);

  return (
    <>
      {/* Mobile Header */}
      <MobileHeader
        user={user}
        onMenuToggle={() => setMenuOpen(!menuOpen)}
        isMenuOpen={menuOpen}
      />

      {/* Main Content with Pull-to-Refresh */}
      <PullToRefresh onRefresh={handleRefresh}>
        <MobileLayout showBottomNav={true} paddingBottom={true}>
          {/* Hero Section */}
          <HeroSection
            onSearch={handleSearch}
            placeholder="Explore the knowledge graph..."
            showLogo={true}
            animated={true}
          />

          {/* Featured/Trending Nodes */}
          <FeaturedNodes
            nodes={featuredNodes}
            title="Trending Now"
            onViewAll={handleViewAllFeatured}
            showViewAll={true}
          />

          {/* Category Grid */}
          <CategoryGrid
            title="Explore by Category"
            columns={2}
          />

          {/* Activity Feed */}
          <ActivityFeed
            items={activityItems}
            title="Recent Activity"
            loading={isRefreshing}
            hasMore={true}
            onViewAll={handleViewAllActivity}
            showViewAll={true}
            onFavorite={handleFavorite}
            onArchive={handleArchive}
            onDelete={handleDelete}
          />

          {/* Spacing for bottom nav */}
          <div className="h-8" />
        </MobileLayout>
      </PullToRefresh>

      {/* Floating Action Button */}
      <FAB
        icon={Plus}
        label="Create Node"
        onClick={handleCreateNode}
        position="bottom-right"
      />
    </>
  );
};

export default MobileHomePage;
