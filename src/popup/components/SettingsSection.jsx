import { useState } from 'preact/hooks';

export function SettingsSection({ settings, onSettingsChange }) {
    const [showApiKey, setShowApiKey] = useState(false);
    const [showHumanizerKey, setShowHumanizerKey] = useState(false);

    const toggles = [
        { key: 'showSolveButton', label: 'Show Solve Button' },
        { key: 'autoDetectQuestionType', label: 'Auto-detect question type' },
        { key: 'showExplanation', label: 'Show explanations' },
        {
            key: 'autoSkipOnFinish',
            label: 'Auto-skip on finish',
            hint: 'Automatically go to next when video/question ends',
        },
        {
            key: 'autoPlayVideo',
            label: 'Auto-play videos',
            hint: 'Automatically play videos on load (muted)',
        },
        {
            key: 'autoSolve',
            label: 'Auto-solve questions',
            hint: 'Automatically solve questions when they load',
        },
    ];

    return (
        <>
            {/* API Key Section */}
            <div class="section">
                <label class="section-label">
                    <span class="label-icon">🔑</span>
                    OpenRouter API Key
                </label>
                <div class="input-group">
                    <input
                        type={showApiKey ? 'text' : 'password'}
                        value={settings.apiKey}
                        onInput={(e) => onSettingsChange({ apiKey: e.target.value })}
                        placeholder="sk-or-..."
                        autocomplete="off"
                    />
                    <button
                        class="toggle-visibility"
                        title="Show/Hide"
                        onClick={() => setShowApiKey(!showApiKey)}
                    >
                        {showApiKey ? '🙈' : '👁️'}
                    </button>
                </div>
                <a href="https://openrouter.ai/keys" target="_blank" class="help-link">
                    Get your API key →
                </a>
            </div>

            {/* Humanizer API Key Section */}
            <div class="section">
                <label class="section-label">
                    <span class="label-icon">✨</span>
                    Humanizer API Key
                    <span class="optional-badge">Optional</span>
                </label>
                <div class="input-group">
                    <input
                        type={showHumanizerKey ? 'text' : 'password'}
                        value={settings.humanizerApiKey}
                        onInput={(e) => onSettingsChange({ humanizerApiKey: e.target.value })}
                        placeholder="Your HumanizeAI key..."
                        autocomplete="off"
                    />
                    <button
                        class="toggle-visibility"
                        title="Show/Hide"
                        onClick={() => setShowHumanizerKey(!showHumanizerKey)}
                    >
                        {showHumanizerKey ? '🙈' : '👁️'}
                    </button>
                </div>
                <span class="help-text">
                    Humanizes writing/essay answers only.{' '}
                    <a href="https://humanizeai.com" target="_blank" class="help-link">
                        Get API key →
                    </a>
                </span>
            </div>

            {/* Toggle Settings */}
            <div class="section">
                <label class="section-label">
                    <span class="label-icon">⚙️</span>
                    Settings
                </label>
                {toggles.map(({ key, label, hint }) => (
                    <div class={`toggle-row ${hint ? 'auto-skip-row' : ''}`} key={key}>
                        {hint ? (
                            <div class="toggle-label-group">
                                <span>{label}</span>
                                <span class="toggle-hint">{hint}</span>
                            </div>
                        ) : (
                            <span>{label}</span>
                        )}
                        <label class="toggle">
                            <input
                                type="checkbox"
                                checked={settings[key]}
                                onChange={(e) => onSettingsChange({ [key]: e.target.checked })}
                            />
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                ))}
            </div>
        </>
    );
}
