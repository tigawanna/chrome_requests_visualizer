# Chrome Requests Visualizer

A Chrome DevTools extension for visualizing network requests, detecting N+1 query patterns, replaying requests, and decoding JWTs. Built for developers who want to debug API calls, identify performance bottlenecks, and inspect authentication tokens.

<!-- TODO: Add hero screenshot -->
![Hero Screenshot](screenshots/hero.png)

## ✨ Features

### 🔍 Network Request Monitoring
Captures XHR, Fetch, and Document requests made by the current page. Unlike the built-in Network tab, this extension focuses specifically on API calls and provides specialized views for debugging.

- **Status indicators** - Color-coded dots show request status at a glance
- **Search & Filter** - Filter by URL, method (GET, POST, etc.), and sort by time/status
- **Request count** - See filtered vs total request counts

<!-- TODO: Add request list screenshot -->
![Request List](screenshots/request-list.png)

### 🔗 N+1 Query Detection
Automatically groups requests by URL pattern to identify N+1 query problems:

- `/api/users/1`, `/api/users/2`, `/api/users/3` → grouped as `/api/users/:id` (3x)
- Smart pattern detection for IDs, UUIDs, and MongoDB ObjectIDs
- Expandable groups to see individual requests

<!-- TODO: Add N+1 detection screenshot -->
![N+1 Detection](screenshots/n1-detection.png)

### 🌐 Session Persistence
Track requests across page navigations within a browsing session:

- **Domain grouping** - Requests organized by domain (e.g., `github.com`, `api.github.com`)
- **Page grouping** - Further grouped by page path (`/`, `/repos`, `/settings`)
- **Copy as JSON** - Export domain or page request summaries
- **Retention settings** - Configure how long to keep sessions (1 hour to 1 week)

<!-- TODO: Add sessions view screenshot -->
![Sessions View](screenshots/sessions-view.png)

### 🔄 Request Replay
Replay any captured request with full editing capabilities:

- **Edit URL, method, headers, and body** before replaying
- **Cross-origin support** - Requests proxied through background script
- **Detailed error reporting** - Clear error messages with suggestions
- **Response viewer** - See status, headers, and body of replay response

<!-- TODO: Add request replay screenshot -->
![Request Replay](screenshots/request-replay.png)

### 🔐 JWT Token Decoder
Automatically detects and decodes JWT tokens in request headers:

- **Header & Payload** - Decoded and formatted JSON
- **Expiration status** - Visual indicator for valid/expired tokens
- **Configurable headers** - Scan `Authorization`, `X-Auth-Token`, or custom headers

<!-- TODO: Add JWT decoder screenshot -->
![JWT Decoder](screenshots/jwt-decoder.png)

### 📋 Copy as JSON
Export request data for documentation or debugging:

- **Full request details** - URL, method, status, headers, body, response
- **Truncated for readability** - Large arrays limited to 5 items, strings to 10 lines
- **Compact headers** - Formatted as `["key: value"]` array
- **Formatted output** - Pretty-printed JSON ready for Slack/README

<!-- TODO: Add copy JSON screenshot -->
![Copy JSON](screenshots/copy-json.png)

### ⚙️ Settings
Customize the extension behavior:

- **Session retention** - 1 hour, 6 hours, 12 hours, 24 hours, 48 hours, 3 days, or 1 week
- **JWT headers** - Configure which headers to scan for JWT tokens
- **Theme** - Light, dark, or system preference

<!-- TODO: Add settings screenshot -->
![Settings](screenshots/settings.png)

---

## Installation

```bash
# Install dependencies
pnpm install
```

---

## Development

### Building the Extension

```bash
# Development build with watch mode
pnpm dev

# Production build
pnpm build
```

### Loading in Chrome (Development)

1. Run `pnpm build` to create the `dist` folder
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select the `dist` folder from this project
6. The extension is now installed!

### Opening the Extension

1. Open any webpage you want to debug
2. Open Chrome DevTools (`F12` or `Cmd+Option+I` on Mac / `Ctrl+Shift+I` on Windows/Linux)
3. Look for the **"Requests Visualizer"** tab in the DevTools panel
4. Start interacting with the page to capture requests

### Reloading After Code Changes

After making code changes:

1. Run `pnpm build` (or keep `pnpm dev` running for auto-rebuild)
2. Go to `chrome://extensions`
3. Find **"Chrome Requests Visualizer"** in the list
4. Click the **refresh icon** (circular arrow) on the extension card
5. **Close and reopen DevTools** to see your changes

> **Tip:** You must close and reopen DevTools for panel changes to take effect. Simply refreshing the page won't update the DevTools panel.

### Debugging the Extension

- **DevTools for DevTools:** Right-click inside the Requests Visualizer panel → "Inspect" to open DevTools for the extension itself
- **Background script logs:** Go to `chrome://extensions` → Click "Service Worker" link under the extension
- **Console errors:** Check the DevTools console in both the page and the extension's DevTools

