import React, { useCallback, useEffect, useRef } from 'react';
import { findErrors, findCompletedRegions } from '../utils/sudoku';

/**
 * Single cell component
 */
function Cell({ value, given, selected, highlighted, sameNum, error, hinted, flashing, onClick }) {
  const cls = [
    'sudoku-cell',
    given ? 'given' : value ? 'user-filled' : '',
    selected ? 'selected' : '',
    highlighted ? 'highlighted' : '',
    sameNum ? 'same-num' : '',
    error ? 'error' : '',
    hinted ? 'hint-cell' : '',
    flashing ? 'complete-flash' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cls}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Cell ${value || 'empty'}`}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {value || ''}
    </div>
  );
}

/**
 * Full 9×9 Sudoku grid
 */
export default function SudokuGrid({
  puzzle,
  board,
  selected,
  onSelect,
  flashCells,
  hintsSet,
  errors,
}) {
  const selectedVal = selected ? board[selected.r][selected.c] : null;

  const getHighlightState = (r, c) => {
    if (!selected) return { highlighted: false, sameNum: false };
    const isSameRow = r === selected.r;
    const isSameCol = c === selected.c;
    const isSameBox =
      Math.floor(r / 3) === Math.floor(selected.r / 3) &&
      Math.floor(c / 3) === Math.floor(selected.c / 3);
    const highlighted = isSameRow || isSameCol || isSameBox;
    const sameNum = selectedVal && board[r][c] === selectedVal && !(r === selected.r && c === selected.c);
    return { highlighted, sameNum };
  };

  // Alternating box pattern: boxes at (boxRow+boxCol) even = normal, odd = alt
  const isAltBox = (r, c) => {
    const boxRow = Math.floor(r / 3);
    const boxCol = Math.floor(c / 3);
    return (boxRow + boxCol) % 2 === 1;
  };

  // Row wrapper needed for CSS row-3 / row-6 box border selectors
  const rows = Array.from({ length: 9 }, (_, r) => r);

  return (
    <div className="sudoku-grid" id="sudoku-grid">
      {rows.map(r => (
        <React.Fragment key={r}>
          {board[r].map((val, c) => {
            const key = `${r}-${c}`;
            const isSelected = selected?.r === r && selected?.c === c;
            const { highlighted, sameNum } = getHighlightState(r, c);
            const altBox = isAltBox(r, c);
            const cls = [
              'sudoku-cell',
              altBox ? 'box-alt' : '',
              // Attach row class directly to cells for CSS row-3/row-6 sibling rules
              r === 2 ? 'row-end-3' : r === 5 ? 'row-end-6' : '',
              puzzle[r][c] !== 0 ? 'given' : val ? 'user-filled' : '',
              isSelected ? 'selected' : '',
              highlighted ? 'highlighted' : '',
              sameNum ? 'same-num' : '',
              errors.has(key) ? 'error' : '',
              hintsSet.has(key) ? 'hint-cell' : '',
              flashCells.has(key) ? 'complete-flash' : '',
            ].filter(Boolean).join(' ');

            return (
              <div
                key={key}
                className={cls}
                onClick={() => onSelect(r, c)}
                role="button"
                tabIndex={0}
                aria-label={`Row ${r+1} Col ${c+1}: ${val || 'empty'}`}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(r, c)}
              >
                {val || ''}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}
