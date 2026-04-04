# Accessibility Audit

**WCAG AA compliance is the minimum standard. Our users include people with cognitive fatigue, vision changes from treatment, and stress-impaired focus.**

---

## Contrast Ratios

| Element | Min Ratio | How to Check |
|---------|-----------|-------------|
| Normal text (< 18px) | 4.5:1 | Text color against background |
| Large text (≥ 18px bold or ≥ 24px) | 3:1 | Heading color against background |
| UI components (buttons, inputs, icons) | 3:1 | Component against adjacent colors |
| Focus indicators | 3:1 | Focus ring against background |

### Our Palette Contrast (Light Mode on #F8FAFC background)

| Color | Hex | Ratio vs Background | Passes |
|-------|-----|---------------------|--------|
| Trust Navy | #0F172A | 15.4:1 | Yes (AA + AAA) |
| Body Text | #475569 | 6.2:1 | Yes (AA) |
| Muted Text | #64748B | 4.6:1 | Yes (AA, barely) |
| CTA Orange | #EA580C | 4.1:1 | Yes (large text/UI), borderline (small text) |
| Error Red | #DC2626 | 4.5:1 | Yes (AA) |
| Success Green | #16A34A | 3.8:1 | Yes (large text/UI only) |
| Info Blue | #2563EB | 4.3:1 | Yes (AA for large) |

**Note**: CTA Orange on white background is 3.7:1 — passes for large text (18px+ our minimum CTA size) and UI components, but avoid for small body text.

---

## Touch Targets

- [ ] All buttons: `min-h-[44px] min-w-[44px]`
- [ ] All links: wrapped in sufficient padding or have 44px tap area
- [ ] Checkboxes/radios: label provides 44px tap area
- [ ] Close buttons: 44px even if icon is smaller
- [ ] Spacing between targets: ≥ 8px gap (no accidental taps)

---

## Focus Indicators

- [ ] All interactive elements have visible focus ring
- [ ] Focus ring: `ring-2 ring-orange-600 ring-offset-2`
- [ ] Focus visible on keyboard navigation (`:focus-visible`)
- [ ] Focus order follows visual order (no tabindex hacks)
- [ ] Skip-to-content link available

---

## Screen Reader

- [ ] All images have `alt` text (empty `alt=""` for decorative)
- [ ] All buttons have accessible labels (text or `aria-label`)
- [ ] All form inputs have associated `<label>` elements
- [ ] Headings follow hierarchy (h1 → h2 → h3, no skipping)
- [ ] Dynamic content changes announced (`aria-live` regions)
- [ ] Sheet/modal titles are announced on open

---

## Keyboard Navigation

- [ ] All interactive elements reachable via Tab
- [ ] Escape closes overlays (sheets, modals, popovers)
- [ ] Enter/Space activates buttons
- [ ] Arrow keys navigate within component groups (tabs, radio)
- [ ] No keyboard traps (can always Tab out of a component)

---

## Reduced Motion

- [ ] `@media (prefers-reduced-motion: reduce)` disables all transitions
- [ ] No auto-playing animations
- [ ] Skeleton shimmer still works (CSS, not JS animation)
- [ ] Carousel/slider has pause control

---

## Cognitive Accessibility

Especially important for cancer patients experiencing chemo brain, stress, or medication effects:

- [ ] **Generous line height** (`leading-relaxed`) on body text
- [ ] **One action per view** — not overwhelming with choices
- [ ] **Plain language** — no unnecessary medical jargon
- [ ] **Consistent layout** — same patterns across pages
- [ ] **Forgiving inputs** — allow mistakes, easy to correct
- [ ] **No time pressure** — no countdown timers on decisions

---

## Dark Mode Accessibility

- [ ] All contrast ratios maintained in dark mode
- [ ] Focus rings visible against dark backgrounds
- [ ] No pure white text on pure black (use off-white on dark navy)
- [ ] Status colors slightly brighter for dark backgrounds
