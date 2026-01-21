import { useState, useCallback } from 'preact/hooks';
import { useSettings } from './hooks/useSettings';
import { useHistory, useStats } from './hooks/useHistory';
import { Header } from './components/Header';
import { StatsCard } from './components/StatsCard';
import { HistoryPanel } from './components/HistoryPanel';
import { SettingsSection } from './components/SettingsSection';
import { ModelGrid } from './components/ModelGrid';
import { AnswerModal } from './components/AnswerModal';

export function App() {
    const { settings, updateSettings, loading } = useSettings();
    const { history, count, clearHistory } = useHistory();
    const { solvedCount } = useStats();

    const [historyVisible, setHistoryVisible] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [solving, setSolving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);
    const [copied, setCopied] = useState(false);

    const handleSave = useCallback(async () => {
        await updateSettings(settings);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 1500);
    }, [settings, updateSettings]);

    const handleSolveNow = useCallback(async () => {
        await handleSave();
        setSolving(true);

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                chrome.tabs.sendMessage(tab.id, { type: 'SOLVE_QUESTION' }, (response) => {
                    setSolving(false);
                    if (chrome.runtime.lastError) {
                        console.error('Error:', chrome.runtime.lastError);
                        alert('Please navigate to an Edgenuity page first!');
                    }
                });
            }
        } catch (err) {
            console.error('Error solving:', err);
            setSolving(false);
        }
    }, [handleSave]);

    const handleSettingsChange = useCallback((newSettings) => {
        updateSettings(newSettings);
    }, [updateSettings]);

    const handleModelSelect = useCallback((model) => {
        updateSettings({ selectedModel: model });
    }, [updateSettings]);

    const handleClearHistory = useCallback(() => {
        if (confirm('Clear all history?')) {
            clearHistory();
        }
    }, [clearHistory]);

    const handleCopy = useCallback(async (answer) => {
        try {
            await navigator.clipboard.writeText(answer);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, []);

    if (loading) {
        return <div class="popup-container">Loading...</div>;
    }

    return (
        <div class="popup-container">
            <Header />

            {/* Solve Button */}
            <button
                class={`solve-now-btn ${solving ? 'loading' : ''}`}
                onClick={handleSolveNow}
                disabled={solving}
            >
                <span class="solve-icon">🤖</span>
                <span class="solve-text">
                    {solving ? 'Solving' : 'Solve Current Question'}
                </span>
            </button>

            <StatsCard solvedCount={solvedCount} />

            {/* History Button */}
            <button
                class="history-btn"
                onClick={() => setHistoryVisible(!historyVisible)}
            >
                <span class="history-icon">📚</span>
                <span class="history-text">View History</span>
                <span class="history-count">{count}</span>
            </button>

            <HistoryPanel
                visible={historyVisible}
                history={history}
                count={count}
                onClear={handleClearHistory}
                onSelectEntry={setSelectedEntry}
            />

            <SettingsSection
                settings={settings}
                onSettingsChange={handleSettingsChange}
            />

            <ModelGrid
                selectedModel={settings.selectedModel}
                onSelectModel={handleModelSelect}
            />

            {/* Save Button */}
            <div class="save-btn-wrapper">
                <button
                    class={`save-btn ${saveStatus === 'saved' ? 'saved' : ''}`}
                    onClick={handleSave}
                >
                    <span class="save-text">Save Settings</span>
                    <span class="save-icon">✓</span>
                </button>
            </div>

            {/* Footer */}
            <div class="footer">
                <span>Powered by OpenRouter</span>
            </div>

            <AnswerModal
                entry={selectedEntry}
                onClose={() => setSelectedEntry(null)}
                onCopy={handleCopy}
                copied={copied}
            />
        </div>
    );
}
