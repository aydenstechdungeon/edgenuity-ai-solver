import { useState } from 'preact/hooks';

function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function HistoryPanel({ visible, history, count, onClear, onSelectEntry }) {
    if (!visible) return null;

    return (
        <div class="history-panel visible">
            <div class="history-panel-header">
                <span>Recent Solves</span>
                <button class="clear-history-btn" title="Clear History" onClick={onClear}>
                    🗑️
                </button>
            </div>
            <div class="history-list">
                {history.length === 0 ? (
                    <div class="history-empty">No history yet</div>
                ) : (
                    history
                        .slice()
                        .reverse()
                        .slice(0, 10)
                        .map((entry) => (
                            <div
                                key={entry.id}
                                class="history-item"
                                onClick={() => onSelectEntry(entry)}
                            >
                                <div class="history-item-time">
                                    {formatTime(entry.timestamp)} • {entry.model || 'AI'}
                                </div>
                                <div class="history-item-question">{entry.question}</div>
                            </div>
                        ))
                )}
            </div>
        </div>
    );
}
