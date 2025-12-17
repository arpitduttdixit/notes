const NOTES_SERVER = 'http://localhost:8765';

let notesCache = [];
let searchTimeout = null;

// DOM elements
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const noteView = document.getElementById('noteView');
const noteTitle = document.getElementById('noteTitle');
const noteBody = document.getElementById('noteBody');
const backButton = document.getElementById('backButton');
const statusEl = document.getElementById('status');

// Initialize on load
async function init() {
  showStatus('Loading notes...', 'info');

  try {
    const response = await fetch(`${NOTES_SERVER}/notes`);

    if (!response.ok) {
      throw new Error('Failed to connect to notes server');
    }

    const data = await response.json();
    notesCache = data.notes;

    showStatus(`Loaded ${notesCache.length} notes`, 'success');
    setTimeout(() => hideStatus(), 2000);

    // Show all notes initially
    displayResults(notesCache);
  } catch (error) {
    console.error('Error loading notes:', error);
    showStatus('Error: Make sure the notes server is running (npm start)', 'error');
  }
}

// Search input handler with debounce
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim();

  clearTimeout(searchTimeout);

  if (!query) {
    displayResults(notesCache);
    return;
  }

  searchTimeout = setTimeout(() => {
    const results = searchNotes(query);
    displayResults(results);
  }, 300);
});

// Search notes locally
function searchNotes(query) {
  const lowerQuery = query.toLowerCase();
  return notesCache.filter(note =>
    note.title.toLowerCase().includes(lowerQuery)
  );
}

// Display search results
function displayResults(results) {
  resultsContainer.innerHTML = '';

  if (results.length === 0) {
    resultsContainer.innerHTML = '<div class="no-results">No notes found</div>';
    return;
  }

  results.forEach(note => {
    const item = document.createElement('div');
    item.className = 'result-item';
    item.innerHTML = `<div class="result-title">${escapeHtml(note.title)}</div>`;
    item.addEventListener('click', () => openNote(note));
    resultsContainer.appendChild(item);
  });
}

// Open and display a note
async function openNote(note) {
  // Show loading state
  noteView.classList.remove('hidden');
  resultsContainer.classList.add('hidden');
  searchInput.parentElement.classList.add('hidden');

  noteTitle.textContent = note.title;
  noteBody.innerHTML = '<div class="loading">Loading note...</div>';

  try {
    const response = await fetch(`${NOTES_SERVER}/notes/${encodeURIComponent(note.id)}`);
    const data = await response.json();

    // Display the note body
    noteBody.innerHTML = data.body;
  } catch (error) {
    console.error('Error fetching note:', error);
    noteBody.innerHTML = '<div class="no-results">Error loading note</div>';
  }
}

// Back button handler
backButton.addEventListener('click', () => {
  noteView.classList.add('hidden');
  resultsContainer.classList.remove('hidden');
  searchInput.parentElement.classList.remove('hidden');
  searchInput.focus();
});

// Status message helpers
function showStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove('hidden');
}

function hideStatus() {
  statusEl.classList.add('hidden');
}

// Utility to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Handle Enter key to open first result
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const firstResult = resultsContainer.querySelector('.result-item');
    if (firstResult) {
      firstResult.click();
    }
  }
});

// Initialize the extension
init();
