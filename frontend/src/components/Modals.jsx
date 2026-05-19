import React, { useState } from 'react';

export function UsernameModal({ onSubmit }) {
  const [name, setName] = useState('');
  const trimmed = name.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (trimmed.length >= 2) onSubmit(trimmed);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="username-title">
      <div className="modal">
        <div className="modal-icon">🧩</div>
        <h2 id="username-title">Daily Sudoku</h2>
        <p>
          Enter a display name to join today's puzzle and appear on the leaderboard.
          No account needed — your name is saved locally.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            id="username-input"
            className="modal-input"
            type="text"
            placeholder="Your name (e.g. AlexK)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            autoFocus
            autoComplete="off"
          />
          <div className="modal-actions">
            <button
              id="start-btn"
              type="submit"
              className="btn btn-primary"
              disabled={trimmed.length < 2}
            >
              Start Puzzle →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CompletedModal({ username, timeMs, leaderboard, onClose }) {
  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const myEntry = leaderboard.find(e => e.username === username);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="complete-title">
      <div className="modal">
        <div className="modal-icon">🎉</div>
        <h2 id="complete-title">Puzzle Complete!</h2>
        <p>Excellent work, <strong>{username}</strong>!</p>
        <div className="completed-banner">
          <div className="completed-stats">
            <div className="stat-item">
              <div className="stat-val">{formatTime(timeMs)}</div>
              <div className="stat-label">Your Time</div>
            </div>
            {myEntry && (
              <div className="stat-item">
                <div className="stat-val">#{myEntry.rank}</div>
                <div className="stat-label">Rank Today</div>
              </div>
            )}
            <div className="stat-item">
              <div className="stat-val">{leaderboard.length}</div>
              <div className="stat-label">Players</div>
            </div>
          </div>
          <button
            id="close-complete-btn"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem' }}
            onClick={onClose}
          >
            View Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
