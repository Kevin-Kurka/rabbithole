# Comprehensive UI/UX Plan: Mobile, Tablet & Web Versions

**Project Rabbit Hole - Cross-Device Strategy**
**Date**: 2025-01-10
**Status**: Awaiting Approval

---

## Executive Summary

Current state: **Desktop-first UI with minimal responsive design**
Target state: **Mobile-first, progressive enhancement for tablet/desktop**
Estimated effort: **3-4 weeks** (160-180 hours)
Impact: **Critical** - 70%+ of users access web apps on mobile devices

---

## 1. CURRENT STATE ANALYSIS

### 1.1 Pages Inventory

| Page | File | Current State | Mobile Issues | Priority |
|------|------|---------------|---------------|----------|
| Home (Landing) | `app/page.tsx` | ❌ Desktop-only | Fixed positioning, no touch, small tap targets | **CRITICAL** |
| Node Details | `app/nodes/[id]/page.tsx` | ⚠️ Partially responsive | Sidebar overlaps content, tabs too small | **HIGH** |
| Graph Canvas | VSCodeLayout | ❌ Desktop-only | Complex panels, no mobile nav | **CRITICAL** |

### 1.2 Component Analysis (147 TypeScript files)

#### **Category A: Desktop-Only (Requires Complete Rebuild)**
- ✗ **VSCodeLayout** - Complex 3-panel layout with resizable panels
  - Left panel: 250px fixed width
  - Right panel: 400px fixed width
  - Bottom panel: 200px fixed height
  - No mobile breakpoints, no touch gestures
  - **Impact**: Core navigation system unusable on mobile

- ✗ **Home Page Starfield Canvas** - Fixed positioning, mouse-only interactions
  - Node cards 224px wide (too large for mobile)
  - Drag-and-drop requires mouse
  - Bottom chat input covers 20% of mobile screen
  - **Impact**: Primary landing page completely broken on mobile

- ✗ **GraphCanvas & EnhancedGraphCanvas** - ReactFlow visualization
  - Pan/zoom requires mouse wheel
  - Node selection difficult with touch
  - Context menus positioned off-screen
  - **Impact**: Core feature (graph visualization) unusable

#### **Category B: Needs Major Adjustments**
- ⚠️ **ChallengePanel** - Complex form with Toulmin model fields
  - 400px+ width requirement
  - Multiple collapsible sections
  - Long text inputs
  - **Issue**: Requires vertical layout, simplified mobile form

- ⚠️ **ArticleViewer** - Article reading with annotation panel
  - Split-screen design (content + sidebar)
  - Annotation highlights too small for touch
  - Sidebar covers content on mobile
  - **Issue**: Needs bottom sheet for annotations on mobile

- ⚠️ **ChallengeCard** - Information-dense challenge display
  - Fixed 350px+ width
  - Small action buttons (< 44px)
  - Inline metadata
  - **Issue**: Needs card expansion, larger touch targets

#### **Category C: Minor Adjustments Needed**
- ✓ **Navigation** - Top nav bar (mostly responsive)
  - Has `sm:inline` breakpoints
  - **Issue**: Needs hamburger menu for < 768px

- ✓ **Button, Card, Dialog** (Radix UI components)
  - Already responsive
  - **Issue**: Touch target sizes need verification (44px minimum)

#### **Category D: Mobile-Ready**
- ✓ **Toast notifications**
- ✓ **ErrorBoundary**
- ✓ **ThemeProvider**
- ✓ **LoginDialog**

### 1.3 Critical Issues Summary

| Issue | Severity | Affected Components | Impact |
|-------|----------|-------------------|---------|
| Fixed pixel layouts | 🔴 CRITICAL | VSCodeLayout, Home, GraphCanvas | Complete mobile failure |
| Small touch targets (<44px) | 🔴 CRITICAL | All buttons, node cards, links | Usability failure |
| Mouse-only interactions | 🔴 CRITICAL | Drag-drop, context menus, zoom | Core features broken |
| Off-canvas content | 🟠 HIGH | Panels, sidebars, modals | Content inaccessible |
| Text too small | 🟠 HIGH | Node cards, annotations, metadata | Readability issues |
| No mobile navigation | 🟠 HIGH | VSCodeLayout | Can't access features |
| Responsive images missing | 🟡 MEDIUM | ArticleViewer, node details | Performance + UX |

---

## 2. DEVICE STRATEGY

### 2.1 Breakpoint System

```typescript
const breakpoints = {
  // Mobile-first approach
  mobile: {
    min: 0,
    max: 767,
    width: '100%',
    type: 'touch-primary'
  },
  tablet: {
    min: 768,
    max: 1023,
    width: '768px - 1023px',
    type: 'touch-hybrid' // Can use mouse or touch
  },
  desktop: {
    min: 1024,
    max: Infinity,
    width: '1024px+',
    type: 'mouse-primary'
  },

  // Special cases
  mobileLandscape: {
    query: '(max-height: 500px) and (orientation: landscape)',
    adaptations: 'Reduce header/footer, expand content'
  },
  tabletLandscape: {
    query: '(min-width: 768px) and (orientation: landscape)',
    adaptations: 'Show sidebar, use desktop features'
  }
};
```

### 2.2 Device-Specific Layouts

#### **Mobile (0-767px)**

