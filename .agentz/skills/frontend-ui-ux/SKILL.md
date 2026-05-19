# Frontend UI/UX Skill — Premium Web Interface Expert

## Purpose
Enables coder and vision agents to build beautiful, responsive, accessible web UIs.

## When to Use
- When implementing frontend components, pages, or layouts
- When given a design screenshot to implement
- When improving visual quality or UX of an existing UI
- When ensuring accessibility compliance

## Design Principles

### Color & Typography
- Use CSS custom properties (variables) for design tokens
- Prefer HSL colors for easy manipulation: `hsl(220 90% 56%)`
- Typography scale: 12/14/16/18/20/24/28/32/40/48/60px
- Minimum contrast ratio: 4.5:1 for text, 3:1 for large text (WCAG AA)

### Layout
- Use CSS Grid for 2D layouts, Flexbox for 1D
- Mobile-first responsive breakpoints: 640px / 768px / 1024px / 1280px
- Avoid fixed heights on text containers — let content determine height
- Use `min-height` not `height` for sections

### Component Patterns

**CSS Custom Properties setup:**
```css
:root {
  --color-primary: hsl(220 90% 56%);
  --color-primary-hover: hsl(220 90% 48%);
  --color-surface: hsl(220 15% 8%);
  --color-text: hsl(220 15% 90%);
  --color-muted: hsl(220 10% 55%);
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --shadow-md: 0 4px 16px hsl(0 0% 0% / 0.3);
  --transition-fast: 150ms ease;
}
```

**Button:**
```css
.btn {
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.btn-primary {
  background: var(--color-primary);
  color: white;
}
.btn-primary:hover { background: var(--color-primary-hover); transform: translateY(-1px); }
.btn-primary:active { transform: translateY(0); }
```

**Card:**
```css
.card {
  background: var(--color-surface);
  border: 1px solid hsl(220 15% 20%);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}
.card:hover { border-color: var(--color-primary); transform: translateY(-2px); }
```

## Accessibility Checklist
- [ ] All images have descriptive `alt` attributes
- [ ] Form inputs have associated `<label>` elements
- [ ] Interactive elements have visible focus indicators
- [ ] Color is not the only way to convey information
- [ ] Keyboard navigation works (Tab, Shift+Tab, Enter, Space, Escape)
- [ ] ARIA roles used where semantic HTML isn't sufficient
- [ ] Skip navigation link for keyboard users

## Micro-animations
```css
/* Fade in on mount */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fadeIn 0.2s ease forwards; }

/* Shimmer loading */
@keyframes shimmer {
  to { background-position: -200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, hsl(220 15% 15%) 25%, hsl(220 15% 20%) 50%, hsl(220 15% 15%) 75%);
  background-size: 200%;
  animation: shimmer 1.5s infinite;
}
```

## Common Gotchas
- Safari ignores `gap` in flex containers — use `margin` as fallback for older Safari
- `position: sticky` needs `overflow: visible` on parent
- `z-index` only works on positioned elements
- `transform` creates a new stacking context
- Mobile: touch targets should be minimum 44×44px

## Performance
- Lazy load images below the fold: `loading="lazy"`
- Use `content-visibility: auto` for long lists
- Prefer `transform` and `opacity` for animations (GPU-accelerated)
- Critical CSS inline, rest deferred
