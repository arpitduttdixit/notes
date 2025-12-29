// Content script that runs on claude.ai
// This script has elevated privileges and can directly manipulate the page DOM

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'pasteText') {
    pasteTextToClaude(message.text);
    sendResponse({ success: true });
  } else if (message.type === 'uploadImage') {
    uploadImageToClaude(message.imageBlob, message.imageName);
    sendResponse({ success: true });
  }
  return true; // Keep message channel open for async response
});

// Paste text into Claude's editor
function pasteTextToClaude(text) {
  const editor = document.querySelector('.ProseMirror');
  if (!editor) {
    console.error('ProseMirror editor not found');
    return false;
  }

  editor.focus();

  // Clear existing content
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection.removeAllRanges();
  selection.addRange(range);
  document.execCommand('delete');

  // Paste text
  const clipboardData = new DataTransfer();
  clipboardData.setData('text/plain', text);
  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: clipboardData
  });
  editor.dispatchEvent(pasteEvent);

  return true;
}

// Upload image to Claude
function uploadImageToClaude(base64Data, imageName) {
  // Convert base64 to Blob
  const parts = base64Data.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  const blob = new Blob([uInt8Array], { type: contentType });

  // Create File object (key difference from just Blob)
  const file = new File([blob], imageName, { type: contentType });

  // Method 1: Try file input (most reliable)
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // Trigger events that Claude listens to
    const changeEvent = new Event('change', { bubbles: true });
    fileInput.dispatchEvent(changeEvent);

    const inputEvent = new Event('input', { bubbles: true });
    fileInput.dispatchEvent(inputEvent);

    console.log('Image uploaded via file input');
    return true;
  }

  // Method 2: Fallback to paste event
  const editor = document.querySelector('.ProseMirror');
  if (editor) {
    editor.focus();

    // Add newline before image
    const textData = new DataTransfer();
    textData.setData('text/plain', '\n');
    editor.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: textData
    }));

    // Paste image
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer
    });
    editor.dispatchEvent(pasteEvent);

    console.log('Image uploaded via paste event');
    return true;
  }

  console.error('Could not find file input or editor');
  return false;
}
