# Edgenuity AI Solver

🤖 **BYOToken** - A browser extension that uses AI to help solve Edgenuity questions with one click.

## Features

- ✨ **One-Click Solving** - Floating button on every Edgenuity page
- 🔐 **BYOToken** - Bring Your Own Token (use your own OpenRouter API key)
- 🎯 **Smart Model Selection** - 6 specialized AI models for different question types
- 📸 **Screenshot-Based Vision Solving** - Automatically uses screenshots for visual/interactive questions
- 🧮 **Math Tool Calling** - Built-in calculator, unit converter, and equation solver
- 📊 **Graph & Interactive Recognition** - Automatically detects and describes graphs, dropdowns, checkboxes, and input fields
- 🎨 **Beautiful Dark UI** - Modern glassmorphism design
- 📚 **History Tracking** - View previously solved questions
- 🤖 **DOM Interaction Tools** - Click, select, and fill answers programmatically
- ⏭️ **Auto-Skip** - Automatically proceed to next activity when complete

## AI Models

| Model | Best For | Icon |
|-------|----------|------|
| **Balanced** (Default) | General questions | ⚖️ |
| **Writing Expert** | Essays, English | ✍️ |
| **Reasoning Pro** | Complex problems | 🧠 |
| **Deep Thinker** | Advanced reasoning | 🔬 |
| **Math Wizard** | Math, STEM, calculations | 🔢 |
| **Speed Demon** | Quick answers | ⚡ |
| **Vision Solver** | Screenshots, graphs, interactive elements | 👁️ |

## Screenshot-Based Solving

The extension **automatically detects** when a question has visual/interactive elements and switches to screenshot-based solving:

**Uses Screenshots When:**
- 📋 Dropdown menus are detected
- 📈 Graphs, charts, or canvas elements are present
- 🖼️ Images or diagrams (larger than 100x100px)
- 🎚️ Sliders or interactive controls
- Short text with many interactive elements

**Uses Text Extraction When:**
- 📝 Question is mostly text-based
- ☑️ Simple multiple choice
- ✏️ Fill-in-the-blank (text only)
- 📚 Reading passages or essays

## Interactive Element Recognition

The extension automatically detects and analyzes:

- 📋 **Dropdown Menus** - Extracts all options with full sentence context
  - Captures inline dropdowns like "The turtle's distance is increasing for [BLANK] seconds"
  - Excludes toolbar dropdowns (audio speed, highlighter, etc.)
- ☑️ **Checkboxes** - Shows checked/unchecked state
- 📻 **Radio Buttons** - Groups options and shows selection
- ✏️ **Fill-in-the-Blank** - Text inputs with context and hints
- 📝 **Essay Fields** - Textareas for long answers
- 📈 **Graphs & Charts** - Canvas/SVG elements with axis labels and data
- 📊 **Tables** - Headers, rows, and data extraction
- 🎚️ **Sliders** - Range inputs with min/max/current values
- 🔘 **Interactive Buttons** - Action buttons like "Walk", "Reset", etc.

## DOM Interaction Tools

The extension includes utility functions for interacting with page elements:

| Function | Description | Example |
|----------|-------------|---------|
| `sleep(ms)` | Delay execution | `await sleep(500)` |
| `clickElement(selector)` | Click any element | `await clickElement('#nextBtn')` |
| `selectOption(select, value)` | Select dropdown option | `await selectOption('dropdown-1', '40')` |
| `fillInput(selector, value)` | Fill text input | `await fillInput('#answer', 'Hello')` |
| `setCheckbox(selector, checked)` | Check/uncheck checkbox | `await setCheckbox('#agree', true)` |
| `selectRadio(name, value)` | Select radio button | `await selectRadio('q1', 'optionB')` |
| `autoFillAnswers(answers)` | Batch fill multiple answers | See below |

### Auto-Fill Example

```javascript
await autoFillAnswers({
    dropdowns: [
        { selector: 'dropdown-id', value: '40' },
        { selector: 'dropdown-2', value: 'increasing' }
    ],
    inputs: [
        { selector: '#answer1', value: '42' }
    ],
    checkboxes: [
        { selector: '#option1', checked: true }
    ],
    radios: [
        { name: 'question1', value: 'correct_answer' }
    ]
});
```

