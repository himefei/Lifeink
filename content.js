// Add this throttle function at the top of content.js
const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
};

// Remove any existing listeners to prevent duplicates
if (chrome.runtime.onMessage.hasListeners()) {
  chrome.runtime.onMessage.removeListener();
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(
  throttle((message, sender, sendResponse) => {
    console.log('[Lifeink Debug] Received message:', message);
    
    if (message.action === 'ping') {
      console.log('[Lifeink Debug] Handling ping message');
      sendResponse({ status: 'alive' });
      return true;
    }
    
    if (message.action === 'enhanceText') {
      console.log('[Lifeink Debug] Handling enhanceText message');
      handleEnhanceText(message, sendResponse);
      return true; // Keep the message channel open for async response
    }
  }, 500)  // Throttle to one execution per 500ms
);

async function handleEnhanceText(message, sendResponse) {
  try {
    console.log('[Lifeink Debug] Starting handleEnhanceText with:', message);
    const { promptId, selectedText, showDiff } = message;
    
    console.log('[Lifeink Debug] Sending message to background script');
    const response = await chrome.runtime.sendMessage({
      action: 'enhanceText',
      promptId: promptId,
      selectedText: selectedText
    });

    console.log('[Lifeink Debug] Received response from background:', response);

    if (response.success) {
      console.log('[Lifeink Debug] Enhancement successful, replacing text');
      replaceSelectedText(response.enhancedText, showDiff);
      sendResponse({ success: true });
    } else {
      console.error('[Lifeink Debug] Enhancement failed:', response.error);
      sendResponse({ success: false, error: response.error });
    }
  } catch (error) {
    console.error('[Lifeink Debug] Error in handleEnhanceText:', error);
    sendResponse({ success: false, error: error.message });
  }
}

function replaceSelectedText(newText, showDiff) {
  console.log('[Lifeink Debug] Starting replaceSelectedText');
  
  try {
    // First try Dynamics 365 approach
    const outerFrame = document.querySelector('iframe.fullPageContentEditorFrame');
    if (outerFrame) {
      console.log('[Lifeink Debug] Detected Dynamics 365 environment');
      handleDynamics365Editor(outerFrame, newText);
      return;
    }

    // If not Dynamics 365, handle regular web page elements
    console.log('[Lifeink Debug] Handling regular web page');
    const activeElement = document.activeElement;
    
    if (!activeElement) {
      console.log('[Lifeink Debug] No active element found');
      return;
    }

    console.log('[Lifeink Debug] Active element:', activeElement.tagName);

    // Handle different types of editable elements
    if (activeElement.tagName === 'TEXTAREA' || 
        activeElement.tagName === 'INPUT') {
      
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      
      // Remove HTML tags for plain text inputs
      const plainText = newText.replace(/<div>/g, '')
                              .replace(/<\/div>/g, '\n')
                              .replace(/<br \/>/g, '\n')
                              .replace(/<br>/g, '\n')
                              .trim();

      // Use execCommand for undo support
      if (document.execCommand) {
        activeElement.focus();
        document.execCommand('insertText', false, plainText);
      } else {
        // Fallback to the standard way if execCommand is not available
        const currentValue = activeElement.value;
        activeElement.value = currentValue.substring(0, start) + 
                            plainText + 
                            currentValue.substring(end);
        
        // Create and dispatch input event for undo history
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: plainText
        });
        activeElement.dispatchEvent(inputEvent);
      }
      
      console.log('[Lifeink Debug] Text replacement complete');
    } else if (activeElement.isContentEditable) {
      // Handle contentEditable elements
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Use execCommand for undo support in contentEditable
        if (document.execCommand) {
          document.execCommand('insertHTML', false, newText);
        } else {
          range.deleteContents();
          const div = document.createElement('div');
          div.innerHTML = newText;
          range.insertNode(div);
        }
      }
    } else {
      console.log('[Lifeink Debug] No suitable editable element found');
    }
  } catch (error) {
    console.error('[Lifeink Debug] Error in replaceSelectedText:', error);
  }
}

function handleDynamics365Editor(outerFrame, newText) {
  try {
    // Access the outer frame's document
    const outerDocument = outerFrame.contentDocument || outerFrame.contentWindow.document;
    
    // Find the CKEditor iframe within the outer frame
    const editorFrame = outerDocument.querySelector('iframe.cke_wysiwyg_frame');
    if (!editorFrame) {
      console.log('[Lifeink Debug] No CKEditor frame found');
      return;
    }
    
    console.log('[Lifeink Debug] Found CKEditor frame');
    
    // Access the editor's document
    const editorDocument = editorFrame.contentDocument || editorFrame.contentWindow.document;
    if (!editorDocument) {
      console.log('[Lifeink Debug] Could not access editor document');
      return;
    }
    
    // Get the editor's body
    const editorBody = editorDocument.body;
    
    // Get the current selection
    const selection = editorDocument.getSelection();
    if (selection && selection.rangeCount > 0) {
      console.log('[Lifeink Debug] Found selection, replacing content');
      const range = selection.getRangeAt(0);
      
      // Create a temporary container and set its HTML content
      const tempDiv = editorDocument.createElement('div');
      tempDiv.innerHTML = newText;
      
      // Clear the current selection
      range.deleteContents();
      
      // Create a document fragment to hold all nodes
      const fragment = editorDocument.createDocumentFragment();
      
      // Convert the HTML string to DOM nodes while preserving order
      const nodes = Array.from(tempDiv.childNodes);
      nodes.forEach(node => fragment.appendChild(node));
      
      // Insert the fragment at the selection
      range.insertNode(fragment);
      
      // Clean up any empty nodes
      const cleanup = (node) => {
        if (node && node.parentNode && !node.textContent.trim()) {
          node.parentNode.removeChild(node);
        }
      };
      
      cleanup(range.startContainer);
      cleanup(range.endContainer);
      
      console.log('[Lifeink Debug] Content replaced successfully');
    } else {
      console.log('[Lifeink Debug] No selection found, appending to end');
      editorBody.innerHTML += newText;
    }
  } catch (error) {
    console.error('[Lifeink Debug] Error in handleDynamics365Editor:', error);
  }
}

// Helper function to check if we're in Dynamics 365
function isDynamics365() {
  return document.querySelector('iframe.fullPageContentEditorFrame') !== null;
}

// Initialize floating toolbar for MS365
if (window.location.hostname.includes('office.com') || 
    window.location.hostname.includes('office365.com') || 
    window.location.hostname.includes('live.com') || 
    window.location.hostname.includes('outlook.com')) {
    
    chrome.storage.sync.get({ floatingToolbar: true }, (items) => {
      if (items.floatingToolbar) {
        const initializeToolbar = () => {
          const floatingToolbar = new LifeinkFloatingToolbar();
          floatingToolbar.initialize().catch(error => {
            console.error('[Lifeink Debug] Initialization error:', error);
            // Retry after a delay if it fails
            setTimeout(initializeToolbar, 1000);
          });
        };

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initializeToolbar);
        } else {
          initializeToolbar();
        }
      }
    });
}

