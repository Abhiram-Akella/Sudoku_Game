/**
 * Sudoku Generator & Solver Utilities
 * Generates a deterministic puzzle based on a date seed so all users get the same puzzle.
 */

// Seeded pseudo-random number generator (Mulberry32)
function seededRandom(seed) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Get an integer seed from a date string (YYYY-MM-DD)
 */
function dateSeed(dateStr) {
  // Simple but effective: hash the date string
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) || 42;
}

/**
 * Shuffle an array using a seeded RNG
 */
function seededShuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Check if placing `num` at (row, col) is valid in the current board state
 */
function isValid(board, row, col, num) {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (board[row][c] === num) return false;
  }
  // Check column
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === num) return false;
  }
  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

/**
 * Solve the board using backtracking. Fills board in-place.
 * Returns true if solved, false if unsolvable.
 */
function solve(board, nums) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        for (const num of nums) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (solve(board, nums)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

/**
 * Count solutions (up to 2) to verify puzzle has a unique solution
 */
function countSolutions(board, limit = 2) {
  let count = 0;
  function bt() {
    if (count >= limit) return;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(board, row, col, num)) {
              board[row][col] = num;
              bt();
              board[row][col] = 0;
            }
          }
          return;
        }
      }
    }
    count++;
  }
  bt();
  return count;
}

/**
 * Generate a complete valid Sudoku solution using the seeded RNG
 */
function generateSolution(rng) {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  const nums = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
  solve(board, nums);
  return board;
}

/**
 * Remove cells from a complete solution to create a puzzle.
 * Difficulty: 'easy' ~35 clues, 'medium' ~30, 'hard' ~25
 */
function createPuzzle(solution, rng, difficulty = 'medium') {
  const cluesMap = { easy: 38, medium: 32, hard: 26 };
  const targetClues = cluesMap[difficulty] || 32;
  const cellsToRemove = 81 - targetClues;

  const puzzle = solution.map(row => [...row]);
  const positions = seededShuffle(
    Array.from({ length: 81 }, (_, i) => i),
    rng
  );

  let removed = 0;
  for (const pos of positions) {
    if (removed >= cellsToRemove) break;
    const row = Math.floor(pos / 9);
    const col = pos % 9;
    const backup = puzzle[row][col];
    puzzle[row][col] = 0;

    // Clone and check uniqueness
    const test = puzzle.map(r => [...r]);
    if (countSolutions(test) === 1) {
      removed++;
    } else {
      puzzle[row][col] = backup;
    }
  }

  return puzzle;
}

/**
 * Deterministically pick a difficulty for the given date.
 * Distribution: easy=25%, medium=50%, hard=25%
 */
function getDailyDifficulty(dateStr) {
  const seed = dateSeed(dateStr);
  const pick = seed % 4; // 0,1,2,3
  if (pick === 0) return 'easy';
  if (pick === 3) return 'hard';
  return 'medium'; // picks 1 and 2
}

/**
 * Main export: generate today's puzzle deterministically.
 * Difficulty is derived from the date — callers should NOT pass it.
 * @param {string} dateStr - YYYY-MM-DD format (UTC)
 */
function generateDailyPuzzle(dateStr) {
  const difficulty = getDailyDifficulty(dateStr);
  const seed = dateSeed(dateStr);
  const rng = seededRandom(seed);
  const solution = generateSolution(rng);
  const puzzle = createPuzzle(solution, rng, difficulty);

  return {
    date: dateStr,
    difficulty,
    puzzle,   // 9x9 grid with 0s for empty cells
    solution, // full solution
  };
}

/**
 * Get today's date string in YYYY-MM-DD (UTC)
 */
function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = { generateDailyPuzzle, getDailyDifficulty, getTodayString, isValid };
