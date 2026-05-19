import React from 'react';
import { formatTime } from '../utils/sudoku';

export default function Leaderboard({ entries, username, loading, onRefresh }) {
  const medalIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const rankClass = (rank) => {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return 'rank-other';
  };

  return (
    <div className="card leaderboard-panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <span className="icon">🏆</span> Today's Leaderboard
        </h2>
        <button
          className="lb-refresh-btn"
          onClick={onRefresh}
          disabled={loading}
          id="lb-refresh-btn"
          aria-label="Refresh leaderboard"
        >
          {loading ? '…' : '↻ Refresh'}
        </button>
      </div>

      <div className="leaderboard-list">
        {entries.length === 0 ? (
          <div className="lb-empty">
            {loading ? 'Loading…' : 'No completions yet today. Be the first! 🚀'}
          </div>
        ) : (
          entries.map((e) => {
            const isMe = e.username === username;
            return (
              <div
                key={e.username}
                className={`lb-entry${isMe ? ' is-me' : ''}`}
                id={`lb-${e.username.replace(/\s+/g, '-')}`}
              >
                <div className={`lb-rank ${rankClass(e.rank)}`}>
                  {medalIcon(e.rank) || `#${e.rank}`}
                </div>
                <div className="lb-name">
                  {e.username}
                  {isMe && <span className="you-badge">YOU</span>}
                </div>
                <div className="lb-time">{formatTime(e.timeMs)}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
