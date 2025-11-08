# Rabbit Hole Design System
## Tesla-Inspired Professional UI/UX

> Clean, minimalist, functional. Every pixel serves a purpose.

---

## 🎨 Design Philosophy

### Core Principles (Tesla-Inspired)

1. **Minimalism** - Remove everything unnecessary
2. **Clarity** - Information hierarchy always clear
3. **Efficiency** - Reduce cognitive load, maximize user productivity
4. **Responsiveness** - Seamless across all devices
5. **Accessibility** - Everyone can use it

### Visual Language

- **Calm & Confident** - Professional without being sterile
- **Data-Driven** - Information-dense yet breathable
- **Future-Forward** - Modern but timeless
- **Purpose-Built** - Every element has a reason

---

## 📐 Typography

### Font Stack

```css
/* Primary: System fonts for performance */
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, sans-serif;

/* Monospace: Code and technical content */
--font-mono: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono",
             Consolas, monospace;
```

**Tesla uses Gotham**, but system fonts:
- Load instantly (no FOUT/FOIT)
- Native to each OS
- Optimized for screen rendering
- Zero bytes

### Type Scale

```css
/* Modular scale: 1.250 (Major Third) */
--text-xs: 0.64rem;    /* 10.24px */
--text-sm: 0.8rem;     /* 12.8px  */
--text-base: 1rem;     /* 16px - base */
--text-lg: 1.25rem;    /* 20px    */
--text-xl: 1.563rem;   /* 25px    */
--text-2xl: 1.953rem;  /* 31.25px */
--text-3xl: 2.441rem;  /* 39px    */
--text-4xl: 3.052rem;  /* 48.83px */
```

### Font Weights

```css
--font-light: 300;     /* Sparingly, for large headlines */
--font-normal: 400;    /* Body text */
--font-medium: 500;    /* Emphasis, labels */
--font-semibold: 600;  /* Headings, buttons */
--font-bold: 700;      /* Rare, only for critical CTAs */
```

**Usage Rules:**
- Body text: 400 (normal)
- Buttons/labels: 600 (semibold)
- Headlines: 300-600 (context-dependent)
- Never use 700 (bold) except for critical warnings

### Line Height

```css
--leading-none: 1;      /* Headings */
--leading-tight: 1.25;  /* Large headings */
--leading-snug: 1.375;  /* Subheadings */
--leading-normal: 1.5;  /* Body text - optimal readability */
--leading-relaxed: 1.625; /* Long-form content */
```

### Letter Spacing

```css
--tracking-tighter: -0.05em;  /* Large headings */
--tracking-tight: -0.025em;   /* Headings */
--tracking-normal: 0;         /* Body text */
--tracking-wide: 0.025em;     /* Small caps, labels */
--tracking-wider: 0.05em;     /* Button text */
```

---

## 🎨 Color System

### Neutral Palette (Foundation)

```css
/* Pure black/white for maximum contrast */
--white: #FFFFFF;
--black: #000000;

/* Grays: 9 steps for subtle hierarchy */
--gray-50:  #FAFAFA;  /* Lightest backgrounds */
--gray-100: #F5F5F5;  /* Backgrounds */
--gray-200: #E5E5E5;  /* Borders, dividers */
--gray-300: #D4D4D4;  /* Disabled backgrounds */
--gray-400: #A3A3A3;  /* Placeholder text */
--gray-500: #737373;  /* Secondary text */
--gray-600: #525252;  /* Body text */
--gray-700: #404040;  /* Headings */
--gray-800: #262626;  /* Primary text */
--gray-900: #171717;  /* Darkest backgrounds */
```

### Brand Colors

```css
/* Primary: Deep Blue (trust, stability) */
--primary-50:  #EFF6FF;
--primary-100: #DBEAFE;
--primary-500: #3B82F6;  /* Main brand color */
--primary-600: #2563EB;  /* Hover state */
--primary-700: #1D4ED8;  /* Active state */
--primary-900: #1E3A8A;  /* Darkest */

/* Accent: Electric Blue (AI, tech features) */
--accent-500: #06B6D4;   /* Cyan-500 */
--accent-600: #0891B2;   /* Hover */
```

### Semantic Colors