**Layout Philosophy**: Single-column, stacked, bottom-sheet modals

**Navigation Pattern**:
```
┌─────────────────────┐
│ Header (56px)       │ ← Hamburger menu, logo, avatar
├─────────────────────┤
│                     │
│   Main Content      │ ← Full width, scrollable
│   (100vw)           │
│                     │
├─────────────────────┤
│ Bottom Nav (60px)   │ ← 4-5 primary actions
└─────────────────────┘
```

**Key Adaptations**:
- **Home Page**: Vertical scrolling list instead of canvas
- **Graph View**: Simplified tree/list view with expand-on-tap
- **Challenge Form**: Wizard-style multi-step form
- **Article View**: Full-screen reading, swipe-up for annotations
- **Navigation**: Hamburger menu + bottom nav bar

**Touch Interactions**:
- Minimum touch target: **48x48px** (iOS), **44x44px** (Android)
- Swipe gestures: Left/right for navigation, up for sheets
- Long-press: Context menus
- Pull-to-refresh: All list views

#### **Tablet (768-1023px)**

**Layout Philosophy**: Hybrid (mobile features + desktop previews)

**Navigation Pattern** (Portrait):
```
┌─────────────────────────────┐
│ Header (64px)               │ ← Full nav menu visible
├──────────┬──────────────────┤
│ Sidebar  │  Main Content    │ ← 250px sidebar + fluid content
│ (250px)  │  (fluid)         │
│          │                  │
└──────────┴──────────────────┘
```

**Navigation Pattern** (Landscape):
```
┌──────────┬───────────────────┬──────────┐
│ Sidebar  │  Main Content     │ Details  │
│ (200px)  │  (fluid)          │ (280px)  │ ← 3-column like desktop
│          │                   │          │
└──────────┴───────────────────┴──────────┘
```

**Key Adaptations**:
- **Home Page**: 2-column grid of node cards
- **Graph View**: Simplified ReactFlow with touch controls
- **Challenge Form**: 2-column layout for long forms
- **Article View**: Split-screen (60% content, 40% annotations)
- **Navigation**: Persistent sidebar (collapsible)

**Interaction Mix**:
- Support both touch and mouse
- Larger touch targets (48x48px minimum)
- Hover states available but not required
- Keyboard shortcuts optional

#### **Desktop (1024px+)**

**Layout Philosophy**: Multi-panel, information-dense, power user

**Navigation Pattern**:
```
┌─────────────────────────────────────────────────────┐
│ Menu Bar (40px)                                     │
├──────┬──────────────────────────────────┬──────────┤
│ Left │         Main Canvas              │  Right   │
│ Nav  │         (fluid)                  │  Panel   │
│(48px)│                                  │ (400px)  │
│      │                                  │          │
│      ├──────────────────────────────────┤          │
│      │  Bottom Panel (200px)            │          │
├──────┴──────────────────────────────────┴──────────┤
│ Status Bar (24px)                                   │
└─────────────────────────────────────────────────────┘
```

**Key Features** (Desktop-only):
- VSCodeLayout with resizable panels
- Full ReactFlow graph canvas with all controls
- Multi-tab workflows
- Keyboard shortcuts for power users
- Real-time collaboration cursors

---

## 3. IMPLEMENTATION PLAN

### Phase 1: Foundation (Week 1)

#### **1.1 Design System Mobile Tokens**
**File**: `frontend/src/styles/mobileTheme.ts`

```typescript
export const mobileTheme = {
  // Touch target sizes (WCAG 2.5.5)
  touch: {
    minimum: '44px',      // Minimum for primary actions
    comfortable: '48px',  // Recommended for frequently used
    large: '56px',        // For critical actions
  },

  // Typography scale (mobile-optimized)
  fontSize: {
    xs: '0.75rem',   // 12px - Labels, metadata
    sm: '0.875rem',  // 14px - Body text
    base: '1rem',    // 16px - Primary body (no zoom on iOS)
    lg: '1.125rem',  // 18px - Subheadings
    xl: '1.25rem',   // 20px - Headings
    '2xl': '1.5rem', // 24px - Page titles
  },

  // Spacing scale (8px base)
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
  },

  // Safe areas (iOS notch, Android gesture bar)
  safe: {
    top: 'env(safe-area-inset-top)',
    bottom: 'env(safe-area-inset-bottom)',
    left: 'env(safe-area-inset-left)',
    right: 'env(safe-area-inset-right)',
  },

  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1010,
    bottomSheet: 1020,
    modal: 1030,
    toast: 1040,
  },
};
```

#### **1.2 Responsive Hooks**
**File**: `frontend/src/hooks/useResponsive.ts`

```typescript
export const useResponsive = () => {
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [touchEnabled, setTouchEnabled] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      if (width < 768) setDevice('mobile');
      else if (width < 1024) setDevice('tablet');
      else setDevice('desktop');

      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
      setTouchEnabled('ontouchstart' in window);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return { device, orientation, touchEnabled, isMobile: device === 'mobile' };
};
```

#### **1.3 Mobile-First Components Base**
**Files**: Create mobile versions of core UI components

