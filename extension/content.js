// Content script that runs on claude.ai
// This script has elevated privileges and can directly manipulate the page DOM

console.log("Mac Notes content script loaded on:", window.location.href);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "pasteText") {
    pasteTextToClaude(message.text);
    sendResponse({ success: true });
  } else if (message.type === "uploadImage") {
    uploadImageToClaude(message.imageBlob, message.imageName);
    sendResponse({ success: true });
  } else if (message.type === "extractChat") {
    console.log("Extract chat message received");
    try {
      const chatData = extractChatConversation();
      console.log("Chat data extracted:", chatData);
      sendResponse({ success: true, data: chatData });
    } catch (error) {
      console.error("Error extracting chat:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // Keep message channel open for async response
});

// Paste text into Claude's editor
function pasteTextToClaude(text) {
  const editor = document.querySelector(".ProseMirror");
  if (!editor) {
    console.error("ProseMirror editor not found");
    return false;
  }

  editor.focus();

  // Clear existing content
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection.removeAllRanges();
  selection.addRange(range);
  document.execCommand("delete");

  // Paste text
  const clipboardData = new DataTransfer();
  clipboardData.setData("text/plain", text);
  const pasteEvent = new ClipboardEvent("paste", {
    bubbles: true,
    cancelable: true,
    clipboardData: clipboardData,
  });
  editor.dispatchEvent(pasteEvent);

  return true;
}

// Upload image to Claude
function uploadImageToClaude(base64Data, imageName) {
  // Convert base64 to Blob
  const parts = base64Data.split(";base64,");
  const contentType = parts[0].split(":")[1];
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
    const changeEvent = new Event("change", { bubbles: true });
    fileInput.dispatchEvent(changeEvent);

    const inputEvent = new Event("input", { bubbles: true });
    fileInput.dispatchEvent(inputEvent);

    console.log("Image uploaded via file input");
    return true;
  }

  // Method 2: Fallback to paste event
  const editor = document.querySelector(".ProseMirror");
  if (editor) {
    editor.focus();

    // Add newline before image
    const textData = new DataTransfer();
    textData.setData("text/plain", "\n");
    editor.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: textData,
      })
    );

    // Paste image
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer,
    });
    editor.dispatchEvent(pasteEvent);

    console.log("Image uploaded via paste event");
    return true;
  }

  console.error("Could not find file input or editor");
  return false;
}

// Extract chat conversation from Claude.ai page
function extractChatConversation() {
  const messages = [];

  // TODO: These selectors need to be discovered by inspecting Claude.ai DOM
  // Possible selectors to try:
  // - '[data-testid*="message"]'
  // - '[class*="message"]'
  // - 'article', '[role="article"]'
  // For now, we'll try multiple patterns

  let messageContainers = document.querySelectorAll('[data-testid*="message"]');

  // Fallback to other possible selectors if first one doesn't work
  if (messageContainers.length === 0) {
    messageContainers = document.querySelectorAll("article");
  }

  if (messageContainers.length === 0) {
    messageContainers = document.querySelectorAll('[class*="group"]');
  }

  console.log(`Found ${messageContainers.length} message containers`);

  messageContainers.forEach((container, index) => {
    const isUser = detectIfUserMessage(container);
    const content = extractMessageContent(container);
    const hasCode = container.querySelector("pre, code") !== null;

    if (content.trim()) {
      messages.push({
        role: isUser ? "user" : "assistant",
        content: content,
        html: container.innerHTML,
        hasCode: hasCode,
        index: index,
      });
    }
  });

  return {
    chatId: extractChatId(),
    url: window.location.href,
    messages: messages,
    totalMessages: messages.length,
  };
}

// Detect if message is from user or assistant
function detectIfUserMessage(container) {
  // TODO: Discover actual patterns used by Claude.ai
  // Common patterns to check:
  // - Class names containing 'user', 'human', 'you'
  // - Class names containing 'assistant', 'claude', 'ai'
  // - Data attributes
  // - Position in DOM

  const html = container.innerHTML.toLowerCase();
  const classes = container.className.toLowerCase();

  // Try to detect based on common patterns
  if (classes.includes("user") || classes.includes("human")) {
    return true;
  }
  if (classes.includes("assistant") || classes.includes("claude")) {
    return false;
  }

  // Fallback: alternate between user and assistant
  // This is a rough heuristic that should be replaced with actual detection
  const allMessages = Array.from(container.parentElement?.children || []);
  const indexInParent = allMessages.indexOf(container);
  return indexInParent % 2 === 0;
}

// Extract message content from container
function extractMessageContent(container) {
  // Clone to avoid modifying the actual DOM
  const clone = container.cloneNode(true);

  // Remove any UI elements that aren't part of the message
  // (buttons, icons, metadata, etc.)
  clone
    .querySelectorAll('button, [role="button"]')
    .forEach((el) => el.remove());

  // Process code blocks to preserve formatting
  const codeBlocks = clone.querySelectorAll("pre, code");
  codeBlocks.forEach((codeBlock) => {
    // Get the code with preserved whitespace
    const code = codeBlock.textContent;
    // Replace the element with formatted text that preserves indentation
    const formattedCode = "\n```\n" + code + "\n```\n";
    codeBlock.replaceWith(document.createTextNode(formattedCode));
  });

  // Get text content (now with preserved code formatting)
  return clone.textContent.trim();
}

// Extract chat ID from URL
function extractChatId() {
  // URL pattern: https://claude.ai/chat/UUID
  const match = window.location.pathname.match(/\/chat\/([a-f0-9-]+)/);
  return match ? match[1] : null;
}
