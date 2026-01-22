# Edgenuity AI Solver

🤖 **BYOToken** - A browser extension that uses AI to help solve Edgenuity questions with one click.

---

## Table of Contents

- [Features](#features)
- [AI Models](#ai-models)
- [AI Chat Mode](#ai-chat-mode)
- [Screenshot-Based Solving](#screenshot-based-solving)
- [Interactive Element Recognition](#interactive-element-recognition)
- [DOM Interaction Tools](#dom-interaction-tools)
- [AI Tool Calling](#ai-tool-calling)
- [Excluded UI Elements](#excluded-ui-elements)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Privacy](#privacy)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Development](#development)
- [Changelog](#changelog)
- [License](#license)

---

## Features

- ✨ **One-Click Solving** - Floating button on every Edgenuity page
- 💬 **AI Chat Mode** - Interactive chat with the AI for follow-up questions and clarifications
- 🔐 **BYOToken** - Bring Your Own Token (use your own OpenRouter API key)
- 🎯 **Smart Model Selection** - 7 specialized AI models for different question types
- 📸 **Screenshot-Based Vision Solving** - Automatically uses screenshots for visual/interactive questions
- 🧮 **Math Tool Calling** - Built-in calculator, unit converter, and equation solver
- 📊 **Graph & Interactive Recognition** - Automatically detects and describes graphs, dropdowns, checkboxes, and input fields
- 🎨 **Beautiful Dark UI** - Modern glassmorphism design built with Preact
- 📚 **History Tracking** - View previously solved questions and continue chat conversations
- 🤖 **DOM Interaction Tools** - Click, select, and fill answers programmatically
- ⏭️ **Auto-Skip** - Automatically proceed to next activity when complete

## AI Models

The extension supports **7 specialized AI models** via [OpenRouter](https://openrouter.ai). Choose the best model for your question type:

| Icon | Model | OpenRouter ID | Best For | Cost (per 1M tokens) |
|------|-------|---------------|----------|---------------------|
| ⚖️ | **Balanced** (Default) | `google/gemini-2.5-flash-lite` | General questions, fast & accurate | ~$0.075 input / $0.30 output |
| ✍️ | **Writing Expert** | `anthropic/claude-sonnet-4` | Essays, English, long-form writing | ~$3.00 input / $15.00 output |
| 🧠 | **Reasoning Pro** | `openai/gpt-4o` | Complex problems, logic, analysis | ~$2.50 input / $10.00 output |
| 🔬 | **Deep Thinker** | `google/gemini-2.5-pro` | Very complex problems, advanced reasoning | ~$1.25 input / $10.00 output |
| 🔢 | **Math Wizard** | `qwen/qwen3-235b-a22b` | Mathematics, calculations, STEM | ~$0.20 input / $0.80 output |
| ⚡ | **Speed Demon** | `meta-llama/llama-4-maverick` | Fastest responses when time matters | ~$0.20 input / $0.60 output |
| 👁️ | **Vision Solver** | `google/gemini-2.5-flash` | Screenshots, graphs, interactive elements | ~$0.15 input / $0.60 output |

### 💰 Cost Per Question Estimate

Real-world cost estimates based on typical Edgenuity questions:

| Model | Text-Only Question | With Screenshot | Notes |
|-------|-------------------|-----------------|-------|
| ⚖️ **Balanced** | ~$0.0002 | ~$0.0005 | Best value, recommended for most use |
| ✍️ **Writing Expert** | ~$0.008 | ~$0.02 | Use for essays only |
| 🧠 **Reasoning Pro** | ~$0.006 | ~$0.015 | Good for complex multi-step problems |
| 🔬 **Deep Thinker** | ~$0.004 | ~$0.01 | Advanced reasoning when needed |
| 🔢 **Math Wizard** | ~$0.0006 | ~$0.0015 | Great for STEM at low cost |
| ⚡ **Speed Demon** | ~$0.0005 | ~$0.0012 | Fast and affordable |
| 👁️ **Vision Solver** | ~$0.0004 | ~$0.001 | Optimized for visual questions |

**Assumptions:**
- Text-only: ~1,000 input tokens (question + system prompt) + ~300 output tokens
- With screenshot: ~3,000 input tokens (includes base64 image) + ~400 output tokens  

> 💡 **Example:** Solving 100 questions with screenshots using the **Balanced** model costs approximately **$0.05** (5 cents). You can solve ~20,000 questions per $1 of API credit!

> ⚠️ **Note:** Prices are approximate and may vary. Check [OpenRouter pricing](https://openrouter.ai/models) for current rates.

### Model Selection

- **Auto-detect** (recommended): The extension automatically selects the best model based on question type keywords
- **Manual**: Choose a specific model from the popup settings

## AI Chat Mode

The extension includes an **interactive AI chat** accessible via the 💬 button on the floating solve button:

- 📸 **Optional Screenshot Context** - Toggle to include/exclude the current page screenshot
- 💾 **Persistent Conversations** - Chat history is saved and can be continued later
- 🔄 **Continue from History** - Resume previous chat conversations from the history panel
- 🧹 **Clear Chat** - Start fresh with a new conversation

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

## AI Tool Calling

The extension uses **function calling** to provide the AI with specialized tools. When the AI needs to perform calculations, interact with the page, or analyze data, it can invoke these tools automatically.

### 🖱️ Browser Interaction Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `click_element` | Click an element on the page (button, link, radio, checkbox) | `selectorOrText`: ID, CSS selector, or visible text of element |
| `select_option` | Select an option from a dropdown menu | `selector`: Dropdown ID/selector, `value`: Option value or text |
| `type_text` | Type text into an input field or textarea | `selector`: Input ID/selector, `text`: Text to type |

### 🧮 Math Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `calculator` | Evaluate mathematical expressions | `expression`: Math expression (e.g., `"sqrt(16)"`, `"15 * 24"`) |
| `unit_converter` | Convert between units of measurement | `value`: Number, `from_unit`: Source unit, `to_unit`: Target unit |
| `solve_equation` | Solve algebraic equations for a variable | `equation`: Equation string (e.g., `"2x + 5 = 15"`), `variable`: Variable to solve for |
| `quadratic_solver` | Solve quadratic equations ax² + bx + c = 0 | `a`: Coefficient of x², `b`: Coefficient of x, `c`: Constant |
| `calculate_percentage` | Perform percentage calculations | `operation`: `percent_of`, `what_percent`, `percent_change`, `add_percent`, `subtract_percent`, `value1`, `value2` |
| `calculate_grade` | Calculate grades and weighted averages | `scores`: Array of grades, `weights`: Optional weights, `target_average`: Target grade, `upcoming_weight`: Weight of next score |
| `statistics` | Calculate statistical measures | `numbers`: Array of numbers, `measure`: `mean`, `median`, `mode`, `range`, `std_dev`, `variance`, `sum`, or `all` |
| `geometry_calculator` | Calculate geometric properties | `shape`: `circle`, `rectangle`, `triangle`, `sphere`, `cylinder`, `cone`, `cube`, `pyramid`, `dimensions`: Shape dimensions, `calculate`: `area`, `perimeter`, `volume`, `surface_area`, `all` |

#### Supported Units

**Volume:** `cubic_inches`, `cubic_feet`, `cubic_meters`, `liters`, `gallons`, `quarts`, `cups`, `milliliters`

**Length:** `inches`, `feet`, `yards`, `miles`, `meters`, `centimeters`, `kilometers`

**Mass:** `ounces`, `pounds`, `grams`, `kilograms`

**Time:** `seconds`, `minutes`, `hours`, `days`

### ✍️ Writing Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `text_statistics` | Analyze text for word count, sentence count, reading level | `text`: Text to analyze |
| `humanize_text` | Make AI-generated text sound more natural | `text`: Text to humanize |

### 📊 Interactive Analysis Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `analyze_graph_data` | Analyze graph data points for trends and key features | `xValues`: Array of x values, `yValues`: Array of y values, `operation`: `trend`, `rate_of_change`, `find_value_at_x`, `find_x_at_value`, `max`, `min`, `summary`, `target`: Target value for find operations |
| `compare_values` | Compare values and determine relationships | `values`: Array of numbers, `labels`: Optional labels for each value |
| `interpret_table` | Interpret table data to find patterns | `headers`: Column headers, `rows`: Table rows as arrays, `question`: What to find |

### Tool Usage Example

When you ask the AI to solve a math problem, it might internally call:

```json
{
  "name": "calculator",
  "arguments": {
    "expression": "462 / 12 * 60"
  }
}
```

Or for a geometry question:

```json
{
  "name": "geometry_calculator",
  "arguments": {
    "shape": "cylinder",
    "dimensions": { "radius": 5, "height": 10 },
    "calculate": "volume"
  }
}
```

The AI automatically selects the right tool based on the question type.

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

2. (**OPTIONAL** -- GOTO [RELEASES](https://github.com/aydenstechdungeon/edgenuity-ai-solver/releases) FOR THE PREBUILT EXTENSION) **Build the popup** (requires Node.js):
   ```bash
   npm install
   npm run build
   ```

3. Load the extension in your browser:
   - **Chrome**(Brave & Opera fall under the Chrome umbrella)**/Edge**: Go to `chrome://extensions/` or `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `edgenuity-ai-solver` folder

4. Click the extension icon and enter your API key

## Usage

1. Navigate to any Edgenuity lesson or quiz
2. A floating **🤖 Solve** button appears in the bottom-right corner
3. Click the button to get an AI-generated answer
4. Use **💬** to open chat mode for follow-up questions
5. Copy the answer or close the overlay
6. Use the **📚 History** button to view previously solved questions or continue chats

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

## Tech Stack

- **Content Script**: Vanilla JavaScript for DOM manipulation
- **Popup UI**: [Preact](https://preactjs.com/) with Vite for fast, lightweight builds
- **Styling**: CSS with glassmorphism design
- **Build**: Vite for popup bundling

## Project Structure

```
edgenuity-ai-solver/
├── manifest.json       # Chrome extension manifest (MV3)
├── config.js           # Model & prompt configuration
├── api.js              # OpenRouter API with tool calling
├── content.js          # Page injection, question extraction, chat UI
├── content.css         # Floating button, overlay & chat styles
├── background.js       # Service worker (screenshots)
├── pageContext.js      # Injected script for Edgenuity APIs
├── popup.html          # Popup entry point
├── popup.css           # Popup styling
├── src/
│   └── popup/          # Preact popup source
│       ├── main.jsx    # Preact entry point
│       ├── App.jsx     # Main app component
│       ├── components/ # UI components
│       │   ├── Header.jsx
│       │   ├── StatsCard.jsx
│       │   ├── HistoryPanel.jsx
│       │   ├── SettingsSection.jsx
│       │   ├── ModelGrid.jsx
│       │   └── AnswerModal.jsx
│       └── hooks/      # Custom Preact hooks
│           ├── useSettings.js
│           └── useHistory.js
├── dist/               # Built popup files
├── icons/              # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── vite.config.js      # Vite configuration
└── package.json        # Node dependencies
```

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
npm install
```

### Build Popup
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Build for Distribution
```bash
npm run ext:build
```

## Changelog

### v1.3.0 (2026-01-21)
- 💬 Added AI Chat mode with persistent conversation history
- 🎨 Migrated popup UI to Preact for better performance
- 📚 Chat conversations are saved to history and can be continued
- 📸 Optional screenshot toggle in chat mode

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
