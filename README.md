# PinPoint - VS Code Extension

**Pick UI elements and inject structured context directly into your AI coding agent** - without full-screen screenshots.

## Overview

PinPoint is a VS Code extension that replaces the tedious "screenshot → paste → explain" workflow with instant, structured UI context capture. Hover over elements in a running web app, click to capture, and get AI-optimized context automatically injected into your chat.

### Problem it solves

- **Screenshot fatigue**: No more full-page screenshots that add noise
- **Ambiguity**: AI agents often misunderstand UI intent from images
- **Token waste**: Screenshots consume expensive API tokens
- **Context loss**: Missing the structural HTML context AI agents need

### Solution

Instead of screenshots, PinPoint captures:
- **Robust selectors** (data-testid → stable ID → role+aria → position-based)
- **Element + parent HTML** (clean, truncated)
- **Layout info** (bbox, positioning, viewport context)
- **Computed style diffs** (what's explicitly set vs. inherited)
- **Optional element screenshot** (for visual edge cases)

All formatted as AI-friendly markdown, ready to paste.

---

## Installation

1. Clone the repository
2. `npm install`
3. `npm run compile`
4. In VS Code: **Run Extension** (F5) or package with `vsce package`

## Usage

### Quick Start

1. **Start the picker**: Run command `PinPoint: Start Picker`
2. **Enter URL**: Type the localhost or external URL to inspect
3. **Hover & click**: Hover over elements in the browser; click to capture
4. **Chat opens**: Formatted context is automatically injected
5. **Add your instruction**: Type "Make this button look like..." and send


### Commands

- `PinPoint: Start Picker` - Launch browser + inspect mode
- `PinPoint: Stop Picker` - Cancel and close browser
- `PinPoint: Toggle Screenshot` - Enable/disable element screenshots
- `PinPoint: Set Mode` - Choose Quick Fix / Layout / CSS / Visual
- `PinPoint: Clear Selection` - Clear multi-select queue

### Settings

```json
{
  "pinpoint.defaultMode": "quick-fix",        // quick-fix | layout | css | visual
  "pinpoint.screenshotEnabled": false,         // Enable screenshots by default
  "pinpoint.contextRadius": 1                  // Parent levels to include (0-3)
}
```

---

## Capture Modes

### Quick Fix (default)
Minimal, fast capture for one-liner fixes.

**Output:**
```markdown
## UI Element Context

**URL:** http://localhost:3000
**Selector:** `button[data-testid="submit"]`
**Role:** button
**Text:** "Submit Form"

### Element Structure
<button data-testid="submit" class="btn-primary">Submit Form</button>

### Key Styles
- display: block
- padding: 12px 24px
- background-color: #3b82f6

### Layout
- Position: absolute, top: 100px, left: 200px
- Size: 120px × 40px

---
```

### Layout
Element + parent HTML + layout-critical styles.

### CSS
Computed style diff (what's explicitly set vs. inherited) + class list.

### Visual
Screenshot + bbox + minimal metadata.

---

## Architecture

### Components

**Extension Host** (`src/extension.ts`)
- Commands, settings, status bar UI
- Lifecycle management (cleanup on deactivate)

**Browser Session Manager** (`src/browser/`)
- Puppeteer-core Chrome launch with temp profile
- Cleans up on exit (no profile pollution)

**Extraction Pipeline** (`src/extraction/`)
- `SelectorExtractor`: Robust selectors with confidence scoring
- `DomExtractor`: Element + parent HTML (clean, truncated)
- `StyleExtractor`: Computed styles + parent diff
- `LayoutExtractor`: Bbox, viewport, scroll info
- `ScreenshotExtractor`: Element screenshot via Puppeteer
- `Redactor`: Truncates text, strips data URLs, removes event handlers

**Schemas** (`src/schemas/`)
- Zod-validated `MaxContext` (internal format)
- Mode-specific exporters (QuickFix, Layout, CSS, Visual)

**Chat Injection** (`src/export/`)
- `ContextFormatter`: Markdown generation for AI agents
- Direct VS Code chat input injection via `workbench.action.chat.open`

**Picker Controller** (`src/picker/`)
- Orchestrates extraction pipeline
- Manages multi-element selection (Shift+click)
- Handles temp file cleanup

---

## Technical Details

### Browser Control
- **Puppeteer-core** (CDP) for robust element selection
- **Managed Chrome instance** (temp profile, auto-cleanup)
- Overlay hover effect + click detection

### Screenshots
- **Element-level** via `elementHandle.screenshot()`
- Saved to `.pinpoint/temp/element-<timestamp>.png`
- Auto-referenced in chat via @ mention
- Auto-deleted on extension close

### Data Flow
```
Click element →
  Extract selectors (robust priority order)
  Extract DOM (element + parents, cleaned)
  Extract styles (computed + parent diff)
  Extract layout (bbox, viewport, scroll)
  Optional: screenshot
  Redact sensitive data (truncate, strip URLs)
→ Format as markdown
→ Inject to VS Code chat
→ User adds instruction + sends
```

### Selector Priority
1. `data-testid`, `data-test`, `data-qa` (explicit automation attributes)
2. Non-UUID `id` (stable, semantic)
3. `role` + unique `aria-label` (accessibility)
4. Stable class combo (avoid utility classes)
5. Position-based (nth-of-type) fallback

### Style Diff
Computes parent styles, keeps only layout-critical properties:
- Display, position, dimensions (width, height)
- Spacing (margin, padding)
- Flexbox/Grid (flex-direction, justify-content, gap, etc.)
- Overflow, z-index

---


## Troubleshooting

### Chrome not found
Make sure Chrome/Chromium is installed. On Windows, check `Program Files/Google/Chrome`. On macOS, check `/Applications/Google Chrome.app`.

### Inspector gets stuck
Press `Escape` to cancel, or run `PinPoint: Stop Picker`.

### Screenshots not saving
Check that `.pinpoint/temp/` is writable. The extension creates it automatically.

### Selectors are unstable
If you see UUIDs or random hashes in captured selectors, that's a sign the app doesn't use stable IDs. The picker falls back to position-based selectors, which may break if the DOM changes.

---

## Development

### Build
```bash
npm run compile
```

### Watch
```bash
npm run watch
```

### Test in VS Code
Press `F5` to launch extension in a new VS Code window.

---

## License

MIT