---

## Usage Guide

### Requests Tab

| Feature | Description |
|---------|-------------|
| **Grouped View** | Groups similar URLs together with count badges (e.g., `3x /api/users/:id`) |
| **Flat View** | Shows all requests chronologically |
| **Search** | Filter requests by URL or method |
| **Method Filter** | Show only GET, POST, PUT, PATCH, DELETE, or OPTIONS |
| **Sort Options** | Sort by newest, oldest, method, or status |
| **Request Details** | Click any request to see headers, body, response, and JWT info |
| **Copy JSON** | Export full request details as formatted JSON |
| **Replay** | Re-send any request with editable parameters |

### Sessions Tab

| Feature | Description |
|---------|-------------|
| **Domain Groups** | Requests organized by domain with total counts |
| **Page Groups** | Within each domain, grouped by page path |
| **Expandable** | Click to expand/collapse domains and pages |
| **Copy Summary** | Export domain or page requests as JSON |
| **Clear Controls** | Clear individual pages or entire domains |

### Settings Tab

| Setting | Description |
|---------|-------------|
| **Session Retention** | How long to keep request history (1 hour to 1 week) |
| **JWT Headers** | Which headers to scan for JWT tokens |
| **Theme** | Light, dark, or system preference |

---

## Publishing to Chrome Web Store

### Pre-Publish Checklist

1. **Update version** in `package.json`:
   ```json
   "version": "1.0.0"
   ```

2. **Build for production**:
   ```bash
   pnpm build
   ```

3. **Test the production build**:
   - Load the `dist` folder as unpacked extension
   - Verify all features work correctly
   - Check for console errors

4. **Create ZIP file**:
   ```bash
   cd dist
   zip -r ../request-visualizer.zip .
   ```

5. **Prepare store assets**:
   - Icon: 128x128 PNG (already in `public/icon/128.png`)
   - Screenshots: 1280x800 or 640x400 PNG/JPEG
   - Promotional images (optional): 440x280 small, 920x680 large

### Publishing Steps

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay one-time $5 developer registration fee (if not already registered)
3. Click **"New Item"**
4. Upload `request-visualizer.zip`
5. Fill in store listing:
   - **Name:** Chrome Requests Visualizer
   - **Summary:** Visualize network requests, detect N+1 patterns, decode JWTs
   - **Description:** Full description of features
   - **Category:** Developer Tools
   - **Language:** English
6. Upload screenshots and icons
7. Set **visibility** (Public/Unlisted)
8. Submit for review (usually takes 1-3 business days)

### Updating Published Extension

1. Increment version in `package.json`
2. Run `pnpm build`
3. Create new ZIP from `dist` folder
4. Go to Developer Dashboard → Your extension → "Package" tab
5. Upload new ZIP
6. Submit for review

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Vite** | Build tool with hot reload |
| **vite-plugin-web-extension** | Chrome extension scaffolding |
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Tailwind CSS v4** | Styling |
| **shadcn/ui** | UI components |
| **react-resizable-panels** | Resizable panel layout |
| **TanStack Query** | State management |
| **Dexie.js** | IndexedDB wrapper for settings |
| **Lucide React** | Icons |

---

## Project Structure

```
src/
├── devtools/              # DevTools panel entry
│   ├── devtools.html      # DevTools page (registers panel)
│   ├── devtools.ts        # Panel registration script
│   ├── panel.html         # Panel HTML entry
│   ├── panel.tsx          # React entry point
│   └── App.tsx            # Main app component
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── resizable.tsx
│   │   ├── scroll-area.tsx
│   │   └── tabs.tsx
│   ├── RequestList.tsx    # Request list with grouping, search, filter
│   ├── RequestDetail.tsx  # Request detail view with copy JSON
│   ├── ReplayRequest.tsx  # Request replay with editing
│   ├── SessionsView.tsx   # Domain/page grouped sessions
│   ├── JWTDecoder.tsx     # JWT token decoder
│   └── Settings.tsx       # Settings panel (retention, JWT headers)
├── hooks/                 # Custom React hooks
│   ├── useRequestStore.ts # Request state with session management
│   └── useNetworkCapture.ts # Chrome DevTools network API
├── db/                    # Database layer
│   └── settings.ts        # Dexie.js settings store
├── lib/                   # Utilities
│   ├── utils.ts           # Tailwind cn() helper
│   ├── jwt.ts             # JWT decoding utilities
│   └── clipboard.ts       # Clipboard API with fallback
├── types/                 # TypeScript types
│   └── request.ts         # Request, PageSession, DomainGroup types
├── styles/                # Global styles
│   └── globals.css        # Tailwind + theme variables
├── background.ts          # Service worker with fetch proxy
└── manifest.json          # Extension manifest
```

---

## License

MIT
