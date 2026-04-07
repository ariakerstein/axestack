# Figma Slides Sync for Navis Pitch Decks

Sync your HTML pitch decks to Figma Slides for design collaboration while keeping HTML as the source of truth.

## Architecture

```
HTML (source of truth)
        │
        ▼
   parse-html-deck.cjs  ──────►  deck-content.json
                                        │
                                        ▼
                              Figma Slides Plugin
                                        │
                                        ▼
                              Figma Slides (collaboration)
```

## Files

| File | Purpose |
|------|---------|
| `parse-html-deck.cjs` | Node.js script to extract content from HTML |
| `deck-schema.json` | JSON schema for deck structure |
| `deck-content.json` | Generated JSON from your deck |
| `figma-plugin/` | Figma Slides import plugin |

## Quick Start

### 1. Parse your HTML deck to JSON

```bash
cd public/pitches/figma-sync
node parse-html-deck.cjs ../2026-institutional.html deck-content.json
```

Output:
```
Parsing: ../2026-institutional.html
Output: deck-content.json
Slides: 14

Slide summary:
  1. [title] Navis Health
  2. [content] Doctors have Epic. Patients have a mess.
  ...
```

### 2. Install the Figma Plugin

1. Open Figma Desktop
2. Go to Plugins > Development > Import plugin from manifest
3. Select `figma-sync/figma-plugin/manifest.json`

### 3. Import to Figma Slides

1. Create a new Figma Slides presentation
2. Run the "Navis Deck Sync" plugin
3. Paste the contents of `deck-content.json`
4. Click "Import Deck"

## Workflow

### Initial Setup
1. Parse HTML → JSON
2. Import JSON to Figma Slides
3. Apply design polish in Figma

### Updating Content
1. Edit your HTML source
2. Re-run parser to update JSON
3. Use plugin's "Update Slide" feature to sync specific slides

### Design Collaboration
- Figma is for visual polish and feedback
- Stakeholders can comment directly on slides
- Export feedback notes back to HTML as needed

## JSON Schema

Each slide has this structure:

```json
{
  "id": 1,
  "type": "title|content|team|comparison|metrics|ask|appendix",
  "label": "Section label",
  "background": "light|dark|gradient",
  "content": {
    "headline": "Main headline",
    "subheadline": "Supporting text",
    "bullets": ["Point 1", "Point 2"],
    "stats": [
      { "value": "5", "label": "LOIs Signed" }
    ],
    "team": [
      { "name": "Ari", "title": "CEO", "photo": "url" }
    ],
    "images": [
      { "src": "path", "alt": "description" }
    ]
  }
}
```

## Slide Types

| Type | Use Case |
|------|----------|
| `title` | Opening/closing slides |
| `content` | Standard content slides |
| `team` | Team/advisory slides |
| `comparison` | Feature matrices |
| `metrics` | Stats and traction |
| `roadmap` | Timeline slides |
| `ask` | The investment ask |
| `appendix` | Appendix dividers |

## Limitations

- **No REST API**: Figma Slides only supports Plugin API (runs inside Figma)
- **One-way sync**: Changes in Figma don't automatically update HTML
- **Images**: Image URLs must be accessible to Figma

## Future Improvements

- [ ] Bidirectional sync (export Figma changes back to HTML)
- [ ] Automatic slide matching (smart update without specifying slide ID)
- [ ] Template support (apply Figma design templates to new content)
- [ ] CLI wrapper for easier automation

## Related Files

- Source deck: `../2026-institutional.html`
- Assets: `../pitchAssets/`
- Analytics tracking: Built into HTML deck
