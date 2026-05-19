// ── Sudoku validation utilities ─────────────────────────────────────────────

/**
 * Find all cells that violate Sudoku rules.
 * Returns a Set of "row-col" strings for error cells.
 */
export function findErrors(board) {
  const errors = new Set();

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = board[r][c];
      if (!val) continue;

      // Check row
      for (let cc = 0; cc < 9; cc++) {
        if (cc !== c && board[r][cc] === val) {
          errors.add(`${r}-${c}`);
          errors.add(`${r}-${cc}`);
        }
      }
      // Check column
      for (let rr = 0; rr < 9; rr++) {
        if (rr !== r && board[rr][c] === val) {
          errors.add(`${r}-${c}`);
          errors.add(`${rr}-${c}`);
        }
      }
      // Check 3×3 box
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let rr = br; rr < br + 3; rr++) {
        for (let cc = bc; cc < bc + 3; cc++) {
          if ((rr !== r || cc !== c) && board[rr][cc] === val) {
            errors.add(`${r}-${c}`);
            errors.add(`${rr}-${cc}`);
          }
        }
      }
    }
  }
  return errors;
}

/**
 * Check which rows, columns, and boxes are newly completed correctly.
 * Returns arrays of completed region identifiers.
 *   rows: [0..8], cols: [0..8], boxes: [0..8] (row-major)
 */
export function findCompletedRegions(board, prevCompleted) {
  const rows = [], cols = [], boxes = [];

  // Rows
  for (let r = 0; r < 9; r++) {
    if (prevCompleted.rows.includes(r)) continue;
    const nums = new Set(board[r]);
    if (nums.size === 9 && !nums.has(0)) rows.push(r);
  }
  // Columns
  for (let c = 0; c < 9; c++) {
    if (prevCompleted.cols.includes(c)) continue;
    const nums = new Set(board.map(row => row[c]));
    if (nums.size === 9 && !nums.has(0)) cols.push(c);
  }
  // Boxes
  for (let b = 0; b < 9; b++) {
    if (prevCompleted.boxes.includes(b)) continue;
    const br = Math.floor(b / 3) * 3;
    const bc = (b % 3) * 3;
    const nums = new Set();
    for (let r = br; r < br + 3; r++)
      for (let c = bc; c < bc + 3; c++)
        nums.add(board[r][c]);
    if (nums.size === 9 && !nums.has(0)) boxes.push(b);
  }
  return { rows, cols, boxes };
}

/**
 * Check if the entire board is filled (no zeros)
 */
export function isBoardFilled(board) {
  return board.every(row => row.every(v => v !== 0));
}

/**
 * Format milliseconds → "MM:SS"
 */
export function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Get today's date string YYYY-MM-DD in UTC
 */
export function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Format a date string nicely: "Monday, May 19"
 */
export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
