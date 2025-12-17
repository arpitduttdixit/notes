# Mac Notes Server for Chrome Extension

A local Node.js server that provides API access to Mac Notes for Chrome extensions.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

The server will run on `http://localhost:8765`

## API Endpoints

### GET /notes
Returns all note titles and IDs (cached for fast access)

**Response:**
```json
{
  "notes": [
    { "id": "x-coredata://...", "title": "My Note Title" },
    ...
  ]
}
```

### GET /notes/:noteId
Returns the full body of a specific note

**Response:**
```json
{
  "id": "x-coredata://...",
  "body": "<html>...</html>"
}
```

### POST /notes/refresh
Refreshes the notes cache (useful if you add/edit notes while server is running)

## Chrome Extension Integration

1. Load note titles once on extension startup
2. Search happens locally in JavaScript (instant)
3. Only fetch full note body when user clicks a result

See `extension-example.js` for implementation example.

## Development

Run with auto-reload:
```bash
npm run dev
```

## Notes

- Note bodies are returned as HTML
- The server caches titles on startup for performance
- Use the `/notes/refresh` endpoint if notes change