```css
/* Success: Green */
--success-50:  #F0FDF4;
--success-500: #10B981;  /* Primary success */
--success-600: #059669;  /* Hover */
--success-700: #047857;  /* Active */

/* Warning: Amber */
--warning-50:  #FFFBEB;
--warning-500: #F59E0B;  /* Primary warning */
--warning-600: #D97706;  /* Hover */

/* Error: Red */
--error-50:  #FEF2F2;
--error-500: #EF4444;    /* Primary error */
--error-600: #DC2626;    /* Hover */
--error-700: #B91C1C;    /* Active */

/* Info: Blue */
--info-500: #3B82F6;
```

### Graph/Data Visualization Colors

```css
/* Credibility scores (0.0 - 1.0) */
--credibility-critical: #EF4444;  /* 0.0-0.2: Red */
--credibility-low:      #F59E0B;  /* 0.2-0.4: Amber */
--credibility-medium:   #EAB308;  /* 0.4-0.6: Yellow */
--credibility-good:     #10B981;  /* 0.6-0.8: Green */
--credibility-high:     #3B82F6;  /* 0.8-1.0: Blue */
```

### Dark Mode (Default)

```css
/* Background layers */
--bg-primary: #000000;      /* Main background */
--bg-secondary: #0A0A0A;    /* Card backgrounds */
--bg-tertiary: #171717;     /* Elevated surfaces */
--bg-elevated: #1F1F1F;     /* Hover states, panels */

/* Text */
--text-primary: #FAFAFA;    /* Main text */
--text-secondary: #A3A3A3;  /* Supporting text */
--text-tertiary: #737373;   /* Muted text */
--text-disabled: #525252;   /* Disabled text */

/* Borders */
--border-primary: #262626;   /* Subtle dividers */
--border-secondary: #404040; /* Interactive elements */
--border-focus: #3B82F6;     /* Focus rings */
```

### Light Mode (Optional)

```css
/* Background layers */
--bg-primary: #FFFFFF;
--bg-secondary: #FAFAFA;
--bg-tertiary: #F5F5F5;
--bg-elevated: #FFFFFF;

/* Text */
--text-primary: #171717;
--text-secondary: #525252;
--text-tertiary: #737373;
--text-disabled: #A3A3A3;

/* Borders */
--border-primary: #E5E5E5;
--border-secondary: #D4D4D4;
```

---

## 📏 Spacing System

### Scale (8px base unit)

```css
--space-0: 0;
--space-1: 0.25rem;  /* 4px  - Micro spacing */
--space-2: 0.5rem;   /* 8px  - Base unit */
--space-3: 0.75rem;  /* 12px - Compact */
--space-4: 1rem;     /* 16px - Standard */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px - Section spacing */
--space-8: 2rem;     /* 32px - Large gaps */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px - Major sections */
--space-16: 4rem;    /* 64px - Page sections */
--space-20: 5rem;    /* 80px - Hero spacing */
--space-24: 6rem;    /* 96px */
```

### Usage Guidelines

**Micro (1-2):** Icon padding, badge spacing
**Compact (3-4):** Form fields, list items
**Standard (5-6):** Card padding, component spacing
**Large (8-12):** Section spacing, containers
**Hero (16-24):** Page-level spacing, landing sections

### Container Widths

```css
--container-xs: 20rem;   /* 320px - Mobile */
--container-sm: 24rem;   /* 384px - Small mobile */
--container-md: 28rem;   /* 448px - Tablets */
--container-lg: 32rem;   /* 512px - Small desktop */
--container-xl: 36rem;   /* 576px - Desktop */
--container-2xl: 42rem;  /* 672px - Wide desktop */
--container-3xl: 48rem;  /* 768px - Reading width */
--container-4xl: 56rem;  /* 896px - Wide content */
--container-5xl: 64rem;  /* 1024px - Max content */
--container-full: 100%;  /* Full width */
```

---

## 🎭 Shadows & Depth

### Elevation Scale

```css
/* Subtle shadows for depth */
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1),
             0 1px 2px -1px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
             0 2px 4px -2px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
             0 4px 6px -4px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
             0 8px 10px -6px rgba(0, 0, 0, 0.1);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
```

**Tesla Principle:** Minimal shadows. Use sparingly for critical elevation.