- `frontend/src/components/mobile/BottomSheet.tsx` - Swipe-up modal
- `frontend/src/components/mobile/BottomNavigation.tsx` - 5-icon nav bar
- `frontend/src/components/mobile/HamburgerMenu.tsx` - Drawer navigation
- `frontend/src/components/mobile/SwipeableCard.tsx` - Swipe gestures
- `frontend/src/components/mobile/PullToRefresh.tsx` - Refresh gesture

**Time**: 3 days (24 hours)

---

### Phase 2: Home Page Redesign (Week 1-2)

#### **2.1 Mobile Home Page**
**File**: `frontend/src/app/(mobile)/page.tsx`

**Layout**:
```tsx
<MobileLayout>
  {/* Hero Section */}
  <HeroSection>
    <Logo />
    <SearchBar placeholder="Explore the knowledge graph..." />
  </HeroSection>

  {/* Featured Nodes (Horizontal Scroll) */}
  <FeaturedNodes>
    {nodes.map(node => (
      <NodeCard key={node.id} {...node} size="compact" />
    ))}
  </FeaturedNodes>

  {/* Categories */}
  <CategoryGrid>
    <CategoryCard icon="investigation" label="Investigations" />
    <CategoryCard icon="evidence" label="Evidence" />
    <CategoryCard icon="person" label="People" />
    <CategoryCard icon="document" label="Documents" />
  </CategoryGrid>

  {/* Recent Activity Feed */}
  <ActivityFeed>
    {activities.map(activity => (
      <ActivityItem key={activity.id} {...activity} />
    ))}
  </ActivityFeed>

  {/* Bottom Navigation */}
  <BottomNav>
    <NavItem icon="home" label="Home" active />
    <NavItem icon="search" label="Search" />
    <NavItem icon="graph" label="Graph" />
    <NavItem icon="challenges" label="Inquiries" />
    <NavItem icon="profile" label="Profile" />
  </BottomNav>
</MobileLayout>
```

**Key Changes**:
- ❌ Remove starfield canvas (performance on mobile)
- ✅ Add vertical scrolling feed
- ✅ Add horizontal scrollable featured nodes
- ✅ Add bottom navigation bar
- ✅ Improve search to full-screen modal

#### **2.2 Tablet Home Page**
**File**: `frontend/src/app/(tablet)/page.tsx`

**Layout**: 2-column grid + simplified canvas background

#### **2.3 Desktop Home Page**
**File**: Keep existing `frontend/src/app/page.tsx` with improvements:
- Add accessibility (ARIA labels, keyboard nav)
- Improve touch target sizes for trackpads
- Add loading states

**Time**: 4 days (32 hours)

---

### Phase 3: Navigation System (Week 2)

#### **3.1 Adaptive Navigation Component**
**File**: `frontend/src/components/navigation/AdaptiveNav.tsx`

```tsx
export const AdaptiveNav = () => {
  const { device } = useResponsive();

  if (device === 'mobile') {
    return (
      <>
        <MobileHeader />
        <BottomNavigation />
        <HamburgerMenu />
      </>
    );
  }

  if (device === 'tablet') {
    return (
      <>
        <TabletHeader />
        <CollapsibleSidebar />
      </>
    );
  }

  return <DesktopNavigation />;
};
```

**Components**:
- **MobileHeader**: 56px fixed header (hamburger, logo, avatar)
- **BottomNavigation**: 60px fixed bottom bar (5 primary actions)
- **HamburgerMenu**: Slide-in drawer (280px width)
- **TabletHeader**: 64px header (full menu visible)
- **CollapsibleSidebar**: 200-250px sidebar (toggleable)
- **DesktopNavigation**: Existing VSCodeLayout

#### **3.2 Mobile Menu Structure**

```
Hamburger Menu:
├─ Home
├─ Explore
│  ├─ Investigations
│  ├─ Evidence
│  ├─ People
│  └─ Documents
├─ My Graphs
├─ Challenges
│  ├─ Open Inquiries
│  ├─ My Challenges
│  └─ Voting Queue
├─ Activity
├─ Settings
└─ Help

Bottom Navigation:
├─ Home (House icon)
├─ Search (Magnifying glass)
├─ Graph (Network icon)
├─ Challenges (Scale icon)
└─ Profile (User icon)
```

**Time**: 3 days (24 hours)

---

### Phase 4: Graph Visualization (Week 2-3)

#### **4.1 Mobile Graph View**
**File**: `frontend/src/components/graph/MobileGraphView.tsx`

**Option 1: List View (Default)**
```tsx
<GraphListView>
  {nodes.map(node => (
    <ExpandableNodeCard
      key={node.id}
      node={node}
      onExpand={() => showConnections(node.id)}
    />
  ))}
</GraphListView>
```

**Option 2: Simplified Canvas (Advanced)**
```tsx
<MobileGraphCanvas
  nodes={nodes}
  edges={edges}
  renderMode="simple" // Fewer details, larger nodes
  gestures={{
    pinchZoom: true,
    swipePan: true,
    doubleTapSelect: true,
  }}
/>
```

**Key Features**:
- Tree view toggle (hierarchical display)
- Minimap for orientation
- Floating action button (FAB) for adding nodes
- Full-screen mode
- Touch-optimized controls (zoom, pan, select)

#### **4.2 Tablet Graph View**
**File**: `frontend/src/components/graph/TabletGraphView.tsx`

