const express = require("express");
const { execSync } = require("child_process");
const cors = require("cors");

const app = express();
const PORT = 8765;

// Enable CORS for Chrome extension
app.use(cors());

// Parse JSON bodies
app.use(express.json());

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
    const result = execSync(`osascript -e '${script}'`, { encoding: "utf-8" });
    const notes = [];

    result
      .trim()
      .split("###")
      .forEach((note) => {
        if (note.includes("|||")) {
          const [id, title] = note.split("|||");
          notes.push({ id: id.trim(), title: title.trim() });
        }
      });

    return notes;
  } catch (error) {
    console.error("Error fetching notes:", error);
    return [];
  }
}

// Initialize cache
console.log("Loading notes...");
notesCache = fetchAllTitles();
console.log(`Loaded ${notesCache.length} notes`);

// GET /notes - Return all note titles
app.get("/notes", (req, res) => {
  res.json({ notes: notesCache });
});

// GET /notes/:noteId - Return specific note body
app.get("/notes/:noteId", (req, res) => {
  const { noteId } = req.params;

  // Escape single quotes in note ID for AppleScript
  const escapedId = noteId.replace(/'/g, "\\'");

  const script = `
    tell application "Notes"
      try
        set noteBody to body of note id "${escapedId}"
        return noteBody
      on error errMsg
        return "Error: " & errMsg
      end try
    end tell
  `;

  try {
    const body = execSync(`osascript -e '${script}'`, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });
    const trimmedBody = body.trim();

    // Check if body is empty or an error message
    if (!trimmedBody || trimmedBody.length === 0) {
      res.json({
        id: noteId,
        body: "<p><em>This note appears to be empty</em></p>",
      });
    } else if (trimmedBody.startsWith("Error:")) {
      console.error("AppleScript error:", trimmedBody);
      res.json({
        id: noteId,
        body: `<p><em>Could not load note: ${trimmedBody}</em></p>`,
      });
    } else {
      res.json({ id: noteId, body: trimmedBody });
    }
  } catch (error) {
    console.error("Error fetching note:", error);

    // Handle buffer overflow errors
    if (error.code === "ENOBUFS" || error.message.includes("maxBuffer")) {
      res.json({
        id: noteId,
        body: '<div class="no-results"><strong>Note too large to display</strong><br><br>This note contains large embedded images or attachments that exceed the display limit. Please open it in the Notes app.</div>',
      });
    } else {
      res
        .status(500)
        .json({ error: "Failed to fetch note", message: error.message });
    }
  }
});

// POST /notes - Create a new note
app.post("/notes", (req, res) => {
  const { title, body } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  // Escape quotes for AppleScript
  const escapedTitle = title.replace(/"/g, '\\"').replace(/'/g, "\\'");
  const escapedBody = (body || "").replace(/"/g, '\\"').replace(/'/g, "\\'");

  const script = `
    tell application "Notes"
      try
        set newNote to make new note at folder "Notes" with properties {name:"${escapedTitle}", body:"${escapedBody}"}
        return id of newNote
      on error errMsg
        return "Error: " & errMsg
      end try
    end tell
  `;

  try {
    const result = execSync(`osascript -e '${script}'`, { encoding: "utf-8" });
    const trimmedResult = result.trim();

    if (trimmedResult.startsWith("Error:")) {
      console.error("AppleScript error:", trimmedResult);
      return res
        .status(500)
        .json({ error: "Failed to create note", message: trimmedResult });
    }

    // Refresh cache after creating note
    notesCache = fetchAllTitles();

    res.json({
      message: "Note created successfully",
      noteId: trimmedResult,
      title: title,
    });
  } catch (error) {
    console.error("Error creating note:", error);
    res
      .status(500)
      .json({ error: "Failed to create note", message: error.message });
  }
});

// POST /notes/refresh - Refresh the cache
app.post("/notes/refresh", (req, res) => {
  notesCache = fetchAllTitles();
  res.json({ message: "Cache refreshed", count: notesCache.length });
});

app.listen(PORT, () => {
  console.log(`Notes server running on http://localhost:${PORT}`);
});
