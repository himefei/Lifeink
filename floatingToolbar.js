class LifeinkFloatingToolbar {
  constructor() {
    this.toolbar = null;
    this.mainButton = null;
    this.menu = null;
    this.initialized = false;
    this.activeElement = null;
    this.extensionContext = true;
  }

  createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.id = 'lifeink-toolbar';
    toolbar.style.cssText = `
      position: fixed;
      display: none;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      z-index: 999999;
    `;
    
    const mainButton = document.createElement('button');
    mainButton.style.cssText = `
      background: transparent;
      border: none;
      padding: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: transform 0.2s;
    `;

    // Add the Lifeink logo
    const logo = document.createElement('img');
    logo.src = chrome.runtime.getURL('Lifeink.png');
    logo.style.cssText = `
      width: 24px;
      height: 24px;
      object-fit: contain;
    `;
    
    mainButton.appendChild(logo);
    toolbar.appendChild(mainButton);
    
    const menu = document.createElement('div');
    menu.style.cssText = `
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    
    toolbar.appendChild(menu);
    document.body.appendChild(toolbar);
    
    return { toolbar, mainButton, menu };
  }

  handleTextSelection = (event) => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    console.log('[Lifeink Debug] Text selection detected:', selectedText);
    
    if (!this.toolbar || !selectedText) {
      return;
    }
    
    this.activeElement = document.activeElement;
    console.log('[Lifeink Debug] Active element:', this.activeElement);

    if (selectedText) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      this.toolbar.style.display = 'block';
      const toolbarLeft = Math.min(
        Math.max(0, rect.left + window.scrollX),
        window.innerWidth - this.toolbar.offsetWidth
      );
      const toolbarTop = Math.max(
        0,
        rect.top + window.scrollY - this.toolbar.offsetHeight - 10
      );
      
      this.toolbar.style.left = `${toolbarLeft}px`;
      this.toolbar.style.top = `${toolbarTop}px`;
    } else {
      this.toolbar.style.display = 'none';
    }
  }

  async handleEnhanceText(message) {
    try {
      if (!this.extensionContext) {
        console.log('[Lifeink Debug] Reinitializing extension context');
        await this.reinitialize();
      }

      console.log('[Lifeink Debug] Sending enhancement request:', message);
      
      // Store selection info before async operation
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString();
      const activeElement = this.activeElement;

      // Verify extension context before sending message
      if (!chrome.runtime?.id) {
        throw new Error('Extension context invalid');
      }

      const response = await chrome.runtime.sendMessage({
        action: 'enhanceText',
        promptId: message.promptId,
        selectedText: selectedText
      }).catch(error => {
        if (error.message.includes('Extension context invalidated')) {
          this.extensionContext = false;
          throw new Error('Extension needs reinitialization');
        }
        throw error;
      });

      if (response.success && response.enhancedText) {
        this.replaceText(response.enhancedText, range, activeElement);
      }
    } catch (error) {
      console.error('[Lifeink Debug] Error in handleEnhanceText:', error);
      if (error.message.includes('Extension needs reinitialization')) {
        // Notify user to retry
        this.showNotification('Please try again. Extension was reloaded.');
      }
    }
  }

  replaceText(newText, range, activeElement) {
    try {
      if (activeElement.isContentEditable) {
        // For Outlook's modern editor
        const textNode = document.createTextNode(newText);
        range.deleteContents();
        range.insertNode(textNode);
        range.collapse(false);
        
        // Trigger Office 365 content update
        activeElement.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          cancelable: true,
        }));
        
        // Force Office 365 to recognize change
        setTimeout(() => {
          activeElement.dispatchEvent(new Event('change', {
            bubbles: true,
            cancelable: true
          }));
        }, 0);
      }
      // ... rest of replacement logic for other editor types ...
    } catch (error) {
      console.error('[Lifeink Debug] Text replacement error:', error);
      this.showNotification('Text replacement failed. Please try again.');
    }
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  async reinitialize() {
    console.log('[Lifeink Debug] Attempting to reinitialize extension');
    try {
      // Wait for extension context to be valid
      await new Promise(resolve => setTimeout(resolve, 500));
      if (chrome.runtime?.id) {
        this.extensionContext = true;
        await this.initialize();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Lifeink Debug] Reinitialization failed:', error);
      return false;
    }
  }

  async initialize() {
    console.log('[Lifeink Debug] Initializing floating toolbar');
    
    if (this.initialized) {
      console.log('[Lifeink Debug] Toolbar already initialized');
      return;
    }
    
    const { toolbar, mainButton, menu } = this.createToolbar();
    this.toolbar = toolbar;
    this.mainButton = mainButton;
    this.menu = menu;
    
    try {
      console.log('[Lifeink Debug] Fetching prompts');
      const response = await chrome.runtime.sendMessage({ action: 'getPrompts' });
      console.log('[Lifeink Debug] Received prompts:', response);
      
      const defaultPrompts = response.prompts;
      const config = await this.getConfig();
      const customPrompts = config.customPrompts || [];
      const allPrompts = [...defaultPrompts, ...customPrompts];
      
      allPrompts.forEach(prompt => {
        const menuItem = document.createElement('div');
        menuItem.textContent = prompt.title;
        menuItem.style.cssText = `
          padding: 8px 16px;
          cursor: pointer;
          white-space: nowrap;
          font-size: 14px;
          transition: background-color 0.2s;
        `;
        
        menuItem.addEventListener('click', async () => {
          console.log('[Lifeink Debug] Prompt clicked:', prompt.title);
          const selectedText = window.getSelection().toString();
          await this.handleEnhanceText({
            action: 'enhanceText',
            promptId: prompt.id,
            selectedText: selectedText
          });
          this.menu.style.display = 'none';
        });
        
        this.menu.appendChild(menuItem);
      });
      
      this.mainButton.addEventListener('click', () => {
        this.menu.style.display = this.menu.style.display === 'none' ? 'block' : 'none';
      });
      
      document.addEventListener('click', (event) => {
        if (!this.toolbar.contains(event.target)) {
          this.menu.style.display = 'none';
        }
      });
      
      document.addEventListener('mouseup', this.handleTextSelection);
      document.addEventListener('keyup', this.handleTextSelection);
      
      this.initialized = true;
      console.log('[Lifeink Debug] Floating toolbar initialization complete');
      
    } catch (error) {
      console.error('[Lifeink Debug] Error initializing toolbar:', error);
    }
  }

  async getConfig() {
    const defaults = {
      customPrompts: []
    };
    return await chrome.storage.sync.get(defaults);
  }
}

window.LifeinkFloatingToolbar = LifeinkFloatingToolbar;
console.log('[Lifeink Debug] FloatingToolbar.js loaded');

// Add error handling for context invalidation
window.addEventListener('error', (event) => {
  if (event.error?.message?.includes('Extension context invalidated')) {
    console.log('[Lifeink Debug] Extension context invalidated, will reinitialize on next action');
  }
});