**Features:**
- ✅ Works in both main document and `#stageFrame` iframe
- ✅ Includes delays between actions to avoid detection
- ✅ Dispatches proper events (`change`, `input`, `click`)
- ✅ Logs all actions to the console for debugging

## Math Tools

The extension includes tool calling for math questions:

- **Calculator** - Evaluates mathematical expressions
- **Unit Converter** - Converts between units (inches, feet, liters, etc.)
- **Equation Solver** - Solves algebraic equations
- **Quadratic Solver** - Finds roots of quadratic equations
- **Statistics** - Mean, median, mode, std deviation
- **Geometry** - Area, volume, perimeter calculations
- **Percentage Calculator** - Percent of, percent change, etc.
- **Grade Calculator** - Weighted averages, needed scores

## Interactive Analysis Tools

For interactive questions with graphs and data:

- **Graph Analyzer** - Finds trends, rates of change, values at points
- **Value Comparator** - Compares multiple values, finds relationships
- **Table Interpreter** - Analyzes table data, finds patterns

## Excluded UI Elements

The extension intelligently filters out UI noise to focus on actual question content:

**Excluded Dropdowns:**
- Toolbar controls (`.toolbar`)
- Audio player controls (`.audio`, `audioSpeed`)
- Tool menus (`[class*="tools-"]`)
- Navigation elements (`tabindex="-1"`)

**Excluded Areas:**
- eNotes panel
- Glossary sidebar
- Transcript panel
- Video controls
- Navigation buttons
- Help menus

## Installation

1. Get your OpenRouter API key from [openrouter.ai/keys](https://openrouter.ai/keys)

2. Load the extension in your browser:
   - **Chrome/Edge**: Go to `chrome://extensions/` or `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `edgenuity-ai-solver` folder

3. Click the extension icon and enter your API key

## Usage

1. Navigate to any Edgenuity lesson or quiz
2. A floating **🤖 Solve** button appears in the bottom-right corner
3. Click the button to get an AI-generated answer
4. Copy the answer or close the overlay
5. Use the **📚 History** button to view previously solved questions

### Hide Button

Click the **👁️** icon on the solve button to hide it (useful when teachers are watching). Access solving through the extension popup instead.

## Configuration

Click the extension icon in your browser toolbar to access settings:

- **API Key** - Your OpenRouter API key (required)
- **Humanizer API Key** - Optional, for more natural writing responses
- **Model Selection** - Choose the AI model to use
- **Auto-detect** - Automatically select the best model for each question type
- **Show Solve Button** - Toggle floating button visibility
- **Auto-Skip on Finish** - Automatically proceed to next activity

## Privacy

This extension:
- ✅ Uses YOUR API key (BYOToken)
- ✅ Sends data directly to OpenRouter (no middleman)
- ✅ Stores settings locally in your browser
- ❌ Does NOT collect any data
- ❌ Does NOT have a backend server

## Files

```
edgenuity-ai-solver/
├── pageContext.js    # Injected script that runs in the page context to access Edgenuity's internal APIs (like `API.FrameChain.nextFrame()`) which are not available to content scripts directly.
├── manifest.json     # Extension configuration, including permissions and web accessible resources.
├── config.js         # Model & prompt configuration
├── api.js            # OpenRouter API with tool calling
├── content.js        # Page injection & question extraction
├── content.css       # Floating button & overlay styles
├── popup.html        # Settings popup
├── popup.css         # Popup styling
├── popup.js          # Popup logic
├── background.js     # Service worker (screenshots)
└── icons/            # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Changelog

### v1.2.0 (2026-01-08)
- ✨ Added DOM interaction tools (click, select, fill, sleep)
- 🐛 Fixed inline dropdown context detection
- 🐛 Excluded audio speed dropdown from question detection
- 📝 Improved sentence context extraction for fill-in-the-blank dropdowns

### v1.1.0
- 📸 Added screenshot-based vision solving
- 📚 Added history tracking
- ⏭️ Added auto-skip on activity completion

### v1.0.0
- 🚀 Initial release
- 🤖 One-click AI solving
- 🎯 Smart model selection
- 🧮 Math tool calling

## License

MIT
