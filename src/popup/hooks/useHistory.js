import { useState, useEffect } from 'preact/hooks';

export function useHistory() {
    const [history, setHistory] = useState([]);
    const [count, setCount] = useState(0);

    useEffect(() => {
        chrome.storage.local.get({ solveHistory: [] }, (result) => {
            setHistory(result.solveHistory || []);
            setCount((result.solveHistory || []).length);
        });
    }, []);

    const clearHistory = async () => {
        setHistory([]);
        setCount(0);
        await chrome.storage.local.set({ solveHistory: [] });
    };

    return { history, count, clearHistory };
}

export function useStats() {
    const [solvedCount, setSolvedCount] = useState(0);

    useEffect(() => {
        chrome.storage.sync.get({ solvedCount: 0, lastSolvedDate: '' }, (result) => {
            const today = new Date().toDateString();
            if (result.lastSolvedDate === today) {
                setSolvedCount(result.solvedCount);
            } else {
                setSolvedCount(0);
            }
        });
    }, []);

    return { solvedCount };
}