### Glow Effects (AI Features)

```css
--glow-ai: 0 0 20px rgba(6, 182, 212, 0.3);      /* Cyan glow */
--glow-focus: 0 0 0 3px rgba(59, 130, 246, 0.5); /* Focus ring */
--glow-error: 0 0 0 3px rgba(239, 68, 68, 0.3);  /* Error state */
```

---

## 🎬 Animation & Motion

### Timing Functions

```css
/* Easing curves */
--ease-linear: cubic-bezier(0, 0, 1, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);         /* Default */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);    /* Smooth */
--ease-spring: cubic-bezier(0.68, -0.55, 0.265, 1.55); /* Bouncy */
```

### Duration Scale

```css
--duration-instant: 75ms;   /* Micro-interactions */
--duration-fast: 150ms;     /* Hovers, tooltips */
--duration-normal: 200ms;   /* Default transitions */
--duration-slow: 300ms;     /* Complex animations */
--duration-slower: 500ms;   /* Page transitions */
```

### Motion Principles

1. **Purposeful** - Animation should clarify, not distract
2. **Snappy** - Prefer 150-200ms for most interactions
3. **Natural** - Use ease-out for entering, ease-in for exiting
4. **Respectful** - Honor `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 📱 Responsive Breakpoints

### Mobile-First Scale

```css
/* Breakpoints */
--screen-xs: 320px;   /* Small phones */
--screen-sm: 640px;   /* Large phones */
--screen-md: 768px;   /* Tablets */
--screen-lg: 1024px;  /* Laptops */
--screen-xl: 1280px;  /* Desktops */
--screen-2xl: 1536px; /* Large desktops */
--screen-3xl: 1920px; /* Ultra-wide */
```

### Usage Pattern

```typescript
// Tailwind-style responsive utilities
className="
  p-4         // Mobile: 16px padding
  sm:p-6      // Large phones: 24px padding
  md:p-8      // Tablets: 32px padding
  lg:p-12     // Desktops: 48px padding
"
```

### Touch Target Sizes

```css
/* WCAG 2.1 Level AAA */
--touch-min: 44px;     /* Minimum */
--touch-comfortable: 48px; /* Preferred */
--touch-spacious: 56px;    /* Generous */
```

---

## 🧩 Component Patterns

### Buttons

```typescript
// Primary CTA
<button className="
  px-6 py-3
  bg-primary-500
  text-white
  font-semibold
  tracking-wide
  rounded-sm
  transition-all duration-fast
  hover:bg-primary-600
  active:bg-primary-700
  focus:outline-none focus:ring-4 focus:ring-primary-500/50
  disabled:opacity-50 disabled:cursor-not-allowed
">
  Continue
</button>

// Secondary
<button className="
  px-6 py-3
  bg-transparent
  text-gray-200
  font-semibold
  border border-gray-600
  rounded-sm
  hover:bg-gray-800
  focus:ring-4 focus:ring-gray-500/50
">
  Cancel
</button>

// Ghost (tertiary)
<button className="
  px-4 py-2
  text-gray-400
  hover:text-gray-200
  hover:bg-gray-800/50
  rounded-sm
">
  Learn More
</button>
```

### Input Fields

```typescript
<div className="space-y-2">
  <label className="
    block
    text-sm
    font-medium
    text-gray-300
    tracking-wide
  ">
    Email Address
  </label>
  <input
    type="email"
    className="
      w-full
      px-4 py-3
      bg-gray-900
      border border-gray-700
      text-gray-100
      placeholder-gray-500
      rounded-sm
      transition-all duration-normal
      focus:outline-none
      focus:border-primary-500
      focus:ring-4 focus:ring-primary-500/20
      disabled:opacity-50
    "
    placeholder="you@example.com"
  />
  <span className="text-xs text-gray-500">
    We'll never share your email.
  </span>
</div>
```

### Cards

```typescript
<div className="
  bg-gray-900
  border border-gray-800
  rounded-lg
  overflow-hidden
  transition-all duration-normal
  hover:border-gray-700
  hover:shadow-lg
">
  <div className="p-6 space-y-4">
    <h3 className="text-xl font-semibold text-gray-100">
      Card Title
    </h3>
    <p className="text-gray-400 leading-relaxed">
      Card description goes here.
    </p>
  </div>