**Layout**: Simplified ReactFlow with touch controls
- 60% canvas, 40% details panel
- Touch-friendly zoom controls
- Gesture support (pinch, pan, rotate)

#### **4.3 Desktop Graph View**
**File**: Keep existing with improvements
- Add touch support for trackpads
- Improve accessibility (keyboard navigation)
- Add minimap toggle

**Time**: 5 days (40 hours)

---

### Phase 5: Node Details Page (Week 3)

#### **5.1 Mobile Article Viewer**
**File**: `frontend/src/components/article/MobileArticleViewer.tsx`

**Layout**:
```tsx
<MobileArticleLayout>
  {/* Fixed Header */}
  <ArticleHeader>
    <BackButton />
    <Title>{title}</Title>
    <CredibilityBadge score={credibility} />
    <ShareButton />
  </ArticleHeader>

  {/* Scrollable Content */}
  <ArticleContent>
    <HighlightedText
      content={content}
      annotations={annotations}
      onAnnotationTap={showBottomSheet}
    />
  </ArticleContent>

  {/* Floating Action Button */}
  <FAB
    actions={[
      { icon: 'comment', label: 'Comment' },
      { icon: 'challenge', label: 'Challenge' },
      { icon: 'share', label: 'Share' },
    ]}
  />

  {/* Swipe-Up Bottom Sheet */}
  <BottomSheet isOpen={showAnnotations}>
    <AnnotationList annotations={annotations} />
    <VotingControls />
  </BottomSheet>
</MobileArticleLayout>
```

**Key Changes**:
- ❌ Remove sidebar (use bottom sheet instead)
- ✅ Full-screen reading mode
- ✅ Larger annotation highlights (48px min)
- ✅ Swipe-up for annotation details
- ✅ Floating action button for actions

#### **5.2 Mobile Challenge Form**
**File**: `frontend/src/components/challenge/MobileChallengeForm.tsx`

**Multi-Step Wizard**:
```
Step 1: Challenge Type
  ├─ Node Challenge
  └─ Edge Challenge

Step 2: Toulmin Model
  ├─ Claim (What are you challenging?)
  ├─ Grounds (What evidence supports this?)
  └─ Warrant (Why does this evidence matter?)

Step 3: Evidence
  ├─ Upload documents
  ├─ Add links
  └─ Add citations

Step 4: Review & Submit
  ├─ Summary preview
  └─ Confidence level
```

**Features**:
- Progress indicator (1 of 4)
- Save as draft
- Large input fields (min 56px height)
- Auto-save on field blur

#### **5.3 Tablet/Desktop Article Viewer**
**File**: Keep existing with improvements
- Add mobile touch targets
- Improve annotation hover states
- Add keyboard shortcuts

**Time**: 4 days (32 hours)

---

### Phase 6: Touch Interactions & Gestures (Week 3-4)

#### **6.1 Gesture Library**
**File**: `frontend/src/utils/gestures.ts`

```typescript
export const useGestures = (ref: RefObject<HTMLElement>) => {
  const [gesture, setGesture] = useState<GestureState>({
    type: null,
    startX: 0,
    startY: 0,
    deltaX: 0,
    deltaY: 0,
    scale: 1,
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Swipe detection
    const handleSwipe = (direction: 'left' | 'right' | 'up' | 'down') => {
      // Trigger navigation, sheet, etc.
    };

    // Pinch zoom detection
    const handlePinch = (scale: number) => {
      // Trigger zoom
    };

    // Long press detection
    const handleLongPress = () => {
      // Show context menu
    };

    // Add touch listeners
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref]);

  return gesture;
};
```

#### **6.2 Touch-Optimized Components**

**All Interactive Elements**:
- Minimum size: 44x44px (iOS), 48x48px (Android)
- Padding: 12px minimum around tap targets
- Feedback: Visual feedback within 100ms (ripple, highlight)
- Debounce: Prevent double-tap on actions (300ms)

**Specific Components**:
- **Buttons**: 48px height, full-width on mobile
- **Cards**: 56px minimum height, 16px padding
- **Links**: 44px height for list items
- **Icons**: 24x24px icons in 48x48px touch area
- **Checkboxes/Radio**: 24x24px input in 48x48px area

**Time**: 3 days (24 hours)

---

### Phase 7: Performance Optimization (Week 4)

#### **7.1 Mobile Performance**

**Image Optimization**:
```tsx
<Image
  src={src}
  alt={alt}
  width={width}
  height={height}
  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
  loading="lazy"
  placeholder="blur"
/>
```

**Code Splitting**:
```typescript
// Load desktop features only on desktop
const DesktopFeatures = dynamic(() => import('@/components/desktop/DesktopFeatures'), {
  ssr: false,
  loading: () => <Skeleton />,
});

// Conditional loading
{device === 'desktop' && <DesktopFeatures />}
```

**Virtualization**:
```tsx
// Use react-window for long lists on mobile
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={window.innerHeight - 116} // Full screen minus header/bottom nav
  itemCount={nodes.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <NodeCard node={nodes[index]} style={style} />
  )}
</FixedSizeList>
```

**Metrics to Target**:
- First Contentful Paint (FCP): < 1.8s on 3G
- Largest Contentful Paint (LCP): < 2.5s on 3G
- Time to Interactive (TTI): < 3.8s on 3G
- Cumulative Layout Shift (CLS): < 0.1
- First Input Delay (FID): < 100ms

