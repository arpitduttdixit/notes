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

// Send to Claude button
const sendToClaudeBtn = document.getElementById('sendToClaude');

// Chat capture elements
const claudeActions = document.getElementById('claudeActions');
const captureChatBtn = document.getElementById('captureChat');
const chatPreviewModal = document.getElementById('chatPreview');
const closePreviewBtn = document.getElementById('closePreview');
const chatTitleInput = document.getElementById('chatTitle');
const messagesPreviewEl = document.getElementById('messagesPreview');
const selectionInfoEl = document.getElementById('selectionInfo');
const saveChatBtn = document.getElementById('saveChat');

// Chat data storage
let currentChatData = null;

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

// Helper function to extract text from HTML (removes images for text-only)
function extractTextFromHTML(html) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Remove images, scripts and styles for plain text
  tempDiv.querySelectorAll('img, script, style').forEach(el => el.remove());

  return tempDiv.textContent.trim();
}

// Helper function to extract images from HTML
function extractImagesFromHTML(html) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const images = [];

  tempDiv.querySelectorAll('img').forEach(img => {
    const src = img.src;
    if (src && src.startsWith('data:image/')) {
      images.push({
        src: src,
        alt: img.alt || ''
      });
    }
  });

  return images;
}

// Helper function to convert base64 to Blob
function base64ToBlob(base64) {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

// Send note to Claude function
async function sendToClaude() {
  try {
    // Disable button and show loading state
    sendToClaudeBtn.disabled = true;
    sendToClaudeBtn.textContent = 'Sending...';

    // Get note content
    const title = noteTitle.textContent;
    const bodyHTML = noteBody.innerHTML;
    const bodyText = extractTextFromHTML(bodyHTML);
    const images = extractImagesFromHTML(bodyHTML);

    // Format the message
    const messageText = `Here's my note titled "${title}":\n\n${bodyText}`;

    // Query current tab
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (currentTab.url?.startsWith('https://claude.ai')) {
      // Current tab is Claude - send to content script
      chrome.tabs.sendMessage(currentTab.id, {
        type: 'pasteText',
        text: messageText
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending text:', chrome.runtime.lastError);
          showStatus('Error: Make sure you are on a Claude.ai page', 'error');
          return;
        }

        // Then send each image with delays
        if (images.length > 0) {
          images.forEach((image, index) => {
            setTimeout(() => {
              chrome.tabs.sendMessage(currentTab.id, {
                type: 'uploadImage',
                imageBlob: image.src,
                imageName: `note-image-${index + 1}.png`
              });
            }, (index + 1) * 500); // Start after 500ms, then 500ms between each
          });

          setTimeout(() => {
            showStatus(`Note sent with ${images.length} image(s)!`, 'success');
          }, (images.length + 1) * 500 + 500);
        } else {
          showStatus('Note sent to Claude!', 'success');
        }
      });
    } else {
      // Open new Claude tab
      const newTab = await chrome.tabs.create({
        url: 'https://claude.ai/new',
        active: true
      });

      // Wait for page to load
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === newTab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);

          // Wait for Claude editor to be ready
          setTimeout(() => {
            // Send text
            chrome.tabs.sendMessage(newTab.id, {
              type: 'pasteText',
              text: messageText
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.error('Error:', chrome.runtime.lastError);
                return;
              }

              // Send images
              if (images.length > 0) {
                images.forEach((image, index) => {
                  setTimeout(() => {
                    chrome.tabs.sendMessage(newTab.id, {
                      type: 'uploadImage',
                      imageBlob: image.src,
                      imageName: `note-image-${index + 1}.png`
                    });
                  }, (index + 1) * 500);
                });

                showStatus(`Opening Claude with ${images.length} image(s)...`, 'success');
              } else {
                showStatus('Opening Claude...', 'success');
              }
            });
          }, 1500); // Wait 1.5s for editor to fully load
        }
      });
    }

    setTimeout(() => hideStatus(), 3000);
  } catch (error) {
    console.error('Error sending to Claude:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    sendToClaudeBtn.disabled = false;
    sendToClaudeBtn.textContent = '💬 Send to Claude';
  }
}

// Send to Claude button event listener
sendToClaudeBtn.addEventListener('click', sendToClaude);

// ============================================
// Chat Capture Functionality
// ============================================

// Show/hide capture button based on current tab
async function updateUIForClaudeChat() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

  if (tab?.url?.includes('claude.ai/chat/')) {
    claudeActions.classList.remove('hidden');
  } else {
    claudeActions.classList.add('hidden');
  }
}

// Capture chat button handler
async function captureChat() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

  // Show loading state
  showStatus('Extracting chat...', 'info');

  // Add timeout to detect if content script isn't responding
  const timeout = setTimeout(() => {
    showStatus('Error: Content script not responding. Try refreshing the Claude page.', 'error');
  }, 3000);

  // Request chat data from content script
  chrome.tabs.sendMessage(tab.id, {type: 'extractChat'}, (response) => {
    clearTimeout(timeout);

    if (chrome.runtime.lastError) {
      console.error('Chrome runtime error:', chrome.runtime.lastError);
      showStatus('Error: Content script not loaded. Refresh the Claude page and try again.', 'error');
      return;
    }

    if (!response?.success) {
      console.error('Extraction failed:', response);
      showStatus(`Error: ${response?.error || 'Could not extract chat'}`, 'error');
      return;
    }

    console.log('Chat extracted successfully:', response.data.totalMessages, 'messages');
    hideStatus();
    showChatPreview(response.data);
  });
}

