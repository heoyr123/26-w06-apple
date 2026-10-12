const BOARD_SIZE = 8;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const ROUND_SECONDS = 60;
const BEST_SCORE_KEY = 'apple-game-best-score';

const boardElement = document.querySelector('#board');
const scoreElement = document.querySelector('#score');
const bestScoreElement = document.querySelector('#best-score');
const timeElement = document.querySelector('#time');
const selectionSumElement = document.querySelector('#selection-sum');
const statusElement = document.querySelector('#status-message');
const startButton = document.querySelector('#start-button');
const restartButton = document.querySelector('#restart-button');
const boardOverlay = document.querySelector('#board-overlay');
const finalScoreElement = document.querySelector('#final-score');

const state = {
  cells: [],
  selectedIndexes: [],
  score: 0,
  bestScore: loadBestScore(),
  timeLeft: ROUND_SECONDS,
  isPlaying: false,
  isPointerDown: false,
  timerId: null
};

function loadBestScore() {
  const savedScore = Number.parseInt(localStorage.getItem(BEST_SCORE_KEY), 10);
  return Number.isFinite(savedScore) ? savedScore : 0;
}

function saveBestScore() {
  localStorage.setItem(BEST_SCORE_KEY, String(state.bestScore));
}

function randomNumber() {
  return Math.floor(Math.random() * 9) + 1;
}

function applyGravity() {
  for (let column = 0; column < BOARD_SIZE; column += 1) {
    const remainingCells = [];

    for (let row = BOARD_SIZE - 1; row >= 0; row -= 1) {
      const value = state.cells[row * BOARD_SIZE + column];
      if (value !== null) remainingCells.push(value);
    }

    for (let row = BOARD_SIZE - 1; row >= 0; row -= 1) {
      const value = remainingCells[BOARD_SIZE - 1 - row] ?? randomNumber();
      state.cells[row * BOARD_SIZE + column] = value;
    }
  }
}

function celebrateBestScore() {
  const confettiLayer = document.createElement('div');
  confettiLayer.className = 'confetti-layer';
  confettiLayer.setAttribute('aria-hidden', 'true');

  for (let index = 0; index < 56; index += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.setProperty('--x', `${Math.random() * 100}%`);
    piece.style.setProperty('--drift', `${Math.random() * 180 - 90}px`);
    piece.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
    piece.style.setProperty('--delay', `${Math.random() * 180}ms`);
    piece.style.setProperty('--color', ['#ed765f', '#f6c85f', '#2f6b4f', '#7bb7a0'][index % 4]);
    confettiLayer.append(piece);
  }

  document.body.append(confettiLayer);
  window.setTimeout(() => confettiLayer.remove(), 4500);
}

function createBoard() {
  state.cells = Array.from({ length: CELL_COUNT }, () => randomNumber());
  renderBoard();
}

function renderBoard() {
  boardElement.replaceChildren();

  state.cells.forEach((value, index) => {
    const cell = document.createElement('button');
    cell.className = 'cell';
    cell.type = 'button';
    cell.dataset.index = String(index);
    cell.setAttribute('role', 'gridcell');

    if (value === null) {
      cell.classList.add('empty');
      cell.disabled = true;
      cell.setAttribute('aria-label', '빈 칸');
    } else {
      const apple = document.createElement('span');
      apple.className = 'apple-icon';
      apple.textContent = '🍎';
      apple.setAttribute('aria-hidden', 'true');

      const number = document.createElement('span');
      number.className = 'cell-number';
      number.textContent = String(value);

      cell.append(apple, number);
      cell.setAttribute('aria-label', `${value}, ${index + 1}번째 칸`);
    }

    boardElement.append(cell);
  });
}

function updateScoreboard() {
  scoreElement.textContent = String(state.score);
  bestScoreElement.textContent = String(state.bestScore);
  timeElement.textContent = String(state.timeLeft);
  selectionSumElement.textContent = String(getSelectionSum());
}

function getSelectionSum() {
  return state.selectedIndexes.reduce((sum, index) => sum + (state.cells[index] ?? 0), 0);
}

function setStatus(message, type = '') {
  statusElement.textContent = message;
  statusElement.className = `status-message ${type}`.trim();
}

function getRow(index) {
  return Math.floor(index / BOARD_SIZE);
}

