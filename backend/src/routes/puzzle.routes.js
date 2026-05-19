const express = require('express');
const router = express.Router();
const { generateDailyPuzzle, getTodayString } = require('../utils/sudoku');
const leaderboardService = require('../services/leaderboard.service');

// In-memory cache so we don't regenerate on every request
let puzzleCache = { date: null, data: null };

function getCachedPuzzle(dateStr) {
  if (puzzleCache.date !== dateStr) {
    puzzleCache = {
      date: dateStr,
      data: generateDailyPuzzle(dateStr), // difficulty auto-derived from date
    };
  }
  return puzzleCache.data;
}

/**
 * GET /api/puzzle
 * Returns today's puzzle (puzzle grid + difficulty, NOT the solution)
 */
router.get('/', (req, res) => {
  const dateStr = getTodayString();
  const { puzzle, date, difficulty, solution } = getCachedPuzzle(dateStr);

  res.json({
    success: true,
    date,
    difficulty,
    puzzle,
    solution,
  });
});

/**
 * GET /api/puzzle/hint?row=0-8&col=0-8
 * Returns the solution value for one specific cell
 */
router.get('/hint', (req, res) => {
  const dateStr = getTodayString();
  const row = parseInt(req.query.row, 10);
  const col = parseInt(req.query.col, 10);

  if (isNaN(row) || isNaN(col) || row < 0 || row > 8 || col < 0 || col > 8) {
    return res.status(400).json({ success: false, message: 'Invalid row/col' });
  }

  const { solution } = getCachedPuzzle(dateStr);

  res.json({
    success: true,
    row,
    col,
    value: solution[row][col],
  });
});

/**
 * POST /api/puzzle/verify
 * Verify the entire submitted board against the solution.
 * Body: { board: number[][] }
 */
router.post('/verify', (req, res) => {
  const dateStr = getTodayString();
  const { board } = req.body;

  if (!Array.isArray(board) || board.length !== 9) {
    return res.status(400).json({ success: false, message: 'Invalid board' });
  }

  const { solution } = getCachedPuzzle(dateStr);
  const isCorrect = board.every((row, r) =>
    row.every((val, c) => val === solution[r][c])
  );

  res.json({ success: true, correct: isCorrect });
});

/**
 * GET /api/puzzle/leaderboard
 * Returns today's leaderboard (empty array if Redis unavailable)
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const dateStr = getTodayString();
    const entries = await leaderboardService.getLeaderboard(dateStr);
    res.json({ success: true, date: dateStr, entries });
  } catch (err) {
    // Redis may be unavailable in local dev — return empty gracefully
    console.warn('[Leaderboard GET] Redis unavailable, returning empty:', err.message);
    res.json({ success: true, date: getTodayString(), entries: [] });
  }
});

/**
 * POST /api/puzzle/complete
 * Submit a completed puzzle score
 * Body: { userId: string, username: string, timeMs: number, board: number[][] }
 */
router.post('/complete', async (req, res) => {
  const dateStr = getTodayString();
  const { userId, username, timeMs, board } = req.body;

  if (!username || typeof username !== 'string' || username.trim().length < 1) {
    return res.status(400).json({ success: false, message: 'Invalid username' });
  }
  if (typeof timeMs !== 'number' || timeMs <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid time' });
  }
  if (!Array.isArray(board) || board.length !== 9) {
    return res.status(400).json({ success: false, message: 'Invalid board' });
  }

  const { solution } = getCachedPuzzle(dateStr);

  // Server-side verify before accepting the score
  const isCorrect = board.every((row, r) =>
    row.every((val, c) => val === solution[r][c])
  );

  if (!isCorrect) {
    return res.status(400).json({ success: false, message: 'Board solution is incorrect' });
  }

  const cleanName = username.trim().slice(0, 30);
  const cleanUserId = userId ? String(userId).trim() : null;

  try {
    await leaderboardService.submitScore(dateStr, cleanUserId, cleanName, timeMs);
    const entries = await leaderboardService.getLeaderboard(dateStr);
    res.json({ success: true, leaderboard: entries });
  } catch (err) {
    // Redis unavailable — still acknowledge the completion, return empty leaderboard
    console.warn('[Complete POST] Redis unavailable:', err.message);
    res.json({ success: true, leaderboard: [] });
  }
});

module.exports = router;
