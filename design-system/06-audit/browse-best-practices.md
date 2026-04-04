# Browse Skill Best Practices

Patterns for efficient headless browser usage with gstack browse. Reduces token waste and back-and-forth.

---

## Anti-Patterns (What Wastes Tokens)

### 1. Stale Refs
**Problem:** Using @e refs after page navigation, React state change, or DOM mutation. Refs point to old elements — clicks silently fail or hit wrong targets.
**Fix:** ALWAYS re-snapshot after any navigation or state-changing action before interacting with elements.

### 2. Screenshot Fishing  
**Problem:** Taking screenshots without setting viewport or scrolling to target first. Results in wrong content visible, requiring multiple retries.
**Fix:** Set viewport explicitly, scroll to target element, THEN screenshot.

### 3. Blur/Click Race Conditions
**Problem:** Clicking dropdown options while a blur handler fires on the input. React processes blur before click, closing the dropdown.
**Fix:** Use `onMouseDown` with `preventDefault()` on options, or add `wait` after blur-triggering actions.

### 4. Fighting React State
**Problem:** Using `js` to manipulate DOM directly when React owns the state. React re-renders overwrite DOM changes.
**Fix:** Interact through the UI (click, fill, select) not through JS DOM manipulation. Use `snapshot -C` to find cursor-interactive elements.

### 5. Not Using Diff Mode
**Problem:** Running `snapshot` twice manually and comparing output visually. Slow, error-prone, wastes context.
**Fix:** Use `snapshot -D` which stores a baseline on first call and shows unified diff on second.

---

## Efficient Patterns

### Always Snapshot After Navigation
```bash
$B goto https://app.com/page
$B snapshot -i                    # ALWAYS before interacting
$B click @e3                      # now refs are fresh
```

### Set Viewport First
```bash
$B viewport 375x812              # mobile
$B goto https://app.com
$B screenshot /tmp/mobile.png    # guaranteed correct size
```

### Use Diff for Verification
```bash
$B snapshot                       # stores baseline
$B click @e3                      # action
$B snapshot -D                    # shows exactly what changed
```

### Use -C for React Components
```bash
$B snapshot -C                    # finds non-ARIA clickable elements
$B click @c1                      # interact with custom components
```

### Chain Commands to Reduce Round Trips
```bash
$B chain <<'EOF'
[["goto","https://app.com"],["snapshot","-i"]]
EOF
```

### Wait for React State Updates
```bash
$B click @e3                      # triggers state change
$B wait --networkidle             # or wait for specific element
$B snapshot -i                    # now state is settled
```

### Verify Before Interacting
```bash
$B is visible @e3                 # confirm element exists
$B click @e3                      # safe to interact
```

---

## Decision Tree

```
Need to test a page?
└── viewport → goto → snapshot -i → interact

Need to verify an action worked?
└── snapshot (baseline) → action → snapshot -D (diff)

Element not clickable via @e ref?
├── Try: snapshot -C (cursor-interactive @c refs)
└── Last resort: js "document.querySelector(...).click()"

Getting stale ref errors?
└── Re-run snapshot -i, use new refs

Testing a form?
└── snapshot -i → fill fields → wait → snapshot -D

Need visual evidence?
└── viewport → scroll target → screenshot path
    Then: Read tool on the PNG to show user

Testing responsive?
└── responsive /tmp/prefix (auto: mobile + tablet + desktop)
```

---

## Common Sequences (Copy-Paste)

### Page Load Health Check
```bash
$B goto https://app.com/page
$B snapshot -i
$B console --errors
$B network
$B is visible ".main-content"
```

### Form Fill Test
```bash
$B goto https://app.com/form
$B snapshot -i
$B fill @e2 "test@example.com"
$B fill @e3 "Test User"
$B click @e4                      # submit
$B wait --networkidle
$B snapshot -D                    # verify changes
$B console --errors               # check for errors
```

### Visual Regression
```bash
$B goto https://app.com/page
$B viewport 1280x720
$B screenshot /tmp/before.png
# ... make code changes, reload ...
$B reload
$B screenshot /tmp/after.png
$B diff https://staging.app.com https://prod.app.com
```

### Responsive Layout Test
```bash
$B goto https://app.com/page
$B responsive /tmp/layout         # saves mobile + tablet + desktop PNGs
```

### Authenticated Flow
```bash
$B goto https://app.com/login
$B snapshot -i
$B fill @e2 "user@test.com"
$B fill @e3 "password"
$B click @e4                      # login button
$B wait --networkidle
$B snapshot -D                    # verify logged in
$B cookies                        # verify session cookie set
```

---

## Key Rules

1. **Snapshot before interact.** No exceptions. Fresh refs prevent wasted commands.
2. **Viewport before screenshot.** Set dimensions explicitly, don't assume.
3. **Diff over manual comparison.** `-D` flag saves tokens every time.
4. **Wait after state changes.** React doesn't update synchronously with your clicks.
5. **Read PNGs after capture.** Screenshots are invisible to the user until you use Read tool on them.
6. **3-strike rule.** If something fails 3 times, escalate — don't burn tokens retrying.
