# Overlays

## Sheet (Primary on Mobile)

Bottom drawer — the default overlay pattern for mobile.

```
fixed bottom-0 inset-x-0
bg-white rounded-t-2xl shadow-lg
p-6 pb-safe
max-h-[85vh] overflow-y-auto
```

- Opens in 50ms (slide up)
- Backdrop: `bg-black/50`
- Drag handle: centered, `w-10 h-1 bg-slate-300 rounded-full` at top
- Close: tap backdrop or swipe down

### Content Structure
```
<SheetHeader>Title + optional close button</SheetHeader>
<SheetContent>Scrollable body</SheetContent>
<SheetFooter>Sticky CTA at bottom</SheetFooter>
```

---

## Dialog (Desktop / Confirmations)

Centered modal for desktop or critical confirmations.

```
bg-white rounded-2xl shadow-xl
p-6 max-w-md mx-auto
```

- Backdrop: `bg-black/50`
- Opens in 50ms (fade + slight scale)
- On mobile: prefer Sheet over Dialog
- Alert dialogs (destructive confirmations) center on both mobile and desktop

---

## Popover

Small floating panel attached to a trigger element.

```
bg-white rounded-xl shadow-lg border border-slate-200
p-4
```

- Arrow pointing to trigger
- Dismisses on outside click
- Max width: 320px
- Use for: tooltips-with-actions, inline editing, filter dropdowns

---

## Tooltip

Text-only hint on hover/focus. No interactions inside.

```
bg-slate-900 text-white text-sm rounded-lg
px-3 py-2
```

- Shows on hover (desktop) or long-press (mobile)
- Delay: 0ms (instant)
- Max width: 200px
- Arrow pointing to trigger

---

## Rules

1. **Mobile = Sheet.** Don't use centered Dialogs on mobile (except destructive confirmations).
2. **50ms open/close.** No slow fade-ins.
3. **One overlay at a time.** Never stack sheets/modals.
4. **CTA in footer.** If the overlay has an action, stick it to the bottom.
5. **No orange in overlay chrome.** Close buttons, drag handles = slate. Only the CTA button inside is orange.
6. **Escape/backdrop dismisses.** Always provide easy exit.

---

## Source

Components: `src/components/ui/sheet.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `popover.tsx`, `tooltip.tsx`