function areAdjacent(firstIndex, secondIndex) {
  const rowDifference = Math.abs(getRow(firstIndex) - getRow(secondIndex));
  const columnDifference = Math.abs((firstIndex % BOARD_SIZE) - (secondIndex % BOARD_SIZE));
  return rowDifference <= 1 && columnDifference <= 1 && (rowDifference > 0 || columnDifference > 0);
}

function getCellElement(index) {
  return boardElement.querySelector(`[data-index="${index}"]`);
}

function updateSelectionStyles() {
  document.querySelectorAll('.cell.selected').forEach((cell) => cell.classList.remove('selected'));
  state.selectedIndexes.forEach((index) => getCellElement(index)?.classList.add('selected'));
  selectionSumElement.textContent = String(getSelectionSum());
}

function selectCell(index) {
  if (!state.isPlaying || state.cells[index] === null) return false;
  if (state.selectedIndexes.includes(index)) return false;

  const lastIndex = state.selectedIndexes.at(-1);
  if (lastIndex !== undefined && !areAdjacent(lastIndex, index)) return false;

  state.selectedIndexes.push(index);
  updateSelectionStyles();
  setStatus(`선택 중 · 합계 ${getSelectionSum()}`);
  return true;
}

function clearSelection() {
  state.selectedIndexes = [];
  updateSelectionStyles();
}

function finishSelection() {
  if (state.selectedIndexes.length === 0) return;

  const selectedSum = getSelectionSum();
  const selectedCount = state.selectedIndexes.length;

  if (selectedSum > 0 && selectedSum % 10 === 0) {
    state.selectedIndexes.forEach((index) => { state.cells[index] = null; });
    applyGravity();
    state.score += selectedCount;
    renderBoard();
    updateScoreboard();
    setStatus(`${selectedCount}칸을 제거했어요! +${selectedCount}점`, 'success');
  } else {
    setStatus(`합계 ${selectedSum}은(는) 10의 배수가 아니에요.`, 'warning');
  }

  clearSelection();
}

function startRound() {
  window.clearInterval(state.timerId);
  state.score = 0;
  state.timeLeft = ROUND_SECONDS;
  state.isPlaying = true;
  state.isPointerDown = false;
  boardOverlay.hidden = true;
  boardElement.classList.remove('is-locked');
  startButton.textContent = '게임 다시 시작';
  createBoard();
  updateScoreboard();
  setStatus('숫자를 이어 합계를 만들어보세요.');

  state.timerId = window.setInterval(() => {
    state.timeLeft -= 1;
    updateScoreboard();
    if (state.timeLeft <= 0) endRound();
  }, 1000);
}

function endRound() {
  window.clearInterval(state.timerId);
  state.timerId = null;
  state.isPlaying = false;
  state.isPointerDown = false;
  clearSelection();
  boardElement.classList.add('is-locked');
  const isNewBest = state.score > state.bestScore;
  if (isNewBest) {
    state.bestScore = state.score;
    saveBestScore();
    celebrateBestScore();
    updateScoreboard();
  }
  finalScoreElement.textContent = String(state.score);
  boardOverlay.hidden = false;
  setStatus(isNewBest ? '새로운 최고 기록입니다! 컨페티를 확인해보세요.' : '라운드가 끝났습니다. 다시 플레이해보세요.', 'warning');
}

boardElement.addEventListener('pointerdown', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell || !state.isPlaying) return;
  event.preventDefault();
  state.isPointerDown = true;
  boardElement.setPointerCapture(event.pointerId);
  clearSelection();
  selectCell(Number(cell.dataset.index));
});

boardElement.addEventListener('pointermove', (event) => {
  if (!state.isPointerDown || !state.isPlaying) return;
  const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('.cell');
  if (cell && boardElement.contains(cell)) selectCell(Number(cell.dataset.index));
});

function finishPointer(event) {
  if (!state.isPointerDown) return;
  state.isPointerDown = false;
  if (boardElement.hasPointerCapture(event.pointerId)) boardElement.releasePointerCapture(event.pointerId);
  finishSelection();
}

boardElement.addEventListener('pointerup', finishPointer);
boardElement.addEventListener('pointercancel', finishPointer);
startButton.addEventListener('click', startRound);
restartButton.addEventListener('click', startRound);

bestScoreElement.textContent = String(state.bestScore);
createBoard();
updateScoreboard();
