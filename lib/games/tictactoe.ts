import type { ChoiceAnswer, JevRequest, JevResponse } from "../jev/types";

// Rules live in code; Jev only picks O's move from the empty squares.

export type Cell = "X" | "O" | null;
export type Board = Cell[]; // 9 cells, row by row

export const HUMAN = "X";
export const JEV = "O";

// Easy = raw Jev reading the grid. Hard = plus threat squares computed by code.
// Impossible = plus code removes every square that loses under perfect play.
export const LEVELS = ["easy", "hard", "impossible"] as const;
export type Level = (typeof LEVELS)[number];

export const SQUARES = [
  "top_left", "top_center", "top_right",
  "middle_left", "center", "middle_right",
  "bottom_left", "bottom_center", "bottom_right",
] as const;

const SQUARE_LABELS = [
  "Row 1, column 1 (top-left corner)", "Row 1, column 2 (top edge)", "Row 1, column 3 (top-right corner)",
  "Row 2, column 1 (left edge)", "Row 2, column 2 (center)", "Row 2, column 3 (right edge)",
  "Row 3, column 1 (bottom-left corner)", "Row 3, column 2 (bottom edge)", "Row 3, column 3 (bottom-right corner)",
];

export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export const emptyBoard = (): Board => Array(9).fill(null);
export const emptySquares = (b: Board) => b.flatMap((c, i) => (c ? [] : [i]));

export type Outcome = { winner: "X" | "O"; line: number[] } | { winner: "draw" } | null;

export function outcome(b: Board): Outcome {
  for (const line of LINES) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { winner: b[a]!, line };
  }
  return emptySquares(b).length ? null : { winner: "draw" };
}

/** Squares where `player` completes three in a row right now. */
export function winningSquares(b: Board, player: "X" | "O"): number[] {
  return emptySquares(b).filter((i) => {
    const next = [...b];
    next[i] = player;
    return outcome(next)?.winner === player;
  });
}

/** Grades Jev's move against the two moves any decent player must see. */
export function reviewMove(before: Board, move: number) {
  const wins = winningSquares(before, JEV);
  const blocks = winningSquares(before, HUMAN);
  if (wins.length) return wins.includes(move) ? { kind: "took-win" as const, squares: wins } : { kind: "missed-win" as const, squares: wins };
  if (blocks.length) return blocks.includes(move) ? { kind: "blocked" as const, squares: blocks } : { kind: "missed-block" as const, squares: blocks };
  return { kind: "free" as const, squares: [] };
}
export type MoveReview = ReturnType<typeof reviewMove>;

const other = (p: "X" | "O") => (p === "X" ? "O" : "X");
const memo = new Map<string, number>();

/** Minimax value for `me` with `turn` to move: 10 - depth for a win, 0 draw, depth - 10 for a loss. */
function value(b: Board, turn: "X" | "O", me: "X" | "O", depth: number): number {
  const o = outcome(b);
  if (o) return o.winner === "draw" ? 0 : o.winner === me ? 10 - depth : depth - 10;
  const key = `${b.map((c) => c ?? ".").join("")}${turn}${me}${depth}`;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;
  const vals = emptySquares(b).map((i) => {
    const next = [...b];
    next[i] = turn;
    return value(next, other(turn), me, depth + 1);
  });
  const v = turn === me ? Math.max(...vals) : Math.min(...vals);
  memo.set(key, v);
  return v;
}

/** Every square that is optimal for `player` under perfect play (faster wins rank higher). */
export function bestMoves(b: Board, player: "X" | "O"): number[] {
  const scored = emptySquares(b).map((i) => {
    const next = [...b];
    next[i] = player;
    return { i, v: value(next, other(player), player, 1) };
  });
  const best = Math.max(...scored.map((s) => s.v));
  return scored.filter((s) => s.v === best).map((s) => s.i);
}

type Validation = { ok: true; board: Board } | { ok: false; error: string };

/** A board is valid for Jev's turn if it's legal, unfinished, and O is to move. */
export function validateBoard(raw: unknown): Validation {
  if (!Array.isArray(raw) || raw.length !== 9 || raw.some((c) => c !== "X" && c !== "O" && c !== null))
    return { ok: false, error: "Board must be 9 cells of \"X\", \"O\" or null." };
  const board = raw as Board;
  const xs = board.filter((c) => c === "X").length;
  const os = board.filter((c) => c === "O").length;
  if (xs - os !== 0 && xs - os !== 1) return { ok: false, error: "It isn't Jev's turn on this board." };
  if (outcome(board)) return { ok: false, error: "This game is already over." };
  return { ok: true, board };
}

const cellText = (c: Cell) => c ?? "empty";

/**
 * easy: raw test of Jev's spatial reading.
 * hard: include threat squares computed by code. Jev is a fast intuitive model and can miss
 * column/diagonal threats when reading the grid; with hints it gets the facts and only has to judge.
 * impossible: hints, and Jev is only offered squares that perfect play allows, so it can't lose.
 */
export function buildMoveRequest(board: Board, { level = "easy" }: { level?: Level } = {}): JevRequest {
  const hints = level !== "easy";
  const open = level === "impossible" ? bestMoves(board, JEV) : emptySquares(board);
  const threats = hints && {
    threats: {
      source: "computed exactly by the game engine",
      [`${JEV}_wins_immediately_at`]: winningSquares(board, JEV).map((i) => SQUARES[i]),
      [`${HUMAN}_wins_next_turn_unless_blocked_at`]: winningSquares(board, HUMAN).map((i) => SQUARES[i]),
    },
  };
  return {
    state: {
      game: "tic-tac-toe on a 3x3 grid; three in a row (row, column or diagonal) wins",
      you_play: JEV,
      opponent_plays: HUMAN,
      board_rows: [0, 3, 6].map((r) => [board[r], board[r + 1], board[r + 2]].map(cellText)),
      squares: Object.fromEntries(SQUARES.map((s, i) => [s, cellText(board[i])])),
      ...threats,
    },
    questions: {
      move: {
        type: "choice",
        instructions: {
          question: `It is ${JEV}'s turn. Which empty square should ${JEV} play to have the best chance of winning?`,
          priorities: [
            `If ${JEV} can complete three in a row now, take that square.`,
            `Otherwise, if ${HUMAN} could complete three in a row on their next move, block that square.`,
            "Otherwise prefer the center, then corners, then edges.",
          ],
          ...(hints && { evidence: "`threats` lists every immediate win and required block. Trust it over your own reading of the grid." }),
        },
        criteria: Object.fromEntries(open.map((i) => [SQUARES[i], SQUARE_LABELS[i]])),
      },
    },
  };
}

export type JevMove = {
  move: number;
  confidence: number;
  /** Probability per cell index; 0 for occupied squares. */
  probabilities: number[];
};

export function readMove(res: JevResponse): JevMove {
  const ans = res.answers.move as ChoiceAnswer;
  const move = SQUARES.indexOf(ans.choice as (typeof SQUARES)[number]);
  if (move < 0) throw new Error(`Jev picked an unknown square "${ans.choice}".`);
  return { move, confidence: ans.confidence, probabilities: SQUARES.map((s) => ans.probabilities[s] ?? 0) };
}
