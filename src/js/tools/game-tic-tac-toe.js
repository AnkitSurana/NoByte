/* Tic-tac-toe. You are X, the computer is O.
 *
 * The game is solved: with both sides playing perfectly it is always a draw, so
 * an opponent that never errs makes winning impossible, not hard. The win tally
 * could never move. Fairness here is not "play worse", it is "have a level
 * where a win is actually on the table", so the opponent has three:
 *   Easy    plays at random, but still takes a win and blocks yours.
 *   Fair    plays the best move most of the time, and slips sometimes.
 *   Perfect the old behaviour, and the label says a draw is your ceiling.
 * Fair is the default because a game you cannot win is not a game.
 */
import { celebrate } from "/js/celebrate.js";

const boardEl = document.getElementById("t-board");
const statusEl = document.getElementById("t-status");
const levelEl = document.getElementById("t-level");
const tally = { win: document.getElementById("t-win"), draw: document.getElementById("t-draw"), lose: document.getElementById("t-lose") };
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

let board, locked;

function winner(b) {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return { who: b[a], line: [a, c, d] };
  if (b.every((x) => x)) return { who: "draw" };
  return null;
}

// Minimax: returns a score from O's perspective (O maximises).
function minimax(b, turn) {
  const res = winner(b);
  if (res) return res.who === "O" ? 10 : res.who === "X" ? -10 : 0;
  const scores = [];
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = turn;
    scores.push({ i, score: minimax(b, turn === "O" ? "X" : "O") });
    b[i] = "";
  }
  return turn === "O"
    ? Math.max(...scores.map((s) => s.score))
    : Math.min(...scores.map((s) => s.score));
}

const free = () => board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** Every empty square, scored from O's point of view. */
function scoreMoves() {
  return free().map((i) => {
    board[i] = "O";
    const score = minimax(board, "X");
    board[i] = "";
    return { i, score };
  });
}

/** A square that finishes a line for `who`, if there is one. */
function lineMove(who) {
  for (const [a, b, c] of LINES) {
    const line = [a, b, c];
    const mine = line.filter((i) => board[i] === who).length;
    const empty = line.filter((i) => !board[i]);
    if (mine === 2 && empty.length === 1) return empty[0];
  }
  return -1;
}

/* The blunder rate is per move, and the computer plays about four moves a game,
 * so a 25% rate means it slips at some point in roughly two games in three.
 * Only some of those slips are ones you can punish, which lands a decent player
 * somewhere near a third of games won: enough to keep playing for. */
const SLIP = 0.25;

function chooseMove() {
  const level = levelEl ? levelEl.value : "fair";
  if (level === "easy") {
    // Still takes a win in front of it, and still blocks yours: an opponent
    // that ignores both is not easy, it is broken.
    const win = lineMove("O");
    if (win >= 0) return win;
    const block = lineMove("X");
    if (block >= 0) return block;
    return pick(free());
  }
  const moves = scoreMoves();
  const best = Math.max(...moves.map((m) => m.score));
  if (level === "fair" && Math.random() < SLIP) {
    // A slip is a real second-best move, not a random square: it stays
    // plausible, and it is the kind of mistake a person actually makes.
    const rest = moves.filter((m) => m.score < best);
    if (rest.length) {
      const next = Math.max(...rest.map((m) => m.score));
      return pick(rest.filter((m) => m.score === next).map((m) => m.i));
    }
  }
  return pick(moves.filter((m) => m.score === best).map((m) => m.i));
}

function render(highlight = []) {
  boardEl.innerHTML = "";
  board.forEach((v, i) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.textContent = v;
    cell.disabled = !!v || locked;
    if (highlight.includes(i)) cell.classList.add("win");
    cell.addEventListener("click", () => play(i));
    boardEl.appendChild(cell);
  });
}

const NOTE = {
  easy: "Easy takes a win in front of it and blocks yours, and is otherwise picking squares at random.",
  fair: "Fair plays the best move about three times in four. The rest of the time it settles for second best, which is where your openings come from.",
  perfect: "Perfect never errs. Tic-tac-toe is a solved game, so against it a draw is the best result there is.",
};

function finish(res) {
  locked = true;
  const level = levelEl ? levelEl.value : "fair";
  if (res.who === "X") {
    statusEl.innerHTML = `You win.<span class="verdict-sub">${NOTE[level]}</span>`;
    bump("win");
    render(res.line || []);
    celebrate(boardEl, { text: "You win", sub: "Three in a row" });
    return;
  }
  if (res.who === "O") statusEl.innerHTML = `The computer wins.<span class="verdict-sub">Opening in the centre or a corner is the strongest start.</span>`, bump("lose");
  else statusEl.innerHTML = `Draw.<span class="verdict-sub">${NOTE[level]}</span>`, bump("draw");
  render(res.line || []);
}
const bump = (k) => { tally[k].textContent = Number(tally[k].textContent) + 1; };

function play(i) {
  if (board[i] || locked) return;
  board[i] = "X";
  let res = winner(board);
  if (res) return finish(res);
  locked = true; render();
  // small delay so the computer's move feels intentional
  setTimeout(() => {
    board[chooseMove()] = "O";
    res = winner(board);
    if (res) return finish(res);
    locked = false;
    render();
    statusEl.textContent = "Your move.";
  }, 220);
  render();
}

function newGame() {
  board = Array(9).fill("");
  locked = false;
  statusEl.textContent = "Your move. You are X.";
  render();
}

document.getElementById("t-new").addEventListener("click", newGame);
if (levelEl) levelEl.addEventListener("change", newGame);
newGame();
