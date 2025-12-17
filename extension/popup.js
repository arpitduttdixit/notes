const NOTES_SERVER = 'http://localhost:8765';

let notesCache = [];
let searchTimeout = null;
let currentZoom = 100; // Current zoom level percentage

// DOM elements
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const noteView = document.getElementById('noteView');
const noteTitle = document.getElementById('noteTitle');
const noteBody = document.getElementById('noteBody');
const backButton = document.getElementById('backButton');
const statusEl = document.getElementById('status');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomResetBtn = document.getElementById('zoomReset');
const zoomLevelEl = document.getElementById('zoomLevel');

// New note form elements
const newNoteButton = document.getElementById('newNoteButton');
const newNoteForm = document.getElementById('newNoteForm');
const noteTitleInput = document.getElementById('noteTitleInput');
const noteBodyInput = document.getElementById('noteBodyInput');
const createNoteButton = document.getElementById('createNote');
const cancelNoteButton = document.getElementById('cancelNote');

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
    if (data.body && data.body !== 'undefined') {
      noteBody.innerHTML = data.body;
    } else {
      noteBody.innerHTML = '<div class="no-results">This note appears to be empty</div>';
    }
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

  // Reset zoom when going back
  zoomReset();
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

// Zoom functionality
function setZoom(zoomLevel) {
  currentZoom = Math.max(50, Math.min(200, zoomLevel)); // Limit between 50% and 200%
  noteBody.style.transform = `scale(${currentZoom / 100})`;
  noteBody.style.transformOrigin = 'top left';
  zoomLevelEl.textContent = `${currentZoom}%`;
}

function zoomIn() {
  setZoom(currentZoom + 10);
}

function zoomOut() {
  setZoom(currentZoom - 10);
}

function zoomReset() {
  setZoom(100);
}

// Zoom button event listeners
zoomInBtn.addEventListener('click', zoomIn);
zoomOutBtn.addEventListener('click', zoomOut);
zoomResetBtn.addEventListener('click', zoomReset);

// Keyboard shortcuts for zoom
document.addEventListener('keydown', (e) => {
  // Check if Cmd (Mac) or Ctrl (Windows/Linux) is pressed
  const isCmdOrCtrl = e.metaKey || e.ctrlKey;

  if (isCmdOrCtrl && !noteView.classList.contains('hidden')) {
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      zoomIn();
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      zoomOut();
    } else if (e.key === '0') {
      e.preventDefault();
      zoomReset();
    }
  }
});

// New note functionality
function showNewNoteForm() {
  newNoteForm.classList.remove('hidden');
  resultsContainer.classList.add('hidden');
  noteView.classList.add('hidden');
  noteTitleInput.value = '';
  noteBodyInput.value = '';
  noteTitleInput.focus();
}

function hideNewNoteForm() {
  newNoteForm.classList.add('hidden');
  resultsContainer.classList.remove('hidden');
  searchInput.focus();
}

async function createNote() {
  const title = noteTitleInput.value.trim();
  const body = noteBodyInput.value.trim();

  if (!title) {
    showStatus('Please enter a note title', 'error');
    return;
  }

  // Disable button while creating
  createNoteButton.disabled = true;
  createNoteButton.textContent = 'Creating...';

  try {
    const response = await fetch(`${NOTES_SERVER}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, body })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create note');
    }

    // Refresh notes cache
    const notesResponse = await fetch(`${NOTES_SERVER}/notes`);
    const notesData = await notesResponse.json();
    notesCache = notesData.notes;

    showStatus(`Note "${title}" created successfully!`, 'success');
    setTimeout(() => hideStatus(), 3000);

    // Hide form and show results
    hideNewNoteForm();
    displayResults(notesCache);
  } catch (error) {
    console.error('Error creating note:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    createNoteButton.disabled = false;
    createNoteButton.textContent = 'Create Note';
  }
}

// New note button event listeners
newNoteButton.addEventListener('click', showNewNoteForm);
cancelNoteButton.addEventListener('click', hideNewNoteForm);
createNoteButton.addEventListener('click', createNote);

// Allow Enter key to create note when in title field
noteTitleInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    createNote();
  }
});

// Initialize the extension
init();
