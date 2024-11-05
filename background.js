const browserAPI = chrome || browser;

const DEFAULT_PROMPTS = [
  { 
    id: 'fix_grammar', 
    title: 'Fix spelling and grammar', 
    prompt: 'You are a professional editor. Your task is to fix spelling and grammar errors while exactly preserving HTML formatting. CRUCIAL: Each paragraph must be wrapped in <div> tags and line breaks must use <br /> tags. Example input: "<div>Hello team,</div><div>Hope your doing well.</div>" should output: "<div>Hello team,</div><div>Hope you\'re doing well.</div>". Keep all HTML tags in their original positions. Only output the corrected text using the following text as input:'
  },
  { 
    id: 'improve_writing', 
    title: 'Improve writing quality', 
    prompt: 'You are a professional writer. Your task is to improve writing quality and make it more professional but also polite. Seperate each paragraph when necessary with <div> tags and line breaks must use <br /> tags. Using the following text as input and only output the improved text without your comments:'
  },
  { 
    id: 'summarize', 
    title: 'Summarize content', 
    prompt: 'You are a summarization expert. Your task is to summarize the content in the input text below the colonwhile exactly preserving HTML formatting. You will summarize the content in a bullet point format. Each paragraph needs <div> tags and line breaks need <br /> tags. Only output the formatted result using the following text as input:'
  },
  { 
    id: 'analyze', 
    title: 'Analyse and respond', 
    prompt: 'You are the best cusotmer service agent in the technical support centre. Your task is to write a response to address all the issues and concerns from the following text from a customer:'
  }
];

// Use 'browserAPI' for cross-browser compatibility
browserAPI.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'update') {
    log(`Extension updated from version ${details.previousVersion} to ${browserAPI.runtime.getManifest().version}`);
  }

  await updateContextMenu();
});

// Handle context menu clicks
browserAPI.contextMenus.onClicked.addListener((info, tab) => {
  browserAPI.storage.sync.get('customPrompts', ({ customPrompts = [] }) => {
    const allPrompts = [...DEFAULT_PROMPTS, ...customPrompts];
    if (allPrompts.some(prompt => prompt.id === info.menuItemId)) {
      // Check if the content script is loaded
      browserAPI.tabs.sendMessage(tab.id, {action: 'ping'}, response => {
        if (browserAPI.runtime.lastError) {
          // Content script is not loaded, inject it
          browserAPI.scripting.executeScript({
            target: {tabId: tab.id},
            files: ['content.js']
          }, () => {
            if (browserAPI.runtime.lastError) {
              console.error('Failed to inject content script:', browserAPI.runtime.lastError);
              return;
            }
            // Now send the actual message
            sendEnhanceTextMessage(tab.id, info.menuItemId, info.selectionText);
          });
        } else {
          // Content script is already loaded, send the message
          sendEnhanceTextMessage(tab.id, info.menuItemId, info.selectionText);
        }
      });
    }
  });
});

async function sendEnhanceTextMessage(tabId, promptId, selectedText) {
  const config = await getConfig();
  const showDiff = config.showDiff;
  browserAPI.tabs.sendMessage(tabId, {
    action: 'enhanceText',
    promptId: promptId,
    selectedText: selectedText,
    showDiff: showDiff
  }, response => {
    if (browserAPI.runtime.lastError) {
      console.error('Error sending message:', browserAPI.runtime.lastError);
    }
  });
}

// Handle messages from content script
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'enhanceText') {
    enhanceTextWithRateLimit(request.promptId, request.selectedText)
      .then(enhancedText => {
        sendResponse({ success: true, enhancedText });
      })
      .catch(error => {
        log(`Error enhancing text: ${error.message}`, 'error');
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicates that the response is asynchronous
  }
  if (request.action === 'getPrompts') {
    sendResponse({ prompts: DEFAULT_PROMPTS });
    return true;
  }
  return false; // Handle unrecognized messages
});

// Function to interact with various LLM APIs
async function enhanceTextWithLLM(promptId, text) {
  const config = await getConfig();
  const llmProvider = config.llmProvider;
  const customPrompts = config.customPrompts || [];
  if (!llmProvider) {
    throw new Error('LLM provider not set. Please set it in the extension options.');
  }
  
  const allPrompts = [...DEFAULT_PROMPTS, ...customPrompts];
  const prompt = allPrompts.find(p => p.id === promptId)?.prompt;
  if (!prompt) {
    throw new Error('Invalid prompt ID');
  }
  const fullPrompt = `${prompt}:\n\n${text}`;

  const enhanceFunctions = {
    anthropic: enhanceWithAnthropic,
    ollama: enhanceWithOllama,
  };

  const enhanceFunction = enhanceFunctions[llmProvider];
  if (!enhanceFunction) {
    throw new Error('Invalid LLM provider selected');
  }

  return await enhanceFunction(fullPrompt);
}

