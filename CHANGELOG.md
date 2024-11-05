# Changelog
All notable changes to the Lifeink extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.10] - 2024-10-30
### Added
- New "Experimental Features" section in options page
- Improved UI for experimental features
- Better visual hierarchy for settings
- Warning message for experimental features

### Changed
- Moved floating toolbar toggle to experimental features
- Enhanced settings layout and organization
- Improved feature descriptions and warnings

## [1.0.9] - 2024-10-30
### Added
- Toggle switch for enabling/disabling floating toolbar
- User preference persistence for floating toolbar
- Visual feedback for toolbar state
- Improved toolbar settings description

### Changed
- Enhanced options page layout
- Added conditional initialization for floating toolbar
- Improved debugging messages

## [1.0.8] - 2024-10-30
### Added
- New modular floating toolbar component for Microsoft 365 web apps
- Separate floatingToolbar.js file for better code organization
- Automatic toolbar activation on Microsoft 365 domains
- Animated menu transitions and hover effects

### Changed
- Enhanced text selection handling
- Improved UI accessibility in restricted environments
- Restructured code for better maintainability

## [1.0.7] - 2024-10-30
### Changed
- Separated "Add Prompt" and "Save All Changes" buttons in options page
- Enhanced save button UI with improved visibility and feedback
- Improved overall button layout and spacing
- Added visual feedback for button interactions

## [1.0.6] - 2024-10-30
### Fixed
- Multiple simultaneous API requests to Ollama server
- Request queue management to prevent API traffic jams
- Improved message handling stability

### Added [Experimental]
- Microsoft 365 floating toolbar support (experimental feature)
- Toggle option for Microsoft 365 floating toolbar in settings
- Automatic toolbar positioning above selected text

### Known Issues
- Text replacement in Outlook Web may not work consistently
- Floating toolbar may need manual refresh in some cases

## [1.0.5] - 2024-10-30
### Added [Experimental]
- Microsoft 365 floating toolbar support (experimental feature)
- Toggle option for Microsoft 365 floating toolbar in settings
- Automatic toolbar positioning above selected text

### Changed
- Enhanced text selection handling
- Improved UI accessibility in restricted environments
- Added experimental features section in options page

## [1.0.4] - 2024-10-30
### Changed
- Separated "Add Prompt" and "Save All Changes" buttons in options page
- Enhanced save button UI with improved visibility and feedback
- Improved overall button layout and spacing
- Added visual feedback for button interactions

## [1.0.3] - 2024-10-30
### Changed
- Modified manifest.json to show extension icon in Chrome toolbar by default
- Users no longer need to manually pin the extension

## [1.0.2] - 2024-10-30
### Added
- Text enhancement using local LLM (Ollama API)
- Default prompts for grammar, writing improvement, summarization, and analysis
- Custom prompt creation
- Support for Dynamics 365
- Rate limiting for API calls (10 requests per minute)
- Configuration options for API endpoint and model selection
- Cross-browser compatibility support
- Comprehensive error handling and debug logging system
- HTML formatting preservation during text enhancement

### Security
- Implemented Manifest V3 standards
- Proper permission handling for browser APIs
- Secure host permissions configuration

## [1.0.1] - 2024-10-30
### Changed
- Modified manifest.json to show extension icon in Chrome toolbar by default
- Users no longer need to manually pin the extension

## [1.0.0] - 2024-10-30
### Added
- Text enhancement using local LLM (Ollama API)
- Default prompts for grammar, writing improvement, summarization, and analysis
- Custom prompt creation
- Support for Dynamics 365
- Rate limiting for API calls (10 requests per minute)
- Configuration options for API endpoint and model selection
- Cross-browser compatibility support
- Comprehensive error handling and debug logging system
- HTML formatting preservation during text enhancement

### Security
- Implemented Manifest V3 standards
- Proper permission handling for browser APIs
- Secure host permissions configuration
