const MODELS = {
    balanced: {
        id: 'google/gemini-2.5-flash-lite',
        name: 'Balanced (Default)',
        description: 'Fast & accurate for most questions',
        icon: '⚖️',
    },
    writing: {
        id: 'anthropic/claude-sonnet-4',
        name: 'Writing Expert',
        description: 'Essays, English, long-form writing',
        icon: '✍️',
    },
    reasoning: {
        id: 'openai/gpt-4o',
        name: 'Reasoning Pro',
        description: 'Complex problems, logic, analysis',
        icon: '🧠',
    },
    deep: {
        id: 'google/gemini-2.5-pro',
        name: 'Deep Thinker',
        description: 'Very complex problems, advanced reasoning',
        icon: '🔬',
    },
    math: {
        id: 'qwen/qwen3-235b-a22b',
        name: 'Math Wizard',
        description: 'Mathematics, calculations, STEM',
        icon: '🔢',
    },
    fast: {
        id: 'meta-llama/llama-4-maverick',
        name: 'Speed Demon',
        description: 'Fastest responses when time matters',
        icon: '⚡',
    },
};

export function ModelGrid({ selectedModel, onSelectModel }) {
    return (
        <div class="section">
            <label class="section-label">
                <span class="label-icon">🎯</span>
                AI Model
            </label>
            <div class="model-grid">
                {Object.entries(MODELS).map(([key, model]) => (
                    <div
                        key={key}
                        class={`model-option ${key === selectedModel ? 'selected' : ''}`}
                        onClick={() => onSelectModel(key)}
                    >
                        <span class="model-icon">{model.icon}</span>
                        <span class="model-name">{model.name}</span>
                        <span class="model-desc">{model.description}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
