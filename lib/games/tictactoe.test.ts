import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/tictactoe/route";
import type { JevResponse } from "../jev/types";
import { type Board, bestMoves, buildMoveRequest, emptyBoard, outcome, readMove, reviewMove, validateBoard, winningSquares } from "./tictactoe";

const b = (s: string): Board => [...s].map((c) => (c === "X" || c === "O" ? c : null));

describe("rules", () => {
  it("detects wins, draws and ongoing games", () => {
    expect(outcome(b("XXX.OO..."))).toEqual({ winner: "X", line: [0, 1, 2] });
    expect(outcome(b("O.XO.XO.."))).toEqual({ winner: "O", line: [0, 3, 6] });
    expect(outcome(b("XOXXOOOXX"))).toEqual({ winner: "draw" });
    expect(outcome(b("X...O...."))).toBeNull();
  });

  it("finds winning squares", () => {
    expect(winningSquares(b("XX..O...."), "X")).toEqual([2]);
    expect(winningSquares(b("X...X...."), "X")).toEqual([8]);
    expect(winningSquares(emptyBoard(), "O")).toEqual([]);
  });

  it("reviews Jev's move: win beats block", () => {
    const before = b("XX.OO.X..");
    expect(reviewMove(before, 5).kind).toBe("took-win");
    expect(reviewMove(before, 2)).toEqual({ kind: "missed-win", squares: [5] });
    expect(reviewMove(b("XX..O...."), 2).kind).toBe("blocked");
    expect(reviewMove(b("XX..O...."), 8)).toEqual({ kind: "missed-block", squares: [2] });
    expect(reviewMove(b("X........"), 4).kind).toBe("free");
  });
});

describe("validateBoard", () => {
  it("accepts O-to-move positions (you first or Jev first)", () => {
    expect(validateBoard(b("X........")).ok).toBe(true);
    expect(validateBoard(emptyBoard()).ok).toBe(true);
  });
  it("rejects malformed, wrong-turn and finished boards", () => {
    expect(validateBoard("nope").ok).toBe(false);
    expect(validateBoard(["X"]).ok).toBe(false);
    expect(validateBoard(b("XX.......")).ok).toBe(false);
    expect(validateBoard(b("O........")).ok).toBe(false);
    expect(validateBoard(b("XXXOO....")).ok).toBe(false);
  });
});

describe("Jev request/response", () => {
  it("offers only empty squares and maps the answer back", () => {
    const req = buildMoveRequest(b("X...O...."));
    const q = req.questions.move;
    expect(q.type === "choice" && Object.keys(q.criteria)).toEqual([
      "top_center", "top_right", "middle_left", "middle_right", "bottom_left", "bottom_center", "bottom_right",
    ]);
    const res: JevResponse = {
      model: "t",
      answers: { move: { type: "choice", choice: "bottom_right", confidence: 0.7, probabilities: { bottom_right: 0.8, top_right: 0.2 } } },
    };
    expect(readMove(res)).toEqual({ move: 8, confidence: 0.7, probabilities: [0, 0, 0.2, 0, 0, 0, 0, 0, 0.8] });
  });
});

describe("threat hints", () => {
  it("are absent by default", () => {
    const req = buildMoveRequest(b("X...O.X.O"));
    expect(req.state).not.toHaveProperty("threats");
  });

  it("list the required block (the column Jev missed live)", () => {
    const req = buildMoveRequest(b("X...O.X.O"), { level: "hard" });
    expect(req.state).toMatchObject({
      threats: { O_wins_immediately_at: [], X_wins_next_turn_unless_blocked_at: ["middle_left"] },
    });
    const q = req.questions.move;
    expect(q.type === "choice" && q.instructions).toHaveProperty("evidence");
  });
});

describe("impossible level", () => {
  it("bestMoves takes wins, blocks and defends the opposite-corner fork", () => {
    expect(bestMoves(b("XX.OO.X.."), "O")).toEqual([5]);
    expect(bestMoves(b("XX..O...."), "O")).toEqual([2]);
    // X in opposite corners: a corner reply loses to a fork, so only edges are safe.
    expect(bestMoves(b("X...O...X"), "O")).toEqual([1, 3, 5, 7]);
  });

  it("offers Jev only the safe squares", () => {
    const q = buildMoveRequest(b("X...O...X"), { level: "impossible" }).questions.move;
    expect(q.type === "choice" && Object.keys(q.criteria)).toEqual(["top_center", "middle_left", "middle_right", "bottom_center"]);
  });

  it("never loses, whatever X plays and whichever safe square Jev picks", () => {
    let games = 0;
    const explore = (board: Board, turn: "X" | "O") => {
      const o = outcome(board);
      if (o) {
        games++;
        expect(o.winner).not.toBe("X");
        return;
      }
      const moves = turn === "O" ? bestMoves(board, "O") : board.flatMap((c, i) => (c ? [] : [i]));
      for (const i of moves) {
        const next = [...board];
        next[i] = turn;
        explore(next, turn === "X" ? "O" : "X");
      }
    };
    explore(emptyBoard(), "X");
    explore(emptyBoard(), "O");
    expect(games).toBeGreaterThan(100);
  });
});

describe("POST /api/tictactoe", () => {
  afterEach(() => vi.unstubAllEnvs());
  const post = (body: unknown) => POST(new Request("http://x/api/tictactoe", { method: "POST", body: JSON.stringify(body) }));

  it("rejects invalid boards and levels", async () => {
    expect((await post({ board: b("XX.......") })).status).toBe(400);
    expect((await post({ board: emptyBoard(), level: "nightmare" })).status).toBe(400);
  });

  it("mock takes the block on hard, like a real model with hints", async () => {
    vi.stubEnv("JEV_PROVIDER", "mock");
    const board = b("XX..O....");
    for (let i = 0; i < 5; i++) expect((await (await post({ board, level: "hard" })).json()).move).toBe(2);
  });

  it("returns a legal move from the mock provider", async () => {
    vi.stubEnv("JEV_PROVIDER", "mock");
    const board = b("X...O...X");
    const json = await (await post({ board, level: "hard" })).json();
    expect(board[json.move]).toBeNull();
    expect(json.probabilities).toHaveLength(9);
    expect(json.request.state.threats).toBeDefined();
  });
});