#### **7.2 Bundle Size Optimization**

**Current Issues**:
- ReactFlow: ~450KB (consider react-digraph alternative)
- Apollo Client: ~130KB (necessary)
- Next.js: ~85KB (necessary)
- Radix UI: ~80KB total (tree-shakeable)

**Optimizations**:
1. **Remove unused components**: Target 30% reduction
2. **Dynamic imports**: Load mobile/tablet/desktop separately
3. **Tree-shaking**: Configure Tailwind purge properly
4. **Font optimization**: Use system fonts on mobile

**Target Bundle Sizes**:
- Mobile: < 150KB gzipped
- Tablet: < 200KB gzipped
- Desktop: < 300KB gzipped

**Time**: 3 days (24 hours)

---

### Phase 8: Testing & Polish (Week 4)

#### **8.1 Device Testing Matrix**

| Device | OS | Browser | Resolution | Test Coverage |
|--------|----|---------| -----------|---------------|
| iPhone SE | iOS 16 | Safari | 375x667 | ✓ Home, Article, Graph |
| iPhone 14 Pro | iOS 17 | Safari | 393x852 | ✓ All features |
| iPhone 14 Pro Max | iOS 17 | Safari | 430x932 | ✓ All features |
| Samsung Galaxy S21 | Android 13 | Chrome | 360x800 | ✓ All features |
| Samsung Galaxy Tab | Android 12 | Chrome | 800x1280 | ✓ Tablet layout |
| iPad Air | iOS 16 | Safari | 820x1180 | ✓ Tablet layout |
| iPad Pro 12.9" | iOS 17 | Safari | 1024x1366 | ✓ Desktop features |
| Desktop | Windows | Chrome | 1920x1080 | ✓ Full regression |
| Desktop | macOS | Safari | 1440x900 | ✓ Full regression |

#### **8.2 Accessibility Testing**

**WCAG 2.1 Level AA Compliance**:
- ✓ Color contrast ratios (4.5:1 for text, 3:1 for UI)
- ✓ Keyboard navigation (tab order, focus indicators)
- ✓ Screen reader support (ARIA labels, roles, live regions)
- ✓ Touch target sizes (44x44px minimum)
- ✓ Motion preferences (respect prefers-reduced-motion)
- ✓ Text scaling (up to 200% without breaking layout)

**Tools**:
- Lighthouse (mobile/desktop audits)
- axe DevTools (automated accessibility)
- WAVE (visual accessibility testing)
- VoiceOver (iOS screen reader)
- TalkBack (Android screen reader)

#### **8.3 Performance Testing**

**Network Conditions**:
- Fast 3G (1.6 Mbps down, 750 Kbps up, 562ms RTT)
- Slow 3G (400 Kbps down, 400 Kbps up, 2000ms RTT)
- 4G (9 Mbps down, 9 Mbps up, 170ms RTT)
- WiFi (30+ Mbps)

**Metrics to Monitor**:
- Page load time
- Time to interactive
- Bundle size
- Memory usage
- Battery impact

**Time**: 3 days (24 hours)

---

## 4. FILE STRUCTURE

### New Directory Organization

```
frontend/src/
├── app/
│   ├── (mobile)/           # Mobile-specific pages
│   │   ├── page.tsx        # Mobile home
│   │   ├── graph/
│   │   │   └── page.tsx    # Mobile graph view
│   │   └── nodes/
│   │       └── [id]/
│   │           └── page.tsx # Mobile article
│   ├── (tablet)/           # Tablet-specific pages
│   │   ├── page.tsx
│   │   └── ...
│   ├── (desktop)/          # Desktop-specific pages
│   │   ├── page.tsx
│   │   └── ...
│   └── page.tsx            # Adaptive entry point
│
├── components/
│   ├── mobile/             # Mobile-only components
│   │   ├── BottomSheet.tsx
│   │   ├── BottomNavigation.tsx
│   │   ├── HamburgerMenu.tsx
│   │   ├── MobileHeader.tsx
│   │   ├── SwipeableCard.tsx
│   │   ├── PullToRefresh.tsx
│   │   └── FAB.tsx
│   ├── tablet/             # Tablet-specific components
│   │   ├── TabletSidebar.tsx
│   │   └── SplitView.tsx
│   ├── desktop/            # Desktop-only components
│   │   └── (existing VSCodeLayout)
│   ├── adaptive/           # Responsive components
│   │   ├── AdaptiveNav.tsx
│   │   ├── AdaptiveLayout.tsx
│   │   ├── ResponsiveCard.tsx
│   │   └── AdaptiveGraph.tsx
│   └── (existing components)
│
├── hooks/
│   ├── useResponsive.ts    # Device detection
│   ├── useGestures.ts      # Touch gestures
│   ├── useBottomSheet.ts   # Bottom sheet control
│   └── useVirtualList.ts   # Performance for lists
│
├── styles/
│   ├── mobileTheme.ts      # Mobile design tokens
│   ├── tabletTheme.ts      # Tablet design tokens
│   ├── desktopTheme.ts     # Desktop design tokens
│   └── breakpoints.ts      # Responsive breakpoints
│
└── utils/
    ├── gestures.ts         # Gesture utilities
    ├── performance.ts      # Performance monitoring
    └── viewport.ts         # Viewport utilities
```

