const express = require('express');
const { execSync } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = 8765;

// Enable CORS for Chrome extension
app.use(cors());

// Cache for note titles
let notesCache = [];

// Fetch all note titles on startup
function fetchAllTitles() {
  const script = `
    tell application "Notes"
      set output to ""
      repeat with n in every note
        set output to output & (id of n) & "|||" & (name of n) & "###"
      end repeat
      return output
    end tell
  `;

  try {
    const result = execSync(`osascript -e '${script}'`, { encoding: 'utf-8' });
    const notes = [];

    result.trim().split('###').forEach(note => {
      if (note.includes('|||')) {
        const [id, title] = note.split('|||');
        notes.push({ id: id.trim(), title: title.trim() });
      }
    });

    return notes;
  } catch (error) {
    console.error('Error fetching notes:', error);
    return [];
  }
}

// Initialize cache
console.log('Loading notes...');
notesCache = fetchAllTitles();
console.log(`Loaded ${notesCache.length} notes`);

// GET /notes - Return all note titles
app.get('/notes', (req, res) => {
  res.json({ notes: notesCache });
});

// GET /notes/:noteId - Return specific note body
app.get('/notes/:noteId', (req, res) => {
  const { noteId } = req.params;

  const script = `
    tell application "Notes"
      return body of note id "${noteId}"
    end tell
  `;

  try {
    const body = execSync(`osascript -e '${script}'`, { encoding: 'utf-8' });
    res.json({ id: noteId, body: body.trim() });
  } catch (error) {
    res.status(404).json({ error: 'Note not found' });
  }
});

// POST /notes/refresh - Refresh the cache
app.post('/notes/refresh', (req, res) => {
  notesCache = fetchAllTitles();
  res.json({ message: 'Cache refreshed', count: notesCache.length });
});

app.listen(PORT, () => {
  console.log(`Notes server running on http://localhost:${PORT}`);
});
