import { useState, useEffect } from 'preact/hooks';

const DEFAULT_SETTINGS = {
    apiKey: '',
    humanizerApiKey: '',
    selectedModel: 'balanced',
    autoDetectQuestionType: true,
    showExplanation: true,
    showSolveButton: true,
    autoSkipOnFinish: false,
    autoPlayVideo: false,
    autoSolve: false,
};

export function useSettings() {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
            setSettings(result);
            setLoading(false);
        });
    }, []);

    const updateSettings = (newSettings) => {
        const merged = { ...settings, ...newSettings };
        setSettings(merged);
        return new Promise((resolve) => {
            chrome.storage.sync.set(merged, resolve);
        });
    };

    return { settings, updateSettings, loading };
}
