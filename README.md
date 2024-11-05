# Lifeink Chrome Extension

Lifeink is a Chrome extension that leverages the power of LLMs and SLMs via the Ollama API to enhance your writing.  It provides a range of features directly accessible through a right-click context menu, allowing you to improve text on any webpage.


## Installation

1.  Please the Lifeink Folder in your personal folder.
2.  Open Chrome's Extension tab and enable developer mode
3.  Load the unpacked extension: Open Chrome, go to `chrome://extensions/`, enable "Developer mode," and click "Load unpacked." Select the `Lifeink` directory.
4.  Run OLLAMA serve
5.  **IMPORTANT** Add Windows System Evnironment Variables OLLAMA_ORIGINS, Value"*"


## Usage

1.  Select by hightlight the text you want to enhance on any webpage.
2.  Right-click on the selected text.
3.  Choose a Lifeink function from the context menu (e.g., "Fix spelling and grammar," "Improve writing," "Summarize text").
4.  The enhanced text will replace the selected text.
5.  User will be able to add their own prompt to archive their specific outcomes.


## Supported LLMs/APIs

Any LLMs/SLMs are avaiable in OLLAMA. I am not intented to add addtional APIs support for other LLMs providers at this stage as there are other extenstions out there that can do this.

## Perforamnce expectations

Depending on your hardware, you can expect a delay of 1-3 seconds for the LLM to respond.
Try use smaller but capable models for better performance. I tested a 1.5B model (hf.co/MaziyarPanahi/Qwen2.5-1.5B-Instruct-GGUF:Q6_K) and it was more than capable of handling the task with very low resrouce usage but can provide pretty much instant response.


## Default Prompts

Lifeink includes several default prompts:

*   Fix spelling and grammar
*   Improve writing
*   Make more professional
*   Simplify text
*   Summarize text


## License

[MIT License](https://opensource.org/licenses/MIT)