---

## 5. DESIGN SPECIFICATIONS

### 5.1 Mobile Design Patterns

#### **Navigation Patterns**
```
Header (56px fixed)
├─ [☰] Hamburger
├─ Logo (center)
└─ [👤] Avatar

Bottom Nav (60px fixed)
├─ [🏠] Home
├─ [🔍] Search
├─ [🕸] Graph
├─ [⚖️] Challenges
└─ [👤] Profile
```

#### **Content Patterns**
- **List**: Vertical scrolling, pull-to-refresh
- **Cards**: 16px padding, 12px radius, shadow-sm
- **Forms**: Full-width inputs, 56px height, 16px padding
- **Buttons**: Full-width primary, 48px height
- **Bottom Sheets**: Swipe-up, 40% initial height, 90% max

#### **Typography Scale**
```css
h1: 24px/1.2 (page titles)
h2: 20px/1.3 (section headings)
h3: 18px/1.4 (subsection headings)
body: 16px/1.5 (primary text)
caption: 14px/1.4 (metadata, labels)
small: 12px/1.4 (legal, timestamps)
```

### 5.2 Tablet Design Patterns

#### **Navigation Patterns** (Portrait)
```
Header (64px fixed)
├─ Logo
├─ Nav Menu (inline)
└─ Avatar

Sidebar (250px collapsible)
└─ Full navigation tree
```

#### **Content Patterns**
- **Split View**: 60% content / 40% details
- **Grid**: 2-column for cards, 3-column for icons
- **Floating Panels**: Draggable, resizable (like iPad apps)

### 5.3 Interaction Specifications

#### **Touch Targets**
```
Minimum: 44x44px (iOS), 48x48px (Android)
Comfortable: 48x48px
Large: 56x56px (primary actions)
Spacing: 8px between adjacent targets
```

#### **Gestures**
```
Tap: Select, activate
Double Tap: Zoom, expand
Long Press: Context menu (500ms)
Swipe Left/Right: Navigate, delete
Swipe Up: Show bottom sheet
Swipe Down: Dismiss, refresh
Pinch: Zoom in/out
Rotate: Rotate canvas (advanced)
```

#### **Animations**
```
Fast: 150ms (hover, ripple)
Medium: 250ms (page transitions)
Slow: 350ms (complex animations)
Spring: cubic-bezier(0.34, 1.56, 0.64, 1)
```

---

## 6. TECHNICAL IMPLEMENTATION

### 6.1 Responsive Layout System

