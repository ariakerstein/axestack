# Cards

## Standard Card

White surface elevated above the page background.

```
bg-white rounded-2xl shadow-sm border border-slate-200
p-6
```

- Dark mode: `bg-slate-900 border-slate-700`
- Never heavy shadows — whisper-soft (`shadow-sm`)
- Content: Title (Section size) + Body text + optional CTA

---

## Card Types

### Feature Card (ExploreCard pattern)

Compact card for feature discovery. 112px height target.

```
bg-white rounded-2xl shadow-sm p-4
flex items-center gap-4
```

- Icon (left, 40px, slate-600 — NOT orange unless interactive)
- Title + one-line description
- Optional chevron right (orange if it navigates)

### Action Card

Card with a clear call-to-action. One CTA per card.

```
bg-white rounded-2xl shadow-sm p-6
flex flex-col gap-4
```

- Title + short description
- Primary or Secondary button at bottom
- Optional badge/indicator top-right

### Sheet-Based Card

Cards that expand into a bottom sheet on mobile. Used for: TrialsMatchCard, ResearchMatchCard, ConnectChartCard, FinancialNavigatorCard.

Props: `open`, `onOpenChange`, `hideTrigger`

- Trigger: Standard card appearance
- Expanded: Full Sheet (see `overlays.md`)
- The card IS the trigger — orange accent on the action element only

### Status Card

Displays progress, gaps, or health status.

```
bg-white rounded-2xl shadow-sm p-6
border-l-4 border-[status-color]
```

- Left border color = status (green/red/blue)
- Never orange border (orange = clickable)
- Icon + title + metric + optional detail

---

## Spacing

- Card padding: `p-6` (standard), `p-4` (compact)
- Between cards: `gap-4` or `gap-6`
- Card max-width: follows container (`max-w-5xl`)
- Card grid: `grid grid-cols-1 sm:grid-cols-2 gap-4`

---

## Rules

1. **Cards are white.** Even on white backgrounds, the shadow differentiates them.
2. **No colored card backgrounds** unless it's a status indicator (and then only left border).
3. **One action per card.** Don't put 3 buttons in a card.
4. **No orange decorative elements** in cards — only on the CTA button/link.
5. **Rounded-2xl consistently.** Don't mix border radius sizes.

---

## Source

Component: `src/components/ui/card.tsx`
Feature card: `src/components/home/ExploreCard.tsx`
