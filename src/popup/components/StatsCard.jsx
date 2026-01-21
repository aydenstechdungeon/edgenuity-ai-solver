export function StatsCard({ solvedCount }) {
    return (
        <div class="stats-card">
            <div class="stat">
                <span class="stat-value">{solvedCount}</span>
                <span class="stat-label">Solved Today</span>
            </div>
        </div>
    );
}