**Next.js Middleware for Device Detection**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = /iPhone|iPad|Android/i.test(userAgent);
  const isTablet = /iPad|Android.*tablet/i.test(userAgent);

  const url = request.nextUrl.clone();

  // Route to device-specific pages
  if (isMobile && !url.pathname.startsWith('/(mobile)')) {
    url.pathname = `/(mobile)${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  if (isTablet && !url.pathname.startsWith('/(tablet)')) {
    url.pathname = `/(tablet)${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
```

**CSS Breakpoints**
```typescript
// tailwind.config.ts
export default {
  theme: {
    screens: {
      'xs': '0px',
      'sm': '640px',
      'md': '768px',   // Tablet start
      'lg': '1024px',  // Desktop start
      'xl': '1280px',
      '2xl': '1536px',
    },
  },
};
```

### 6.2 GraphQL Query Optimization

**Mobile-Specific Fragments**
```graphql
# Mobile: Minimal data
fragment MobileNode on Node {
  id
  title
  type
  credibility
}

# Tablet: Moderate data
fragment TabletNode on Node {
  id
  title
  type
  credibility
  content(maxLength: 200)
  connections {
    id
    title
  }
}

# Desktop: Full data
fragment DesktopNode on Node {
  id
  title
  type
  credibility
  content
  metadata
  connections {
    ...FullConnection
  }
}
```

### 6.3 Progressive Enhancement

**Feature Detection**
```typescript
const features = {
  touch: 'ontouchstart' in window,
  mouse: window.matchMedia('(pointer: fine)').matches,
  hover: window.matchMedia('(hover: hover)').matches,
  orientation: screen.orientation?.type || 'unknown',
  pwa: window.matchMedia('(display-mode: standalone)').matches,
};

// Load features conditionally
if (features.touch) {
  import('@/utils/gestures');
}

if (!features.mouse) {
  // Disable features that require precise pointer
  disableFeatures(['contextMenu', 'dragAndDrop']);
}
```

---

## 7. MIGRATION STRATEGY

### 7.1 Rollout Plan

**Phase 1: Parallel Development** (Week 1-2)
- Build mobile components alongside existing desktop
- No breaking changes to desktop UI
- Feature flag: `ENABLE_MOBILE=false` by default

**Phase 2: Beta Testing** (Week 3)
- Enable mobile UI for beta users
- Collect feedback via in-app surveys
- Monitor analytics (bounce rate, session duration)

**Phase 3: Gradual Rollout** (Week 4)
- 10% of mobile users → Monitor 24h
- 50% of mobile users → Monitor 48h
- 100% of mobile users → Monitor 1 week

**Phase 4: Desktop Migration** (Week 5-6)
- Migrate desktop users to responsive components
- Maintain VSCodeLayout as optional "power user mode"

### 7.2 Backward Compatibility

**Keep Desktop Features**
- VSCodeLayout available via toggle: "Use Classic Layout"
- Keyboard shortcuts preserved
- Advanced features accessible via menu

**Graceful Degradation**
- Mobile users can access desktop view (with warning)
- Tablet users can use mobile view (simplified option)
- Desktop users can preview mobile view (developer tools)

### 7.3 Analytics & Monitoring

**Key Metrics**
```typescript
trackEvent('page_view', {
  device: 'mobile' | 'tablet' | 'desktop',
  viewport: { width, height },
  connection: navigator.connection?.effectiveType,
  orientation: screen.orientation?.type,
});

trackPerformance({
  fcp: performance.getEntriesByName('first-contentful-paint')[0],
  lcp: performance.getEntriesByName('largest-contentful-paint')[0],
  fid: performance.getEntriesByName('first-input')[0],
  cls: cumulativeLayoutShift,
});

trackEngagement({
  session_duration: sessionTime,
  pages_per_session: pageCount,
  bounce_rate: bounced,
  feature_usage: usedFeatures,
});
```

---

## 8. RISKS & MITIGATION

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Scope Creep** | 🟠 HIGH | 🔴 CRITICAL | Strict feature prioritization, weekly reviews |
| **Performance Degradation** | 🟡 MEDIUM | 🟠 HIGH | Performance budgets, continuous monitoring |
| **Accessibility Failures** | 🟡 MEDIUM | 🟠 HIGH | Automated testing, manual audits, user testing |
| **Device Fragmentation** | 🟡 MEDIUM | 🟡 MEDIUM | Test on 10+ devices, use BrowserStack |
| **Touch Gesture Conflicts** | 🟢 LOW | 🟡 MEDIUM | Clear gesture documentation, user onboarding |
| **GraphQL Over-fetching** | 🟡 MEDIUM | 🟠 HIGH | Device-specific fragments, pagination |
| **Bundle Size Explosion** | 🟠 HIGH | 🟠 HIGH | Code splitting, dynamic imports, tree-shaking |

---

## 9. SUCCESS CRITERIA

### 9.1 Quantitative Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Mobile Bounce Rate | N/A (broken) | < 40% | Google Analytics |
| Mobile Session Duration | N/A | > 3 minutes | Google Analytics |
| Mobile Conversion | N/A | > 2% | Custom events |
| Lighthouse Mobile Score | 20-30 | > 90 | Lighthouse CI |
| Core Web Vitals (Mobile) | Fail | Pass | Chrome UX Report |
| Touch Target Coverage | ~30% | > 95% | Accessibility audit |
| Mobile Users | 0% (unusable) | 60%+ | Analytics |

### 9.2 Qualitative Metrics

**User Satisfaction**
- In-app survey: "How easy was it to use this on mobile?" > 4/5
- App store rating (if PWA): > 4.5/5
- Support tickets: < 5% related to mobile usability

**Feature Parity**
- Mobile users can complete 95% of workflows
- Tablet users can access 100% of features
- Desktop experience not degraded

**Performance**
- Mobile site loads in < 3s on 3G
- No layout shifts during page load
- Smooth 60fps animations

---

## 10. TIMELINE & RESOURCES

### 10.1 Detailed Timeline

| Week | Phase | Tasks | Hours | Deliverables |
|------|-------|-------|-------|--------------|
| **Week 1** | Foundation | Design tokens, hooks, base components | 56h | Mobile design system, responsive hooks |
| **Week 1-2** | Home Page | Mobile/tablet/desktop home redesign | 32h | 3 home page variants |
| **Week 2** | Navigation | Adaptive nav, hamburger, bottom nav | 24h | Complete navigation system |
| **Week 2-3** | Graph View | Mobile list/canvas, tablet simplified | 40h | 3 graph view variants |
| **Week 3** | Node Details | Mobile article, challenge form | 32h | Mobile-optimized article viewer |
| **Week 3-4** | Touch & Gestures | Gesture library, touch targets | 24h | Touch interaction system |
| **Week 4** | Performance | Optimization, code splitting, images | 24h | Performance targets met |
| **Week 4** | Testing | Device testing, accessibility, QA | 24h | Test reports, bug fixes |
| **Total** | | | **256h** | Production-ready mobile UI |

**Breakdown by Role**:
- Frontend Developer: 180 hours
- UI/UX Designer: 40 hours
- QA Engineer: 36 hours

### 10.2 Resource Requirements

**Team**
- 1 Senior Frontend Developer (React/Next.js expert)
- 1 UI/UX Designer (mobile-first experience)
- 1 QA Engineer (mobile testing experience)

**Tools & Services**
- Figma (design mockups)
- BrowserStack (device testing)
- Lighthouse CI (performance monitoring)
- Sentry (error tracking)
- Google Analytics (usage metrics)

**Budget Estimate**
- Development: $18,000 - $22,000 (180h @ $100-120/h)
- Design: $3,200 - $4,000 (40h @ $80-100/h)
- QA: $2,160 - $2,880 (36h @ $60-80/h)
- Tools: $500/month (BrowserStack, monitoring)
- **Total**: $23,860 - $29,380

---

## 11. POST-LAUNCH

### 11.1 Monitoring Dashboard

**Weekly Reports**
```typescript
const mobileMetrics = {
  devices: {
    mobile: { users, sessions, bounceRate, avgDuration },
    tablet: { users, sessions, bounceRate, avgDuration },
    desktop: { users, sessions, bounceRate, avgDuration },
  },
  performance: {
    mobile: { fcp, lcp, fid, cls },
    tablet: { fcp, lcp, fid, cls },
  },
  features: {
    graphView: { mobile: usageRate, tablet: usageRate },
    challenges: { mobile: usageRate, tablet: usageRate },
    articles: { mobile: usageRate, tablet: usageRate },
  },
  issues: {
    errors: topErrors,
    slowPages: slowestPages,
    failedRequests: failedAPIs,
  },
};
```

### 11.2 Continuous Improvement

**Monthly Reviews**
- Analyze usage patterns
- Identify underused features
- Collect user feedback
- Prioritize improvements

**Quarterly Updates**
- New device support (new iPhones, Android releases)
- OS updates (iOS 18, Android 15)
- Browser updates (Safari, Chrome)
- Performance optimizations

---

## 12. APPROVAL CHECKLIST

Before approving this plan, please confirm:

- [ ] **Scope**: Do all 3 variants (mobile/tablet/desktop) align with product vision?
- [ ] **Timeline**: Is 4 weeks acceptable for initial release?
- [ ] **Budget**: Is $24k-29k within budget constraints?
- [ ] **Resources**: Can we allocate 1 dev + 1 designer + 1 QA for 4 weeks?
- [ ] **Priorities**: Is mobile optimization a business priority right now?
- [ ] **Risks**: Are the identified risks acceptable?
- [ ] **Success Metrics**: Do the target metrics align with business goals?
- [ ] **Post-Launch**: Can we commit to ongoing monitoring and improvements?

---

## 13. NEXT STEPS AFTER APPROVAL

1. **Week 0 (Pre-Development)**:
   - [ ] Create detailed Figma mockups for all 3 breakpoints
   - [ ] Set up BrowserStack testing environment
   - [ ] Configure Lighthouse CI in deployment pipeline
   - [ ] Create feature flags for gradual rollout
   - [ ] Set up analytics events and dashboards

2. **Week 1 (Kickoff)**:
   - [ ] Design system implementation
   - [ ] Base component library
   - [ ] Responsive hooks and utilities
   - [ ] Begin home page redesign

3. **Weekly Cadence**:
   - Monday: Sprint planning, design review
   - Wednesday: Mid-week check-in, unblock issues
   - Friday: Demo, retrospective, QA handoff

---

## APPENDIX A: Component Migration Priority

### Critical Path (Week 1-2)
1. ✓ AdaptiveLayout (routing foundation)
2. ✓ MobileHeader + BottomNavigation
3. ✓ MobileHomePage
4. ✓ ResponsiveCard
5. ✓ BottomSheet

### High Priority (Week 2-3)
6. ✓ MobileGraphView (list mode)
7. ✓ MobileArticleViewer
8. ✓ HamburgerMenu
9. ✓ SwipeableCard
10. ✓ MobileChallengeForm

### Medium Priority (Week 3-4)
11. ✓ TabletSidebar
12. ✓ TabletGraphView
13. ✓ FAB (Floating Action Button)
14. ✓ PullToRefresh
15. ✓ TouchOptimizedButtons

### Low Priority (Post-Launch)
16. ○ DesktopPowerUserMode
17. ○ AdvancedGraphControls
18. ○ CollaborationCursors (mobile)
19. ○ KeyboardShortcutsPanel (desktop)
20. ○ ExportFeatures (mobile-optimized)

---

## APPENDIX B: Device Testing Checklist

### Mobile Testing (Per Device)
- [ ] Home page loads and scrolls smoothly
- [ ] Bottom navigation works (all 5 tabs)
- [ ] Hamburger menu opens/closes
- [ ] Search functionality
- [ ] Graph view (list mode) displays correctly
- [ ] Node cards are tappable (48x48px)
- [ ] Article viewer displays with highlights
- [ ] Bottom sheet swipes up/down
- [ ] Challenge form (multi-step wizard)
- [ ] Gestures: swipe, pinch, long-press
- [ ] Portrait and landscape orientations
- [ ] Safe area insets (notch, home indicator)
- [ ] Pull-to-refresh on lists
- [ ] Image loading and lazy loading
- [ ] Form inputs don't trigger zoom
- [ ] No horizontal scrolling

### Tablet Testing (Per Device)
- [ ] Home page with 2-column grid
- [ ] Sidebar collapses correctly
- [ ] Split-screen layouts work
- [ ] Graph view with touch controls
- [ ] Article viewer with sidebar
- [ ] Challenge form with 2-column layout
- [ ] Both portrait and landscape modes
- [ ] Touch and mouse both work

### Desktop Testing (Per Browser)
- [ ] No regressions from existing features
- [ ] VSCodeLayout still functional
- [ ] Keyboard shortcuts work
- [ ] Hover states preserved
- [ ] Context menus accessible
- [ ] Resizable panels work

---

**END OF PLAN**

Total Pages: 12
Total Word Count: ~8,500
Estimated Read Time: 30 minutes

**Status**: ⏳ Awaiting Approval
**Next Action**: Review → Approve → Kick Off Week 0