</div>
```

### Modals/Dialogs

```typescript
<div className="
  fixed inset-0
  z-50
  flex items-center justify-center
  bg-black/80
  backdrop-blur-sm
  animate-fade-in
">
  <div className="
    w-full max-w-2xl
    mx-4
    bg-gray-900
    border border-gray-800
    rounded-lg
    shadow-2xl
    animate-scale-in
  ">
    <div className="
      flex items-center justify-between
      px-6 py-4
      border-b border-gray-800
    ">
      <h2 className="text-xl font-semibold">
        Modal Title
      </h2>
      <button className="
        w-10 h-10
        flex items-center justify-center
        text-gray-400
        hover:text-gray-200
        hover:bg-gray-800
        rounded-sm
        transition-colors
      ">
        <X size={20} />
      </button>
    </div>
    <div className="p-6">
      {/* Content */}
    </div>
  </div>
</div>
```

### Loading States

```typescript
// Skeleton loader
<div className="animate-pulse space-y-4">
  <div className="h-4 bg-gray-800 rounded w-3/4"></div>
  <div className="h-4 bg-gray-800 rounded w-1/2"></div>
</div>

// Spinner
<div className="
  w-8 h-8
  border-2 border-gray-700
  border-t-primary-500
  rounded-full
  animate-spin
"></div>
```

### Toast Notifications

```typescript
<div className="
  fixed bottom-4 right-4
  z-50
  px-6 py-4
  bg-gray-900
  border border-gray-700
  rounded-lg
  shadow-xl
  animate-slide-in-bottom
">
  <div className="flex items-center gap-3">
    <CheckCircle className="text-success-500" size={20} />
    <span className="text-gray-100">
      Changes saved successfully
    </span>
  </div>
</div>
```

---

## 🎯 Iconography

### Icon System

- **Library:** Lucide React (clean, consistent, optimized)
- **Size Scale:** 16px (sm), 20px (base), 24px (lg), 32px (xl)
- **Stroke Width:** 2px (default), 1.5px (subtle)

```typescript
import { Sparkles, AlertCircle, CheckCircle } from 'lucide-react';

<Sparkles size={20} strokeWidth={2} className="text-accent-500" />
```

### Icon Colors

- **Default:** Current text color (inherit)
- **Interactive:** gray-400 → gray-200 on hover
- **Status:** Use semantic colors (success-500, error-500, etc.)

---

## ✨ Special Elements

### AI Features Styling

```typescript
// AI indicator badge
<div className="
  inline-flex items-center gap-2
  px-3 py-1
  bg-accent-500/10
  border border-accent-500/30
  text-accent-400
  text-xs font-medium
  rounded-full
  shadow-[0_0_20px_rgba(6,182,212,0.2)]
">
  <Sparkles size={14} />
  AI-Powered
</div>
```

### Credibility Score Badges

```typescript
const getCredibilityColor = (score: number) => {
  if (score >= 0.8) return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
  if (score >= 0.6) return 'bg-green-500/20 text-green-400 border-green-500/40';
  if (score >= 0.4) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
  if (score >= 0.2) return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
  return 'bg-red-500/20 text-red-400 border-red-500/40';
};

<div className={`
  px-2 py-1
  text-xs font-semibold
  border rounded
  ${getCredibilityColor(credibility)}
`}>
  {(credibility * 100).toFixed(0)}% Credible
</div>
```

---

## 📋 Layout Patterns

### Page Container

```typescript
<div className="
  min-h-screen
  bg-black
  text-gray-100
">
  <main className="
    max-w-7xl
    mx-auto
    px-4 sm:px-6 lg:px-8
    py-8 lg:py-12
  ">
    {children}
  </main>
</div>
```

### Grid System

```typescript
// Auto-fit responsive grid
<div className="
  grid
  grid-cols-1          // Mobile: 1 column
  sm:grid-cols-2       // Small: 2 columns
  lg:grid-cols-3       // Large: 3 columns
  xl:grid-cols-4       // XL: 4 columns
  gap-4 lg:gap-6
">
  {items.map(item => <Card key={item.id} />)}
