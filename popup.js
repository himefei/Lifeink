document.getElementById('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Instead, get prompts from background.js like:
chrome.runtime.sendMessage({action: 'getPrompts'}, response => {
  // Handle prompts here
});
