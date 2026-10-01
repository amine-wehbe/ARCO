// Pure Battleship game logic — ship validation, hit detection, win condition
const ROWS = 10;
const COLS = 10;

const REQUIRED_SHIPS = [
  { name: "CARRIER",    size: 5 },
  { name: "BATTLESHIP", size: 4 },
  { name: "CRUISER",    size: 3 },
  { name: "SUBMARINE",  size: 3 },
  { name: "DESTROYER",  size: 2 },
];

// Build a 10x10 board from ship list — returns null if invalid
function buildBoard(ships) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (const { name, cells } of ships) {
    for (const { r, c } of cells) {
      if (!Number.isInteger(r) || !Number.isInteger(c)) return null;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
      if (board[r][c]) return null; // overlap
      board[r][c] = name;
    }
  }
  return board;
}

// Validate ship placement: correct ships, correct sizes, straight lines, no overlap
function validateShips(ships) {
  if (!Array.isArray(ships) || ships.length !== REQUIRED_SHIPS.length) return false;
  for (const req of REQUIRED_SHIPS) {
    const s = ships.find(s => s.name === req.name);
    if (!s || !Array.isArray(s.cells) || s.cells.length !== req.size) return false;
    const rows = s.cells.map(c => c.r);
    const cols = s.cells.map(c => c.c);
    const sameRow = rows.every(r => r === rows[0]);
    const sameCol = cols.every(c => c === cols[0]);
    if (!sameRow && !sameCol) return false;
    // Cells must be consecutive — no gaps (e.g. a carrier spread over columns 0,2,4,6,8)
    const line = (sameRow ? cols : rows).slice().sort((a, b) => a - b);
    if (line.some((v, i) => i > 0 && v !== line[i - 1] + 1)) return false;
  }
  return buildBoard(ships) !== null;
}

// Process an attack — mutates shots array, returns { hit, sunkShip, gameOver } or null if invalid
function processAttack(board, shots, r, c) {
  if (!board || !shots || !Number.isInteger(r) || !Number.isInteger(c)) return null;
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS || shots[r][c].fired) return null;
  const hit = !!board[r][c];
  shots[r][c] = { fired: true, hit };

  let sunkShip = null;
  if (hit) {
    const name = board[r][c];
    const sunk = board.every((row, ri) =>
      row.every((cell, ci) => cell !== name || shots[ri][ci].fired)
    );
    if (sunk) sunkShip = name;
  }

  const gameOver = board.every((row, ri) =>
    row.every((cell, ci) => !cell || shots[ri][ci].fired)
  );

  return { hit, sunkShip, gameOver };
}

// Empty 10x10 shots grid
function emptyShots() {
  return Array.from({ length: ROWS }, () =>
    Array(COLS).fill(null).map(() => ({ fired: false, hit: false }))
  );
}

module.exports = { validateShips, buildBoard, processAttack, emptyShots };
