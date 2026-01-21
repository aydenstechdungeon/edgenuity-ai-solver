import { useEffect } from 'preact/hooks';

function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatResponse(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>')
        .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
        .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
}

export function AnswerModal({ entry, onClose, onCopy, copied }) {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!entry) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div class="answer-modal-overlay visible" onClick={handleBackdropClick}>
            <div class="answer-modal-content">
                <div class="answer-modal-header">
                    <span class="answer-modal-title">🤖 AI Answer</span>
                    <div class="answer-modal-actions">
                        <button
                            class={`answer-modal-copy-btn ${copied ? 'copied' : ''}`}
                            title="Copy answer"
                            onClick={() => onCopy(entry.answer)}
                        >
                            {copied ? '✓' : '📋'}
                        </button>
                        <button class="answer-modal-close-btn" title="Close" onClick={onClose}>
                            ✕
                        </button>
                    </div>
                </div>
                <div class="answer-modal-body">
                    <div class="answer-modal-question-section">
                        <div class="answer-modal-section-label">📝 Question</div>
                        <div class="answer-modal-question">{entry.question}</div>
                    </div>
                    <div class="answer-modal-answer-section">
                        <div class="answer-modal-section-label">💡 Answer</div>
                        <div
                            class="answer-modal-answer"
                            dangerouslySetInnerHTML={{ __html: formatResponse(entry.answer) }}
                        />
                    </div>
                </div>
                <div class="answer-modal-footer">
                    <span class="answer-modal-model-info">{entry.model || 'AI'}</span>
                    <span class="answer-modal-time">{formatTime(entry.timestamp)}</span>
                </div>
            </div>
        </div>
    );
}
