# Motion & Transitions

## Core Rule: Instant

The site must feel crispy and immediate — like a native app, not a web page.

**50ms max for EVERYTHING.** No exceptions.

---

## Transition Durations

| Interaction | Duration | CSS |
|------------|----------|-----|
| Hover state | 50ms | `transition-all duration-[50ms]` |
| Focus ring | 0ms | Instant — no transition on focus |
| Button press | 50ms | `transition-colors duration-[50ms]` |
| Sheet/modal open | 50ms | `duration-[50ms]` |
| Sheet/modal close | 50ms | `duration-[50ms]` |
| Accordion expand | 50ms | `duration-[50ms]` |
| Tab switch | 0ms | Instant content swap |
| Toast appear | 50ms | Slide in |
| Skeleton shimmer | CSS animation | Continuous, subtle |

---

## Easing

```css
transition-timing-function: ease-out; /* default for all */
```

Don't overthink easing. At 50ms, the difference between `ease-out` and `linear` is imperceptible.

---

## Reduced Motion

Respect `prefers-reduced-motion: reduce`. When active, disable ALL transitions including the 50ms ones.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Never

- Decorative animations on medical content
- Bounce, spring, or playful easing
- Loading spinners that persist more than 500ms (use skeleton states)
- Page transition animations
- Parallax scrolling
- Auto-playing carousels
- Anything that delays the user from reading or acting
