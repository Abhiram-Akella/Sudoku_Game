import React, { useState, useEffect, useCallback, useRef } from 'react';
import SudokuGrid from './components/SudokuGrid';
import Leaderboard from './components/Leaderboard';
import { UsernameModal, CompletedModal } from './components/Modals';
import { useTimer } from './hooks/useTimer';
import { useToast } from './hooks/useToast';
import {
  findErrors,
  findCompletedRegions,
  isBoardFilled,
  formatTime,
  getTodayString,
  formatDate,
} from './utils/sudoku';
import { api } from './utils/api';

const MAX_HINTS = 3;
const USERNAME_KEY = 'sudoku_username';
const COMPLETED_KEY = 'sudoku_completed_';

export default function App() {
  // ── State ──────────────────────────────────────────────────────
  const [puzzle, setPuzzle]             = useState(null);
  const [solution, setSolution]         = useState(null);
  const [board, setBoard]               = useState(null);
  const [puzzleDifficulty, setPuzzleDifficulty] = useState('');
  const [selected, setSelected]         = useState(null);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [highlightNumber, setHighlightNumber] = useState(null);
  const [errors, setErrors]             = useState(new Set());
  const [flashCells, setFlashCells]     = useState(new Set());
  const [hintsSet, setHintsSet]         = useState(new Set());
  const [hintsUsed, setHintsUsed]       = useState(0);
  const [completedRegions, setCompleted]= useState({ rows: [], cols: [], boxes: [] });
  const [username, setUsername]         = useState(() => localStorage.getItem(USERNAME_KEY) || '');
  const [userId]                        = useState(() => {
    let id = localStorage.getItem('sudoku_userId');
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      localStorage.setItem('sudoku_userId', id);
    }
    return id;
  });
  const [showUsernameModal, setShowUsername] = useState(false);
  const [showCompleted, setShowCompleted]    = useState(false);
  const [leaderboard, setLeaderboard]   = useState([]);
  const [lbLoading, setLbLoading]       = useState(false);
  const [loading, setLoading]           = useState(true);
  const [gameOver, setGameOver]         = useState(false);
  const [finalTime, setFinalTime]       = useState(0);

  const { elapsed, start: startTimer, stop: stopTimer, reset: resetTimer } = useTimer();
  const { toasts, addToast } = useToast();

  const today = getTodayString();
  const completedKey = COMPLETED_KEY + today;

  // ── Fetch leaderboard ─────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try {
      const data = await api.getLeaderboard();
      setLeaderboard(data.entries || []);
    } catch {
      // Silently ignore — Redis may not be available in local dev
      setLeaderboard([]);
    } finally {
      setLbLoading(false);
    }
  }, []);

  // ── Puzzle complete ────────────────────────────────────────────
  const handlePuzzleComplete = useCallback(async (finalBoard) => {
    stopTimer();
    const timeMs = elapsed;
    setFinalTime(timeMs);
    setGameOver(true);
    localStorage.setItem(completedKey, timeMs.toString());

    const name = localStorage.getItem(USERNAME_KEY) || username;
    if (!name) return;

    try {
      const data = await api.submitComplete(userId, name, timeMs, finalBoard);
      setLeaderboard(data.leaderboard || []);
      setShowCompleted(true);
    } catch (err) {
      addToast('Could not submit score: ' + err.message, 'error');
      setShowCompleted(true);
      fetchLeaderboard();
    }
  }, [elapsed, stopTimer, completedKey, username, userId, addToast, fetchLeaderboard]);

  // ── Load puzzle ────────────────────────────────────────────────
  const loadPuzzle = useCallback(async (diff) => {
    setLoading(true);
    setSelected(null);
    setErrors(new Set());
    setFlashCells(new Set());
    setHintsSet(new Set());
    setHintsUsed(0);
    setCompleted({ rows: [], cols: [], boxes: [] });
    setGameOver(false);
    resetTimer();

    try {
      const data = await api.getPuzzle();
      setPuzzle(data.puzzle);
      setSolution(data.solution);
      setPuzzleDifficulty(data.difficulty);

      // If user has already completed today's puzzle, don't re-show
      const alreadyDone = localStorage.getItem(completedKey);
      if (!alreadyDone) {
        setBoard(data.puzzle.map(r => [...r]));
        // Prompt username if not set
        if (!localStorage.getItem(USERNAME_KEY)) {
          setShowUsername(true);
        } else {
          startTimer();
        }
      } else {
        setBoard(data.solution.map(r => [...r]));
        setGameOver(true);
        setFinalTime(parseInt(alreadyDone, 10));
      }
    } catch (err) {
      addToast('Failed to load puzzle. Please refresh.', 'error', 5000);
    } finally {
      setLoading(false);
    }
  }, [completedKey, resetTimer, startTimer, addToast]);

  useEffect(() => { loadPuzzle(); }, []);

  useEffect(() => { fetchLeaderboard(); }, []);

  // ── Username submit ────────────────────────────────────────────
  const handleUsernameSubmit = (name) => {
    localStorage.setItem(USERNAME_KEY, name);
    setUsername(name);
    setShowUsername(false);
    startTimer();
  };

  // ── Number input ───────────────────────────────────────────────
  const handleNumberInputInternal = useCallback((num, r, c) => {
    if (gameOver || !board || !puzzle) return;
    if (puzzle[r][c] !== 0) return; // given cell

    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = num;
    setBoard(newBoard);

    // Validate errors
    const newErrors = findErrors(newBoard);
    setErrors(newErrors);
    
    // If filling a number, also highlight it
    if (num !== 0) setHighlightNumber(num);

    // Check completed regions
    if (num !== 0 && solution) {
      const newlyCompleted = findCompletedRegions(newBoard, completedRegions);

      const correctlyCompleted = {
        rows: newlyCompleted.rows.filter(row => newBoard[row].every((v, idx) => v === solution[row][idx])),
        cols: newlyCompleted.cols.filter(col => newBoard.every((row, idx) => row[col] === solution[idx][col])),
        boxes: newlyCompleted.boxes.filter(box => {
          const br = Math.floor(box / 3) * 3;
          const bc = (box % 3) * 3;
          for (let rr = br; rr < br + 3; rr++) {
            for (let cc = bc; cc < bc + 3; cc++) {
              if (newBoard[rr][cc] !== solution[rr][cc]) return false;
            }
          }
          return true;
        })
      };

      const flashSet = new Set();
      correctlyCompleted.rows.forEach(row => {
        for (let c2 = 0; c2 < 9; c2++) flashSet.add(`${row}-${c2}`);
      });
      correctlyCompleted.cols.forEach(col => {
        for (let r2 = 0; r2 < 9; r2++) flashSet.add(`${r2}-${col}`);
      });
      correctlyCompleted.boxes.forEach(box => {
        const br = Math.floor(box / 3) * 3;
        const bc = (box % 3) * 3;
        for (let rr = br; rr < br + 3; rr++)
          for (let cc = bc; cc < bc + 3; cc++)
            flashSet.add(`${rr}-${cc}`);
      });

      if (flashSet.size > 0) {
        setFlashCells(flashSet);
        setTimeout(() => setFlashCells(new Set()), 500);
      }
      
      if (correctlyCompleted.rows.length || correctlyCompleted.cols.length || correctlyCompleted.boxes.length) {
        setCompleted(prev => ({
          rows: [...prev.rows, ...correctlyCompleted.rows],
          cols: [...prev.cols, ...correctlyCompleted.cols],
          boxes: [...prev.boxes, ...correctlyCompleted.boxes],
        }));
      }
    }

    // Check completion
    if (isBoardFilled(newBoard) && newErrors.size === 0) {
      handlePuzzleComplete(newBoard);
    }
  }, [gameOver, board, puzzle, solution, completedRegions, handlePuzzleComplete]);

  // ── Cell selection ─────────────────────────────────────────────
  const handleSelect = useCallback((r, c) => {
    if (gameOver || !board) return;
    const cellValue = board[r][c];

    if (cellValue !== 0) {
      setHighlightNumber(cellValue);
      setSelected({ r, c });
    } else {
      setHighlightNumber(null);
      if (selectedNumber) {
        handleNumberInputInternal(selectedNumber, r, c);
      } else {
        setSelected({ r, c });
      }
    }
  }, [gameOver, board, selectedNumber, handleNumberInputInternal]);

  const handleNumpadClick = useCallback((num) => {
    setSelectedNumber(prev => prev === num ? null : num);
    if (selected && puzzle && puzzle[selected.r][selected.c] === 0) {
      handleNumberInputInternal(num, selected.r, selected.c);
      setSelected(null);
    }
  }, [selected, puzzle, handleNumberInputInternal]);


  // ── Hint ───────────────────────────────────────────────────────
  const handleHint = useCallback(async () => {
    if (gameOver || hintsUsed >= MAX_HINTS || !puzzle || !board) return;

    // Collect all empty non-given cells
    const emptyCells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] === 0 && board[r][c] === 0) {
          emptyCells.push({ r, c });
        }
      }
    }
    if (emptyCells.length === 0) return;

    // Pick a random empty cell
    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];

    try {
      const data = await api.getHint(r, c);
      const newBoard = board.map(row => [...row]);
      newBoard[r][c] = data.value;
      setBoard(newBoard);
      setHintsUsed(h => h + 1);
      setHintsSet(prev => new Set([...prev, `${r}-${c}`]));
      setSelected({ r, c });

      const newErrors = findErrors(newBoard);
      setErrors(newErrors);

      // Also check for completed regions — green flash on hints too
      if (solution) {
        const newlyCompleted = findCompletedRegions(newBoard, completedRegions);
        const correctlyCompleted = {
          rows: newlyCompleted.rows.filter(row => newBoard[row].every((v, idx) => v === solution[row][idx])),
          cols: newlyCompleted.cols.filter(col => newBoard.every((row, idx) => row[col] === solution[idx][col])),
          boxes: newlyCompleted.boxes.filter(box => {
            const br = Math.floor(box / 3) * 3;
            const bc = (box % 3) * 3;
            for (let rr = br; rr < br + 3; rr++) {
              for (let cc = bc; cc < bc + 3; cc++) {
                if (newBoard[rr][cc] !== solution[rr][cc]) return false;
              }
            }
            return true;
          })
        };

        const flashSet = new Set();
        correctlyCompleted.rows.forEach(row => {
          for (let c2 = 0; c2 < 9; c2++) flashSet.add(`${row}-${c2}`);
        });
        correctlyCompleted.cols.forEach(col => {
          for (let r2 = 0; r2 < 9; r2++) flashSet.add(`${r2}-${col}`);
        });
        correctlyCompleted.boxes.forEach(box => {
          const br = Math.floor(box / 3) * 3;
          const bc = (box % 3) * 3;
          for (let rr = br; rr < br + 3; rr++)
            for (let cc = bc; cc < bc + 3; cc++)
              flashSet.add(`${rr}-${cc}`);
        });

        if (flashSet.size > 0) {
          setFlashCells(flashSet);
          setTimeout(() => setFlashCells(new Set()), 500);
        }

        if (correctlyCompleted.rows.length || correctlyCompleted.cols.length || correctlyCompleted.boxes.length) {
          setCompleted(prev => ({
            rows: [...prev.rows, ...correctlyCompleted.rows],
            cols: [...prev.cols, ...correctlyCompleted.cols],
            boxes: [...prev.boxes, ...correctlyCompleted.boxes],
          }));
        }
      }

      addToast(`Hint: (${r + 1}, ${c + 1}) = ${data.value}`, 'info');

      // Check if hint completed the puzzle
      if (isBoardFilled(newBoard) && findErrors(newBoard).size === 0) {
        handlePuzzleComplete(newBoard);
      }
    } catch {
      addToast('Hint failed', 'error');
    }
  }, [gameOver, hintsUsed, puzzle, board, solution, completedRegions, addToast, handlePuzzleComplete]);

  // ── Erase ─────────────────────────────────────────────────────
  const handleErase = useCallback(() => {
    if (!selected || !board || !puzzle) return;
    const { r, c } = selected;
    if (puzzle[r][c] !== 0) return;
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = 0;
    setBoard(newBoard);
    setErrors(findErrors(newBoard));
  }, [selected, board, puzzle]);

  // ── Reset (clear user input, keep timer) ──────────────────────
  const handleReset = useCallback(() => {
    if (!puzzle) return;
    const freshBoard = puzzle.map(row => [...row]);
    setBoard(freshBoard);
    setErrors(new Set());
    setFlashCells(new Set());
    setHintsSet(new Set());
    setHintsUsed(0);
    setCompleted({ rows: [], cols: [], boxes: [] });
    setSelected(null);
    addToast('Board reset — timer keeps running', 'info');
  }, [puzzle, addToast]);

  // ── Keyboard input ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!selected) return;
      if (e.key >= '1' && e.key <= '9') handleNumberInputInternal(parseInt(e.key, 10), selected.r, selected.c);
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') handleErase();
      if (e.key === 'ArrowUp')    setSelected(s => s && { r: Math.max(0, s.r - 1), c: s.c });
      if (e.key === 'ArrowDown')  setSelected(s => s && { r: Math.min(8, s.r + 1), c: s.c });
      if (e.key === 'ArrowLeft')  setSelected(s => s && { r: s.r, c: Math.max(0, s.c - 1) });
      if (e.key === 'ArrowRight') setSelected(s => s && { r: s.r, c: Math.min(8, s.c + 1) });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, handleNumberInputInternal, handleErase]);

  // ── Progress calculation ───────────────────────────────────────
  // Progress calculation removed as per user request

  // ── Render ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="spinner" />
          <p style={{ color: 'var(--text-secondary)' }}>Loading today's puzzle…</p>
        </div>
      </div>
    );
  }

  const diffLabel = puzzleDifficulty
    ? puzzleDifficulty.charAt(0).toUpperCase() + puzzleDifficulty.slice(1)
    : '';

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-logo">
          <span className="logo-icon">🔢</span>
          <span>Daily<span className="logo-accent">Sudoku</span></span>
        </div>
        <div className="header-meta">
          <div className="header-date">{formatDate(today)}</div>
          {username && (
            <div className="header-date" style={{ color: 'var(--accent)' }}>
              👤 {username}
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="main-layout">
        {/* Game Panel */}
        <section className="card game-panel" aria-label="Sudoku game board">
          <div className="game-header">
            <h1 className="game-title">
              Today's Puzzle
              {diffLabel && (
                <span className={`diff-badge diff-${puzzleDifficulty}`}>{diffLabel}</span>
              )}
            </h1>
            <div className="timer" aria-live="polite">
              {gameOver ? formatTime(finalTime) : formatTime(elapsed)}
            </div>
          </div>

          {/* Grid */}
          <div className="sudoku-wrapper">
            {board && puzzle && (
              <SudokuGrid
                puzzle={puzzle}
                board={board}
                selected={selected}
                highlightNumber={highlightNumber}
                onSelect={handleSelect}
                flashCells={flashCells}
                hintsSet={hintsSet}
                errors={errors}
              />
            )}

            {/* Number Pad */}
            <div className="numpad" role="group" aria-label="Number input">
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <button
                  key={n}
                  id={`num-${n}`}
                  className={`numpad-btn ${selectedNumber === n ? 'active-num' : ''}`}
                  onClick={() => handleNumpadClick(n)}
                  disabled={gameOver}
                  aria-label={`Enter ${n}`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="action-bar">
              <button
                id="erase-btn"
                className="btn btn-ghost"
                onClick={handleErase}
                disabled={gameOver}
                title="Erase selected cell (Backspace)"
              >
                ✕ Erase
              </button>
              <button
                id="reset-btn"
                className="btn btn-warning"
                onClick={handleReset}
                disabled={gameOver}
                title="Clear all your entries (timer keeps running)"
              >
                ↺ Reset
              </button>
              <button
                id="hint-btn"
                className="btn btn-primary"
                onClick={handleHint}
                disabled={gameOver || hintsUsed >= MAX_HINTS}
                title="Fill a random empty cell with the correct value"
              >
                💡 Hint {hintsUsed > 0 ? `(${hintsUsed}/${MAX_HINTS})` : ''}
              </button>
            </div>

            <p className="hints-used">
              {hintsUsed >= MAX_HINTS
                ? 'No hints remaining'
                : `${MAX_HINTS - hintsUsed} hint${MAX_HINTS - hintsUsed !== 1 ? 's' : ''} remaining`}
            </p>
          </div>
        </section>

        {/* Right panel */}
        {gameOver && (
          <aside className="right-panel leaderboard-slide-in" aria-label="Stats and leaderboard">
            <Leaderboard
              entries={leaderboard}
              currentUserId={userId}
              loading={lbLoading}
              onRefresh={fetchLeaderboard}
            />
          </aside>
        )}
      </main>

      {/* Modals */}
      {showUsernameModal && (
        <UsernameModal onSubmit={handleUsernameSubmit} />
      )}
      {showCompleted && (
        <CompletedModal
          username={username}
          userId={userId}
          timeMs={finalTime}
          leaderboard={leaderboard}
          onClose={() => setShowCompleted(false)}
        />
      )}

      {/* Toast notifications */}
      <div className="toast-container" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`} role="alert">
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
