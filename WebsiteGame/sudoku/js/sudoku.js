/* =====================================================
   sudoku.js - Sudoku grid generation and logical solving
   ===================================================== */
const SUDOKU_SIZE = 9;
const BOX_SIZE = 3;

function shuffled(values) {
  const result = values.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function shuffledGroups() {
  return shuffled([0, 1, 2]).flatMap((group) =>
    shuffled([0, 1, 2]).map((offset) => group * 3 + offset),
  );
}

function createSudokuSolution() {
  const rows = shuffledGroups();
  const columns = shuffledGroups();
  const digits = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  return Array.from({ length: 81 }, (_, index) => {
    const row = rows[Math.floor(index / 9)];
    const column = columns[index % 9];
    const pattern = (row * 3 + Math.floor(row / 3) + column) % 9;
    return digits[pattern];
  });
}

function bitCount(value) {
  let count = 0;
  while (value) {
    value &= value - 1;
    count++;
  }
  return count;
}

function boxOf(row, column) {
  return Math.floor(row / BOX_SIZE) * BOX_SIZE + Math.floor(column / BOX_SIZE);
}

function candidateMasks(values) {
  const rowMasks = Array(9).fill(0);
  const columnMasks = Array(9).fill(0);
  const boxMasks = Array(9).fill(0);
  const fullMask = (1 << 9) - 1;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (!value) continue;
    const row = Math.floor(i / 9);
    const column = i % 9;
    const box = boxOf(row, column);
    const bit = 1 << (value - 1);
    if ((rowMasks[row] & bit) || (columnMasks[column] & bit) || (boxMasks[box] & bit))
      return null;
    rowMasks[row] |= bit;
    columnMasks[column] |= bit;
    boxMasks[box] |= bit;
  }

  const candidates = Array(81).fill(0);
  for (let i = 0; i < values.length; i++) {
    if (values[i]) continue;
    const row = Math.floor(i / 9);
    const column = i % 9;
    candidates[i] =
      fullMask & ~(rowMasks[row] | columnMasks[column] | boxMasks[boxOf(row, column)]);
    if (!candidates[i]) return null;
  }
  return { candidates, rowMasks, columnMasks, boxMasks };
}

function countSolutions(values, limit = 2) {
  const board = values.slice();
  const state = candidateMasks(board);
  if (!state) return 0;
  const rowMasks = state.rowMasks;
  const columnMasks = state.columnMasks;
  const boxMasks = state.boxMasks;
  const fullMask = (1 << 9) - 1;
  let found = 0;

  function search() {
    if (found >= limit) return;

    let bestIndex = -1;
    let bestMask = 0;
    let bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (board[i]) continue;
      const row = Math.floor(i / 9);
      const column = i % 9;
      const mask =
        fullMask &
        ~(rowMasks[row] | columnMasks[column] | boxMasks[boxOf(row, column)]);
      const count = bitCount(mask);
      if (!count) return;
      if (count < bestCount) {
        bestIndex = i;
        bestMask = mask;
        bestCount = count;
        if (count === 1) break;
      }
    }

    if (bestIndex < 0) {
      found++;
      return;
    }

    const row = Math.floor(bestIndex / 9);
    const column = bestIndex % 9;
    const box = boxOf(row, column);
    for (let bit = 1; bit <= fullMask; bit <<= 1) {
      if (!(bestMask & bit)) continue;
      board[bestIndex] = 1 + Math.log2(bit);
      rowMasks[row] |= bit;
      columnMasks[column] |= bit;
      boxMasks[box] |= bit;
      search();
      board[bestIndex] = 0;
      rowMasks[row] &= ~bit;
      columnMasks[column] &= ~bit;
      boxMasks[box] &= ~bit;
      if (found >= limit) return;
    }
  }

  search();
  return found;
}

function findLogicalMove(values) {
  const state = candidateMasks(values);
  if (!state) return null;
  const { candidates, rowMasks, columnMasks, boxMasks } = state;
  for (let i = 0; i < 81; i++) {
    if (candidates[i] && bitCount(candidates[i]) === 1)
      return { i, value: 1 + Math.log2(candidates[i]), reason: "cell" };
  }

  const units = [];
  for (let row = 0; row < 9; row++)
    units.push(Array.from({ length: 9 }, (_, column) => row * 9 + column));
  for (let column = 0; column < 9; column++)
    units.push(Array.from({ length: 9 }, (_, row) => row * 9 + column));
  for (let box = 0; box < 9; box++) {
    const firstRow = Math.floor(box / 3) * 3;
    const firstColumn = (box % 3) * 3;
    units.push(
      Array.from({ length: 9 }, (_, offset) =>
        (firstRow + Math.floor(offset / 3)) * 9 + firstColumn + (offset % 3),
      ),
    );
  }

  for (let unitIndex = 0; unitIndex < units.length; unitIndex++) {
    const unit = units[unitIndex];
    const used =
      unitIndex < 9
        ? rowMasks[unitIndex]
        : unitIndex < 18
          ? columnMasks[unitIndex - 9]
          : boxMasks[unitIndex - 18];
    for (let value = 1; value <= 9; value++) {
      const bit = 1 << (value - 1);
      if (used & bit) continue;
      let found = -1;
      for (const i of unit) {
        if (!(candidates[i] & bit)) continue;
        if (found !== -1) {
          found = -2;
          break;
        }
        found = i;
      }
      if (found >= 0)
        return {
          i: found,
          value,
          reason: unitIndex < 9 ? "row" : unitIndex < 18 ? "column" : "box",
        };
    }
  }
  return null;
}

function isLogicalMove(values, index, value) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= 81 ||
    values[index] ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 9
  )
    return false;

  const state = candidateMasks(values);
  if (!state) return false;
  const { candidates } = state;
  const bit = 1 << (value - 1);
  if (!(candidates[index] & bit)) return false;
  if (bitCount(candidates[index]) === 1) return true;

  const row = Math.floor(index / 9);
  const column = index % 9;
  const box = boxOf(row, column);
  const units = [
    Array.from({ length: 9 }, (_, offset) => row * 9 + offset),
    Array.from({ length: 9 }, (_, offset) => offset * 9 + column),
    Array.from({ length: 9 }, (_, offset) => {
      const firstRow = Math.floor(box / 3) * 3;
      const firstColumn = (box % 3) * 3;
      return (firstRow + Math.floor(offset / 3)) * 9 + firstColumn + (offset % 3);
    }),
  ];
  return units.some(
    (unit) => unit.filter((cell) => candidates[cell] & bit).length === 1,
  );
}

function isLogicallySolvable(values) {
  const board = values.slice();
  while (board.some((value) => !value)) {
    const move = findLogicalMove(board);
    if (!move) return false;
    board[move.i] = move.value;
  }
  return true;
}

function createPuzzle(n, difficulty) {
  if (n !== SUDOKU_SIZE) throw new RangeError("Sudoku boards must be 9 by 9.");
  const solution = createSudokuSolution();
  const values = solution.slice();
  const targetBlanks = Math.floor(
    81 * ({ easy: 0.4, medium: 0.5, hard: 0.6 }[difficulty] || 0.6),
  );
  const cells = shuffled(Array.from({ length: 81 }, (_, i) => i));
  let removed = 0;

  for (const i of cells) {
    if (removed >= targetBlanks) break;
    values[i] = 0;
    if (isLogicallySolvable(values) && countSolutions(values) === 1) removed++;
    else values[i] = solution[i];
  }

  return {
    solution,
    values,
    given: values.map((value) => value !== 0),
  };
}