</div>
```

### Flexbox Patterns

```typescript
// Horizontal stack with space-between
<div className="flex items-center justify-between">
  <h2>Title</h2>
  <button>Action</button>
</div>

// Vertical stack with gap
<div className="flex flex-col gap-4">
  <Item />
  <Item />
</div>

// Centered content
<div className="flex items-center justify-center min-h-screen">
  <Content />
</div>
```

---

## 🔤 Naming Conventions

### CSS Classes

```css
/* Component-scoped classes */
.card { }
.card-header { }
.card-body { }

/* State modifiers */
.button--primary { }
.button--disabled { }
.input--error { }

/* Utility classes (Tailwind-style) */
.flex { }
.gap-4 { }
.text-center { }
```

### Component Files

```
/components
  /Button
    Button.tsx              // Main component
    Button.test.tsx         // Tests
    Button.stories.tsx      // Storybook
    index.ts                // Barrel export
```

---

## 📚 Component Library Priorities

### Phase 1: Core Components
1. Button (primary, secondary, ghost, icon)
2. Input (text, email, password, textarea)
3. Select/Dropdown
4. Checkbox & Radio
5. Card
6. Modal/Dialog
7. Toast Notifications

### Phase 2: Complex Components
8. Command Menu (Cmd+K)
9. Tabs
10. Accordion
11. Table/DataGrid
12. Pagination
13. Loading Skeletons
14. Avatar

### Phase 3: Domain-Specific
15. Graph Node Component
16. Challenge Form (Toulmin)
17. AI Research Panel
18. Credibility Badge
19. Evidence Card
20. Timeline Component

---

## 🎨 Tesla.com Specific Inspirations

### What to Adopt

1. **Clean Headers**
   - Minimal nav with clear hierarchy
   - Fixed header with subtle shadow on scroll
   - High contrast logo/text

2. **Typography**
   - Large, confident headlines (3xl - 4xl)
   - Generous letter-spacing on headings
   - Tight leading on display text
   - Medium weight (500-600) for most text

3. **Whitespace**
   - Generous padding (48px - 96px sections)
   - Breathing room around CTAs
   - Never cramped, always spacious

4. **Interactions**
   - Smooth transitions (200ms)
   - Subtle hover effects (scale, opacity, bg change)
   - Clear focus states (always visible)

5. **Layout**
   - Full-width hero sections
   - Contained content areas (max-width: 1200px)
   - Symmetrical spacing
   - Grid-based alignment

### What to Avoid

- Overly promotional language
- Excessive animations
- Auto-playing videos
- Aggressive sales tactics

---

## ♿ Accessibility Checklist

- [ ] Color contrast ≥ 4.5:1 for text
- [ ] Focus indicators always visible
- [ ] Keyboard navigation for all interactions
- [ ] ARIA labels for icon buttons
- [ ] Skip links for keyboard users
- [ ] Alt text for meaningful images
- [ ] Form labels properly associated
- [ ] Error messages announced (aria-live)
- [ ] Loading states announced
- [ ] Touch targets ≥ 44x44px
- [ ] No auto-playing media
- [ ] Respects prefers-reduced-motion

---

## 🚀 Performance Guidelines

1. **Bundle Size**
   - Lazy load heavy components
   - Use dynamic imports for routes
   - Tree-shake unused utilities

2. **Images**
   - Use Next.js Image component
   - WebP format with fallbacks
   - Lazy load below-fold images

3. **Fonts**
   - System fonts (zero bytes)
   - If custom fonts: subset, preload, font-display: swap

4. **CSS**
   - Minimize inline styles
   - Use CSS modules or Tailwind
   - Purge unused CSS

5. **JavaScript**
   - Code splitting by route
   - React.memo for expensive components
   - useMemo/useCallback judiciously

---

## 📐 Design Tokens Export

```typescript
// tokens.ts
export const tokens = {
  colors: {
    // ... all colors
  },
  spacing: {
    // ... all spacing
  },
  typography: {
    // ... all type settings
  },
  shadows: {
    // ... all shadows
  },
  animation: {
    // ... all timing/easing
  },
} as const;

export type DesignTokens = typeof tokens;
```

---

**Design System Version:** 1.0.0
**Last Updated:** 2025-11-08
**Maintained By:** Rabbit Hole Team

