const browserAPI = chrome || browser;

// Saves options to browserAPI.storage
function saveOptions() {
  const options = {
    apiKey: document.getElementById('apiKey').value,
    llmModel: document.getElementById('llmModel').value,
    customEndpoint: document.getElementById('customEndpoint').value,
    floatingToolbar: document.getElementById('floatingToolbar').checked,
    customPrompts: getCustomPrompts()
  };

  browserAPI.storage.sync.set(options, () => {
    // Update status to let user know options were saved.
    const status = document.getElementById('status');
    if (status) {
      status.textContent = 'Options saved.';
      setTimeout(() => {
        status.textContent = '';
      }, 750);
    }
    updateContextMenu();
  });
}

function getCustomPrompts() {
  const promptContainers = document.querySelectorAll('.prompt-container');
  return Array.from(promptContainers).map(container => ({
    id: snakeCase(container.querySelector('.prompt-title').value),
    title: container.querySelector('.prompt-title').value,
    prompt: container.querySelector('.prompt-text').value
  }));
}

// Helper function to convert a string to snake case
function snakeCase(str) {
  return str.toLowerCase().replace(/\s+/g, '_');
}

// Function to fetch available Ollama models
async function fetchOllamaModels() {
  const modelSelect = document.getElementById('llmModel');
  const modelError = document.getElementById('modelError');
  const customEndpoint = document.getElementById('customEndpoint').value;
  
  try {
    modelError.textContent = '';
    modelSelect.innerHTML = '<option value="">Loading models...</option>';
    
    const baseUrl = new URL(customEndpoint).origin;
    const response = await fetch(`${baseUrl}/api/tags`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models (${response.status})`);
    }

    const data = await response.json();
    
    // Clear and populate the select element
    modelSelect.innerHTML = '';
    
    // Add a default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select a model --';
    modelSelect.appendChild(defaultOption);
    
    // Sort models alphabetically
    const sortedModels = data.models.sort((a, b) => a.name.localeCompare(b.name));
    
    // Add options for each model
    sortedModels.forEach(model => {
      const option = document.createElement('option');
      option.value = model.name;
      option.textContent = `${model.name} (${formatSize(model.size)})`;
      modelSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    modelError.textContent = `Error loading models: ${error.message}. Make sure Ollama is running.`;
    
    // Restore select with a single option indicating the error
    modelSelect.innerHTML = '<option value="">Failed to load models</option>';
  }
}

// Helper function to format file size
function formatSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

// Restores select box and checkbox state using the preferences
// stored in browserAPI.storage.
function restoreOptions() {
  const defaults = {
    apiKey: '',
    llmModel: '',
    customEndpoint: 'http://localhost:11434/api/generate',
    floatingToolbar: true,
    customPrompts: []
  };

  browserAPI.storage.sync.get(defaults, async (items) => {
    const elementIds = ['apiKey', 'customEndpoint'];

    elementIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.value = items[id];
      } else {
        console.error(`Element with id '${id}' not found`);
      }
    });

    // Set the floating toolbar toggle
    const floatingToolbarToggle = document.getElementById('floatingToolbar');
    if (floatingToolbarToggle) {
      floatingToolbarToggle.checked = items.floatingToolbar;
    }

    // Fetch models first
    await fetchOllamaModels();
    
    // Then set the selected model
    const modelSelect = document.getElementById('llmModel');
    if (modelSelect) {
      modelSelect.value = items.llmModel;
    }

    // Restore custom prompts
    items.customPrompts.forEach(prompt => {
      addPromptToUI(prompt.title, prompt.prompt, prompt.id);
    });
  });
}

function addPromptToUI(title = '', prompt = '', id = '') {
  const promptsContainer = document.getElementById('prompts-container');
  const template = document.getElementById('prompt-template');
  const promptElement = template.content.cloneNode(true);

  promptElement.querySelector('.prompt-title').value = title;
  promptElement.querySelector('.prompt-text').value = prompt;
  
  // Add a hidden input for the ID
  const idInput = document.createElement('input');
  idInput.type = 'hidden';
  idInput.className = 'prompt-id';
  idInput.value = id || snakeCase(title);
  promptElement.querySelector('.prompt-container').appendChild(idInput);

  promptElement.querySelector('.delete-prompt').addEventListener('click', function() {
    this.closest('.prompt-container').remove();
  });

  promptsContainer.appendChild(promptElement);
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired');
  restoreOptions();
  
  // Add refresh button listener
  document.getElementById('refreshModels').addEventListener('click', fetchOllamaModels);
  
  // Add endpoint change listener to refresh models
  document.getElementById('customEndpoint').addEventListener('change', fetchOllamaModels);
});
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('add-prompt').addEventListener('click', () => addPromptToUI());

async function updateContextMenu() {
  await chrome.contextMenus.removeAll();

  // Get prompts from background script instead
  const response = await chrome.runtime.sendMessage({ action: 'getPrompts' });
  const defaultPrompts = response.prompts;

  chrome.contextMenus.create({
    id: "lifeinkMenu",
    title: "Lifeink",
    contexts: ["selection"]
  });
  
  const config = await getConfig();
  const customPrompts = config.customPrompts || [];
  [...defaultPrompts, ...customPrompts].forEach(prompt => {
    chrome.contextMenus.create({
      id: prompt.id,
      parentId: "lifeinkMenu",
      title: prompt.title,
      contexts: ["selection"]
    });
  });
}

async function getConfig() {
  const defaults = {
    apiKey: '',
    llmModel: 'llama3.1:latest',
    customEndpoint: 'http://localhost:11434/api/generate',
    customPrompts: []
  };
  const config = await chrome.storage.sync.get(defaults);
  return {
    apiKey: config.apiKey,
    llmModel: config.llmModel,
    customEndpoint: config.customEndpoint,
    customPrompts: config.customPrompts
  };
}