// Show chat preview modal
function showChatPreview(chatData) {
  currentChatData = chatData;

  // Show modal
  chatPreviewModal.classList.remove('hidden');

  // Update selection info
  updateSelectionInfo();

  // Clear previous title
  chatTitleInput.value = '';

  // Set default mode to quick
  document.querySelector('input[name="mode"][value="quick"]').checked = true;
}

// Update selection info based on current mode
function updateSelectionInfo() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  let count = 0;

  if (!currentChatData) {
    selectionInfoEl.textContent = '0 messages selected';
    return;
  }

  switch(mode) {
    case 'quick':
      count = Math.min(10, currentChatData.messages.length);
      break;
    case 'code':
      count = currentChatData.messages.filter(m => m.hasCode).length + 1; // +1 for last assistant message
      break;
    case 'full':
      count = currentChatData.messages.length;
      break;
    case 'custom':
      count = currentChatData.messages.length; // TODO: implement custom selection
      break;
  }

  selectionInfoEl.textContent = `${count} message${count !== 1 ? 's' : ''} selected`;
}

// Generate automatic title from chat
function generateTitle(chatData) {
  const firstUserMsg = chatData.messages.find(m => m.role === 'user');
  if (firstUserMsg) {
    const title = firstUserMsg.content.substring(0, 50).trim();
    return title.length < firstUserMsg.content.length ? title + '...' : title;
  }
  return `Claude Chat - ${new Date().toLocaleDateString()}`;
}

// Format messages into note body
function formatMessages(messages, chatData) {
  let body = `Source: ${chatData.url}\n`;
  body += `Saved: ${new Date().toLocaleString()}\n`;
  body += `Messages: ${messages.filter(m => m.role === 'user').length} user, `;
  body += `${messages.filter(m => m.role === 'assistant').length} assistant\n\n`;
  body += '─────────────────────────────────\n\n';

  messages.forEach(msg => {
    if (msg.role === 'user') {
      body += '👤 User:\n';
    } else {
      body += '🤖 Claude:\n';
    }
    body += msg.content + '\n\n';
    body += '─────────────────────────────────\n\n';
  });

  return body;
}

// Format chat note based on selected mode
function formatChatNote(chatData, mode) {
  let messages = chatData.messages;

  // Filter based on mode
  switch(mode) {
    case 'quick':
      messages = messages.slice(-10); // Last 5 exchanges (10 messages)
      break;
    case 'code':
      const codeMessages = messages.filter(m => m.hasCode);
      // Always include last assistant message
      const lastAssistant = messages.filter(m => m.role === 'assistant').pop();
      if (lastAssistant && !codeMessages.find(m => m.index === lastAssistant.index)) {
        codeMessages.push(lastAssistant);
      }
      // Sort by index to maintain order
      messages = codeMessages.sort((a, b) => a.index - b.index);
      break;
    case 'full':
      // Use all messages
      break;
    case 'custom':
      // TODO: implement custom selection
      break;
  }

  // Generate title
  const title = chatTitleInput.value.trim() || generateTitle(chatData);

  // Format body
  const body = formatMessages(messages, chatData);

  return { title, body };
}

// Save chat as note
async function saveChatAsNote() {
  if (!currentChatData) {
    showStatus('Error: No chat data available', 'error');
    return;
  }

  const mode = document.querySelector('input[name="mode"]:checked').value;
  const { title, body } = formatChatNote(currentChatData, mode);

  // Disable button while saving
  saveChatBtn.disabled = true;
  saveChatBtn.textContent = 'Saving...';

  try {
    const response = await fetch(`${NOTES_SERVER}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create note');
    }

    // Refresh cache
    const notesResponse = await fetch(`${NOTES_SERVER}/notes`);
    const notesData = await notesResponse.json();
    notesCache = notesData.notes;

    // Close modal and show success
    chatPreviewModal.classList.add('hidden');
    showStatus(`Note "${title}" created!`, 'success');

    // Update display
    displayResults(notesCache);

  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    saveChatBtn.disabled = false;
    saveChatBtn.textContent = 'Save to Notes';
  }
}

// Event listeners for chat capture
captureChatBtn.addEventListener('click', captureChat);
saveChatBtn.addEventListener('click', saveChatAsNote);
closePreviewBtn.addEventListener('click', () => {
  chatPreviewModal.classList.add('hidden');
});

// Update selection info when mode changes
document.querySelectorAll('input[name="mode"]').forEach(radio => {
  radio.addEventListener('change', updateSelectionInfo);
});

// Update UI when tab changes
chrome.tabs.onActivated.addListener(updateUIForClaudeChat);
chrome.tabs.onUpdated.addListener(updateUIForClaudeChat);

// Check on load
updateUIForClaudeChat();

// Initialize the extension
init();
