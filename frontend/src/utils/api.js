const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const api = {
  // Difficulty is determined server-side from the date — no param needed
  getPuzzle: () =>
    request('GET', '/puzzle'),

  getHint: (row, col) =>
    request('GET', `/puzzle/hint?row=${row}&col=${col}`),

  submitComplete: (userId, username, timeMs, board) =>
    request('POST', '/puzzle/complete', { userId, username, timeMs, board }),

  getLeaderboard: () =>
    request('GET', '/puzzle/leaderboard'),
};
