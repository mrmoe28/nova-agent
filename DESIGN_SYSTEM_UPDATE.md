# Modern Design System Update

## Overview
The app has been redesigned with a modern purple/violet color theme and enhanced Framer Motion animations throughout.

## New Color Theme

### Primary Colors
- **Violet**: `#8b5cf6` - Primary brand color
- **Purple**: `#a855f7` - Secondary accent
- **Fuchsia**: `#c084fc` - Tertiary accent

### Gradient Combinations
- Primary Gradient: `from-violet-600 via-purple-600 to-fuchsia-600`
- Hero Background: `from-[#1e1b4b] via-[#312e81] to-[#4c1d95]`
- Button Gradients: Various combinations of violet, purple, and fuchsia

## Framer Motion Components

### Location
All motion components are located in: `src/components/motion/index.tsx`

### Available Components

#### 1. **MotionDiv**
Basic animated div with customizable variants and transitions.

```tsx
import { MotionDiv, fadeInUp, smoothTransition } from "@/components/motion";

<MotionDiv
  variants={fadeInUp}
  transition={smoothTransition}
  delay={0.2}
  className="..."
>
  Content
</MotionDiv>
```

#### 2. **MotionCard**
Animated card with hover effects.

```tsx
import { MotionCard } from "@/components/motion";

<MotionCard delay={0.1} hover={true}>
  <Card>...</Card>
</MotionCard>
```

#### 3. **MotionStagger**
Staggered animation for lists/grids.

```tsx
import { MotionStagger } from "@/components/motion";

<MotionStagger className="grid gap-4">
  {items.map(item => <Item key={item.id} />)}
</MotionStagger>
```

#### 4. **MotionGradient**
Animated gradient background.

```tsx
import { MotionGradient } from "@/components/motion";

<MotionGradient gradient="from-violet-500/20 to-purple-500/20">
  Content
</MotionGradient>
```

#### 5. **FloatingAnimation**
Continuous floating animation.

```tsx
import { FloatingAnimation } from "@/components/motion";

<FloatingAnimation intensity={10}>
  <Icon />
</FloatingAnimation>
```

### Animation Variants

Pre-defined variants available:
- `fadeInUp` - Fade in from bottom
- `fadeIn` - Simple fade in
- `scaleIn` - Scale from 0.9 to 1
- `slideInFromLeft` - Slide from left
- `slideInFromRight` - Slide from right
- `staggerContainer` - Container for staggered animations
- `staggerItem` - Individual item in staggered list

### Transition Presets

- `smoothTransition` - Smooth easing (0.4s)
- `springTransition` - Spring physics
- `bounceTransition` - Bouncy spring

## Updated Pages

### Homepage (`src/app/page.tsx`)
- New purple/violet gradient hero section
- Animated gradient orbs in background
- Enhanced feature cards with hover effects
- Modern CTA section with gradient buttons

### Projects Page (`src/app/projects/page.tsx`)
- Updated status badges with new color scheme
- Gradient buttons and avatars
- Animated card layouts
- Modern glassmorphism effects

## CSS Updates

### New Classes in `globals.css`

#### Glassmorphism
```css
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
}

.dark .glass-card {
  background: rgba(17, 24, 39, 0.6);
  border: 1px solid rgba(139, 92, 246, 0.2);
}
```

#### Gradients
```css
.gradient-primary {
  background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #c084fc 100%);
}

.animated-gradient {
  background: linear-gradient(-45deg, #8b5cf6, #a855f7, #c084fc, #d946ef);
  animation: gradient-shift 15s ease infinite;
}
```

## Usage Examples

### Basic Page with Animations

```tsx
"use client";

import { MotionPage, MotionDiv, fadeInUp, smoothTransition } from "@/components/motion";

export default function MyPage() {
  return (
    <MotionPage>
      <MotionDiv
        variants={fadeInUp}
        transition={smoothTransition}
        className="..."
      >
        <h1>Animated Title</h1>
      </MotionDiv>
    </MotionPage>
  );
}
```

### Animated Card Grid

```tsx
import { MotionStagger, MotionCard } from "@/components/motion";

<MotionStagger className="grid grid-cols-3 gap-4">
  {items.map((item, index) => (
    <MotionCard key={item.id} delay={index * 0.1}>
      <Card>
        <CardContent>{item.content}</CardContent>
      </Card>
    </MotionCard>
  ))}
</MotionStagger>
```

### Gradient Button

```tsx
<Button className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/30">
  Click Me
</Button>
```

## Color Reference

### Status Colors
- **Intake**: Violet (`bg-violet-100`, `text-violet-800`)
- **Analysis**: Purple (`bg-purple-100`, `text-purple-800`)
- **Sizing**: Fuchsia (`bg-fuchsia-100`, `text-fuchsia-800`)
- **BOM**: Pink (`bg-pink-100`, `text-pink-800`)
- **Review**: Indigo (`bg-indigo-100`, `text-indigo-800`)
- **Complete**: Emerald (`bg-emerald-100`, `text-emerald-800`)

### Dark Mode Support
All colors have dark mode variants using the pattern:
- Light: `bg-violet-100 text-violet-800`
- Dark: `dark:bg-violet-950/30 dark:text-violet-300`

## Best Practices

1. **Use MotionStagger for lists** - Provides smooth sequential animations
2. **Add delays for sequential content** - Use `delay` prop for natural flow
3. **Combine with glass-card** - Use glassmorphism for modern depth
4. **Use gradient buttons** - Apply gradient classes for primary actions
5. **Maintain color consistency** - Use the defined color palette throughout

## Next Steps

To apply this design system to other pages:

1. Import motion components: `import { MotionDiv, MotionCard, ... } from "@/components/motion"`
2. Replace static divs with `MotionDiv` where appropriate
3. Update color classes to use violet/purple/fuchsia theme
4. Add hover effects and transitions
5. Use `MotionStagger` for lists and grids

## Files Modified

- `src/components/motion/index.tsx` - New motion component library
- `src/app/globals.css` - Updated color theme and new utility classes
- `src/app/layout.tsx` - Updated theme color
- `src/app/page.tsx` - Complete homepage redesign
- `src/app/projects/page.tsx` - Updated with new theme and animations

