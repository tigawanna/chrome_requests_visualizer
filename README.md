# Chrome Requests Visualizer

A Chrome DevTools extension for visualizing network requests, detecting N+1 query patterns, and decoding JWTs. Built for developers who want to debug API calls, identify performance bottlenecks, and inspect authentication tokens.

## What This Extension Does

### 🔍 Network Request Monitoring
Captures all XHR and Fetch requests made by the current page. Unlike the built-in Network tab, this extension focuses specifically on API calls and provides specialized views for debugging.

### 🔗 N+1 Query Detection
Automatically groups requests by URL pattern. For example:
- `/api/users/1`, `/api/users/2`, `/api/users/3` → grouped as `/api/users/:id` (3x)
- Helps identify N+1 query problems where your frontend makes multiple sequential requests that could be batched

### 📊 Waterfall Visualization
See a timeline of all requests showing:
- When each request started relative to others
- Duration of each request
- Identify sequential requests that could be parallelized

### 🔐 JWT Token Decoder
Automatically detects JWT tokens in request headers and decodes them showing:
- Header (algorithm, type)
- Payload (claims, expiration, issued at)
- Expiration status (valid/expired)
- Configurable header names (default: `Authorization`)

### 💾 Session-Based Storage
Requests are stored in memory and automatically cleared on page navigation. This keeps the tool lightweight and focused on debugging the current page load.

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
| **Request Details** | Click any request to see headers, body, response, and JWT info |
| **Resizable Panels** | Drag the divider between list and details to resize |

### Waterfall Tab

Visual timeline showing request timing. Color-coded by status:
- 🟢 Green: 2xx success
- 🔵 Blue: 3xx redirect  
- 🟡 Yellow: 4xx client error
- 🔴 Red: 5xx server error

### Settings Tab

Configure which HTTP headers to scan for JWT tokens:
- Default: `Authorization`
- Add custom headers like `X-Auth-Token`, `X-JWT`, etc.

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
│   ├── RequestList.tsx    # Request list with grouping
│   ├── RequestDetail.tsx  # Request detail view
│   ├── Waterfall.tsx      # Timeline visualization
│   ├── JWTDecoder.tsx     # JWT token decoder
│   └── Settings.tsx       # Settings panel
├── hooks/                 # Custom React hooks
│   ├── useRequestStore.ts # Request state management
│   └── useNetworkCapture.ts # Chrome DevTools network API
├── db/                    # Database layer
│   └── settings.ts        # Dexie.js settings store
├── lib/                   # Utilities
│   ├── utils.ts           # Tailwind cn() helper
│   └── jwt.ts             # JWT decoding utilities
├── types/                 # TypeScript types
│   └── request.ts         # Request/Response types
├── styles/                # Global styles
│   └── globals.css        # Tailwind + theme variables
├── background.ts          # Service worker
└── manifest.json          # Extension manifest
```

---

## License

MIT
