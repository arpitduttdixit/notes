// Chrome Extension Example Code
// This shows how to integrate with the notes server

const NOTES_SERVER = "http://localhost:8765";

let notesCache = [];

// Load all note titles on extension startup
async function loadNotes() {
  try {
    const res = await fetch(`${NOTES_SERVER}/notes`);
    const data = await res.json();
    notesCache = data.notes;
    console.log(`Loaded ${notesCache.length} notes`);
  } catch (error) {
    console.error("Failed to load notes:", error);
  }
}

// Search notes locally (instant, no server call)
function searchNotes(query) {
  const lowerQuery = query.toLowerCase();
  return notesCache.filter((note) =>
    note.title.toLowerCase().includes(lowerQuery)
  );
}

// Fetch full note body when user clicks (server call)
async function fetchNoteBody(noteId) {
  try {
    const res = await fetch(
      `${NOTES_SERVER}/notes/${encodeURIComponent(noteId)}`
    );
    const data = await res.json();
    return data.body;
  } catch (error) {
    console.error("Failed to fetch note:", error);
    return null;
  }
}

// Example usage with debounced search
let searchTimeout;
function handleSearchInput(searchTerm) {
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    const results = searchNotes(searchTerm);
    displayResults(results);
  }, 300); // 300ms debounce
}

function displayResults(results) {
  // Update your UI with search results
  console.log("Search results:", results);
}

// Handle result click
async function handleResultClick(noteId) {
  const body = await fetchNoteBody(noteId);
  if (body) {
    // Do something with the note body
    console.log("Note body:", body);
  }
}

// Initialize on load
loadNotes();