async function enhanceWithAnthropic(prompt) {
  const { apiKey, llmModel, customEndpoint } = await browserAPI.storage.sync.get(['apiKey', 'llmModel', 'customEndpoint']);

  if (!apiKey) {
    throw new Error('Anthropic API key not set. Please set it in the extension options.');
  }

  if (!llmModel) {
    throw new Error('LLM model not set for Anthropic. Please set it in the extension options.');
  }

  const endpoint = customEndpoint || 'https://api.anthropic.com/v1/complete';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        prompt: `Human: ${prompt}\n\nAssistant:`,
        model: llmModel,
        max_tokens_to_sample: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Anthropic API request failed: ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.completion;
  } catch (error) {
    throw new Error(`Failed to enhance text with Anthropic. Error: ${error.message}`);
  }
}

async function enhanceWithOllama(prompt) {
  const { llmModel, customEndpoint } = await browserAPI.storage.sync.get(['llmModel', 'customEndpoint']);

  if (!llmModel) {
    throw new Error('LLM model not set for Ollama. Please set it in the extension options.');
  }

  const endpoint = customEndpoint || 'http://localhost:11434/api/generate';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: llmModel || 'llama2',
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error('Ollama API request failed');
    }

    const data = await response.json();
    console.log("Ollama Raw Response:", data.response); // Log the raw response
    return data.response;
  } catch (error) {
    throw new Error(`Failed to enhance text with Ollama. Error: ${error.message}`);
  }
}

// Implement rate limiting
const MAX_REQUESTS_PER_MINUTE = 10;
const RATE_LIMIT_RESET_INTERVAL = 60000; // 1 minute in milliseconds

const rateLimiter = (() => {
  let requestCount = 0;
  let lastResetTime = Date.now();
  const queue = [];

  const resetRateLimit = () => {
    const now = Date.now();
    if (now - lastResetTime > RATE_LIMIT_RESET_INTERVAL) {
      requestCount = 0;
      lastResetTime = now;
    }
  };

  const executeNext = () => {
    if (queue.length > 0) {
      resetRateLimit();
      if (requestCount < MAX_REQUESTS_PER_MINUTE) {
        const next = queue.shift();
        requestCount++;
        next.resolve(next.fn());
        if (queue.length > 0) {
          setTimeout(executeNext, RATE_LIMIT_RESET_INTERVAL / MAX_REQUESTS_PER_MINUTE);
        }
      } else {
        setTimeout(executeNext, RATE_LIMIT_RESET_INTERVAL - (Date.now() - lastResetTime));
      }
    }
  };

  return (fn) => {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      if (queue.length === 1) {
        executeNext();
      }
    });
  };
})();

// Wrap the enhanceTextWithLLM function with improved rate limiting
const enhanceTextWithRateLimit = (promptId, text) => {
  return rateLimiter(() => enhanceTextWithLLM(promptId, text));
};

// Add a function to get configuration
async function getConfig() {
  const defaults = {
    apiKey: '',
    llmProvider: 'ollama',
    llmModel: 'llama3.1:latest',
    customEndpoint: 'http://localhost:11434/api/generate',
    showDiff: false,
    customPrompts: []
  };
  const config = await browserAPI.storage.sync.get(defaults);
  return {
    apiKey: config.apiKey,
    llmModel: config.llmModel,
    customEndpoint: config.customEndpoint,
    llmProvider: config.llmProvider,
    showDiff: config.showDiff,
    customPrompts: config.customPrompts
  };
}

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] ${message}`);
}

async function updateContextMenu() {
  // Remove all existing menu items
  await browserAPI.contextMenus.removeAll();

  // Fetch custom prompts from storage
  const config = await getConfig();
  const customPrompts = config.customPrompts || [];

  // Combine default and custom prompts
  const allPrompts = [...DEFAULT_PROMPTS, ...customPrompts];

  // Recreate the main menu item
  await browserAPI.contextMenus.create({
    id: 'lifeinkMenu',
    title: 'Lifeink',
    contexts: ['selection'],
  });

  // Create menu items for all prompts
  for (const prompt of allPrompts) {
    await browserAPI.contextMenus.create({
      id: prompt.id,
      parentId: 'lifeinkMenu',
      title: prompt.title,
      contexts: ['selection'],
    });
  }
}

browserAPI.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.customPrompts) {
    updateContextMenu();
  }
});
