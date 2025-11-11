# Adaptive Navigation System

Device-aware navigation that automatically renders the appropriate navigation components based on screen size.

## Architecture

```
NavigationProvider (Context)
    ↓
AppShell (Root Wrapper)
    ↓
AdaptiveNavigation (Device Detection)
    ↓
├── Mobile (0-767px)
│   ├── MobileHeader
│   ├── HamburgerMenu
│   └── BottomNavigation
│
├── Tablet (768-1023px)
│   ├── TabletNavigation (Top Bar)
│   └── HamburgerMenu (Overflow)
│
└── Desktop (1024px+)
    └── DesktopSidebar
```

## Components

### AppShell

Root application wrapper with navigation. Use this at the app level.

```tsx
import { AppShell } from '@/components/navigation';

export default function RootLayout({ children }) {
  return (
    <AppShell
      showNavigation={true}
      showBottomNav={true}
      showHeader={true}
    >
      {children}
    </AppShell>
  );
}
```

**Props:**
- `showNavigation` - Whether to show navigation (default: true)
- `showBottomNav` - Show bottom nav on mobile (default: true)
- `showHeader` - Show header on mobile (default: true)

### NavigationProvider

Navigation context provider. Manages navigation state.

```tsx
import { NavigationProvider, useNavigation } from '@/contexts/NavigationContext';

// Wrap your app
<NavigationProvider>
  <YourApp />
</NavigationProvider>

// Use in components
function MyComponent() {
  const {
    activeRoute,
    isMobileMenuOpen,
    openMobileMenu,
    closeMobileMenu,
    isRouteActive,
  } = useNavigation();
}
```

### AdaptiveNavigation

Automatically renders device-appropriate navigation.

```tsx
import { AdaptiveNavigation } from '@/components/navigation';

<AdaptiveNavigation
  user={session?.user}
  showBottomNav={true}
  showHeader={true}
>
  {children}
</AdaptiveNavigation>
```

## Navigation Configuration

All navigation items are centralized in `/config/navigation.ts`:

```ts
import { PRIMARY_NAV_ITEMS, HAMBURGER_MENU_ITEMS } from '@/config/navigation';

// Primary navigation (bottom nav on mobile)
PRIMARY_NAV_ITEMS = [
  { id: 'home', label: 'Home', href: '/', icon: Home },
  { id: 'search', label: 'Search', href: '/search', icon: Search },
  // ...
];

// Full menu (hamburger menu)
HAMBURGER_MENU_ITEMS = [
  { id: 'explore', label: 'Explore', href: '/explore', icon: Search, children: [...] },
  // ...
];
```

### MenuItem Interface

```ts
interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: number;
  children?: MenuItem[];
  requiresAuth?: boolean;
  description?: string;
}
```

## Device-Specific Rendering

### Mobile (0-767px)

- **MobileHeader**: Fixed header with hamburger, logo, notifications
- **HamburgerMenu**: Slide-in drawer with full menu
- **BottomNavigation**: Fixed bottom bar with 5 primary actions

Layout:
```
┌─────────────────────┐
│ [☰]  Logo      [🔔👤]│ ← MobileHeader
├─────────────────────┤
│                     │
│   Main Content      │
│                     │
├─────────────────────┤
│ [🏠][🔍][📊][🎯][👤]│ ← BottomNavigation
└─────────────────────┘
```

### Tablet (768-1023px)

- **TabletNavigation**: Top bar with primary navigation + actions
- **HamburgerMenu**: For overflow items

Layout:
```
┌─────────────────────────────────┐
│ Logo [Home][Search][Graph] [+][👤]│ ← TabletNavigation
├─────────────────────────────────┤
│                                 │
│        Main Content             │
│                                 │
└─────────────────────────────────┘
```

### Desktop (1024px+)

- **DesktopSidebar**: Full sidebar with nested navigation

Layout:
```
┌────┬──────────────────┐
│    │                  │
│ S  │   Main Content   │
│ i  │                  │
│ d  │                  │
│ e  │                  │
│ b  │                  │
│ a  │                  │
│ r  │                  │
│    │                  │
└────┴──────────────────┘
```

## Usage Examples

### Basic App Setup

```tsx
// app/layout.tsx
import { AppShell } from '@/components/navigation';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
```

### Page Without Navigation

```tsx
// app/login/page.tsx
import { AppShell } from '@/components/navigation';

export default function LoginPage() {
  return (
    <AppShell showNavigation={false}>
      <LoginForm />
    </AppShell>
  );
}
```

### Custom Navigation Items

```tsx
// config/navigation.ts
export const CUSTOM_NAV_ITEMS: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    badge: 5,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    requiresAuth: true,
    children: [
      { id: 'profile', label: 'Profile', href: '/settings/profile' },
      { id: 'security', label: 'Security', href: '/settings/security' },
    ],
  },
];
```

### Using Navigation Context

```tsx
function MyComponent() {
  const {
    activeRoute,
    isMobileMenuOpen,
    openMobileMenu,
    closeMobileMenu,
    toggleMobileMenu,
    isRouteActive,
  } = useNavigation();

  return (
    <button onClick={toggleMobileMenu}>
      Toggle Menu {isMobileMenuOpen ? '✓' : '✗'}
    </button>
  );
}
```

## Breakpoints

Defined in `mobileTheme.ts`:

```ts
mobile:  0-767px
tablet:  768-1023px
desktop: 1024px+
```

## Features

✅ **Automatic Device Detection** - Renders appropriate navigation
✅ **Centralized Configuration** - Single source of truth for menu items
✅ **Nested Menus** - Support for nested navigation items
✅ **Badge Support** - Show notification badges on nav items
✅ **Authentication Aware** - Hide items based on auth state
✅ **Active State** - Highlights active routes
✅ **Collapsible Sidebar** - Desktop sidebar can collapse
✅ **Touch Optimized** - All touch targets meet WCAG guidelines
✅ **Safe Area Support** - Handles iOS notch and Android gesture bar

## Migration Guide

### From Standalone Components

Before:
```tsx
<MobileHeader user={user} />
<BottomNavigation items={items} />
{children}
```

After:
```tsx
<AppShell>
  {children}
</AppShell>
```

### From Manual Device Detection

Before:
```tsx
const isMobile = window.innerWidth < 768;
return isMobile ? <MobileNav /> : <DesktopNav />;
```

After:
```tsx
<AdaptiveNavigation>
  {children}
</AdaptiveNavigation>
```

## Performance

- **Code Splitting**: Device-specific components only load when needed
- **Memoization**: Navigation items are memoized to prevent re-renders
- **Passive Listeners**: All scroll/touch listeners are passive
- **Portal Rendering**: Modals/menus render in portals for better performance

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **ARIA Labels**: All interactive elements have proper labels
- **Touch Targets**: Minimum 44x44px (WCAG 2.5.5)
- **Focus Management**: Proper focus trapping in modals
- **Screen Reader**: Semantic HTML and ARIA attributes
