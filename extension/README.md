# Mac Notes Chrome Extension

A Chrome extension that lets you search and read your Mac Notes directly from your browser.

## Setup

### 1. Start the Notes Server

First, make sure the Node.js server is running:

```bash
cd /Users/appel/notes
npm install
npm start
```

The server should be running on `http://localhost:8765`

### 2. Install the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `/Users/appel/notes/extension` folder

### 3. Use the Extension

1. Click the extension icon in your Chrome toolbar
2. Start typing to search your notes
3. Click any result to view the full note
4. Press Enter to open the first result
5. Click "← Back to results" to return to search

## Features

- **Instant search**: Search happens locally in your browser (fast!)
- **Lazy loading**: Note bodies are only fetched when you click
- **Keyboard shortcuts**: Press Enter to open the first result
- **Clean UI**: Simple, Mac-like design

## Troubleshooting

**"Error: Make sure the notes server is running"**
- Run `npm start` in the `/Users/appel/notes` directory
- Make sure port 8765 isn't being used by another app

**Extension shows no notes**
- Check that the server is running: `http://localhost:8765/notes`
- Try refreshing the cache: `curl -X POST http://localhost:8765/notes/refresh`

## Icons

The extension currently uses placeholder icons. To add custom icons, replace:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)
