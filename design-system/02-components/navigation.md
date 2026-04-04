# Navigation

## Tabs

Primary navigation within pages (e.g., Care | Records | Circle).

```
border-b border-slate-200
```

### Tab Item
```
px-4 py-3 text-base font-medium
text-slate-500 hover:text-slate-900
min-h-[44px]
transition-colors duration-[50ms]
```

### Active Tab
```
text-orange-600 border-b-2 border-orange-600
```

Active indicator uses orange — it's interactive, showing which tab is selected.

### Rules
- Maximum 4 tabs visible at once
- On mobile: horizontal scroll if needed, or collapse to dropdown
- Tab content swaps instantly (0ms, no transition)
- Active tab text = orange, inactive = slate-500

---

## Breadcrumbs

For deep navigation (wizard steps, nested pages).

```
flex items-center gap-2 text-sm
```

- Separator: `/` or chevron-right in slate-400
- Current page: `text-slate-900 font-medium` (NOT orange — it's not clickable)
- Previous pages: `text-orange-600` (clickable — correctly orange)

---

## Sidebar (Desktop Only)

Optional sidebar for desktop. NOT shown on mobile.

```
w-64 border-r border-slate-200 bg-white
p-4
```

- Navigation items: `py-2 px-3 rounded-lg text-base`
- Active: `bg-orange-50 text-orange-600 font-medium`
- Inactive: `text-slate-600 hover:bg-slate-50`

---

## Hamburger Menu (Mobile)

Replaces sidebar on mobile. Opens as a Sheet (bottom drawer).

Contents:
- Navigation links
- Dark mode switcher
- User profile/settings
- Sign out

---

## Bottom Navigation (Optional)

For mobile app-like feel. Fixed bottom bar.

```
fixed bottom-0 w-full bg-white border-t border-slate-200
flex justify-around items-center h-16
pb-safe  /* iOS safe area */
```

- Active icon: orange
- Inactive icon: slate-400
- Maximum 5 items
- 44px touch targets

---

## Rules

1. **Orange = active/clickable** in navigation. Inactive items use slate.
2. **Current breadcrumb is NOT orange** — you can't click where you already are.
3. **Previous breadcrumbs ARE orange** — they navigate back.
4. **Sidebar is desktop-only.** Mobile gets hamburger → sheet.
5. **Tab switches are instant.** No content transition animation.

---

## Source

Components: `src/components/ui/tabs.tsx`, `navigation-menu.tsx`, `breadcrumb.tsx`, `sidebar.tsx`
