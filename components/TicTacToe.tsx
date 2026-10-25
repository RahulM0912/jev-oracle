"use client";

import { useRef, useState } from "react";
import { callTicTacToe, type JevResult } from "@/lib/api";
import {
  type Board,
  type JevMove,
  type Level,
  type MoveReview,
  HUMAN,
  JEV,
  LEVELS,
  SQUARES,
  emptyBoard,
  outcome,
  reviewMove,
} from "@/lib/games/tictactoe";
import { useStored } from "@/lib/useStored";
import { Confetti } from "./Confetti";
import { panel, pct } from "./Results";

type LastMove = JevMove & JevResult & { id: number; before: Board; review: MoveReview; level: Level };
type Stat = { winChances: number; winsTaken: number; blockChances: number; blocksMade: number };
type Stats = Record<Level, Stat>;
type First = "you" | "jev";

const emptyStat: Stat = { winChances: 0, winsTaken: 0, blockChances: 0, blocksMade: 0 };
// Module constants: useStored needs stable defaults.
const NO_SCORE = { you: 0, jev: 0, draw: 0 };
const NO_STATS: Stats = { easy: emptyStat, hard: emptyStat, impossible: emptyStat };
const LAB_OFF = false;

const LEVEL_TEXT: Record<Level, { label: string; blurb: string }> = {
  easy: { label: "Easy", blurb: "Raw Jev: it has to spot wins and blocks on its own, and often misses columns and diagonals." },
  hard: { label: "Hard", blurb: "Code tells Jev where anyone can win next. It rarely slips, but a fork can still beat it." },
  impossible: { label: "Impossible", blurb: "Code also hides every losing square from Jev. A draw is the best you can do." },
};

const THINKING = ["Jev is thinking…", "Jev is studying the diagonals…", "Jev is counting corners…", "Jev is plotting…"];

const squareName = (i: number) => SQUARES[i].replace("_", " ");
const names = (squares: number[]) => squares.map(squareName).join(" or ");

const REVIEW_TEXT: Record<MoveReview["kind"], { icon: string; title: string; tone: string }> = {
  "took-win": { icon: "🏆", title: "Took the winning square", tone: "text-good" },
  blocked: { icon: "🛡️", title: "Blocked your winning move", tone: "text-good" },
  "missed-win": { icon: "😬", title: "Missed its own win", tone: "text-bad" },
  "missed-block": { icon: "⚠️", title: "Missed your threat", tone: "text-bad" },
  free: { icon: "🤔", title: "No forced move, free choice", tone: "text-muted" },
};

export function TicTacToe() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  // Chosen settings; a change mid-game waits for the next game.
  const [first, setFirst] = useState<First>("you");
  const [level, setLevel] = useState<Level>("hard");
  const [gameFirst, setGameFirst] = useState<First>("you");
  const [gameLevel, setGameLevel] = useState<Level>("hard");
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(THINKING[0]);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<LastMove | null>(null);
  const [wins, setWins] = useState(0); // remounts the confetti
  const [score, setScore] = useStored("jev-ttt-score", NO_SCORE);
  const [stats, setStats] = useStored("jev-ttt-stats", NO_STATS);
  const [lab, setLab] = useStored("jev-lab", LAB_OFF);
  const game = useRef(0); // ignores replies that arrive after "New game"
  const moveCount = useRef(0);

  const result = outcome(board);
  const midGame = board.some(Boolean) && !result;
  const pending = midGame && (level !== gameLevel || first !== gameFirst);
  // Play again alternates who starts, unless the player picked a side for the next game.
  const nextFirst: First = first !== gameFirst ? first : first === "you" ? "jev" : "you";

  function finish(b: Board) {
    const o = outcome(b);
    if (!o) return false;
    const key = o.winner === HUMAN ? "you" : o.winner === JEV ? "jev" : "draw";
    setScore((s) => ({ ...s, [key]: s[key] + 1 }));
    if (key === "you") setWins((n) => n + 1);
    return true;
  }

  async function jevTurn(before: Board, lvl: Level) {
    const id = game.current;
    setBusy(true);
    setThinking(THINKING[moveCount.current % THINKING.length]);
    setError(null);
    try {
      const res = await callTicTacToe(before, lvl);
      if (id !== game.current) return;
      const next = [...before];
      next[res.move] = JEV;
      const review = reviewMove(before, res.move);
      setBoard(next);
      setLast({ ...res, id: ++moveCount.current, before, review, level: lvl });
      const k = review.kind;
      setStats((s) => ({
        ...s,
        [lvl]: {
          winChances: s[lvl].winChances + (k === "took-win" || k === "missed-win" ? 1 : 0),
          winsTaken: s[lvl].winsTaken + (k === "took-win" ? 1 : 0),
          blockChances: s[lvl].blockChances + (k === "blocked" || k === "missed-block" ? 1 : 0),
          blocksMade: s[lvl].blocksMade + (k === "blocked" ? 1 : 0),
        },
      }));
      finish(next);
    } catch (e) {
      if (id === game.current) setError(e instanceof Error ? e.message : "Jev couldn't move.");
    } finally {
      if (id === game.current) setBusy(false);
    }
  }

  function play(i: number) {
    if (busy || result || board[i] || error) return;
    const next = [...board];
    next[i] = HUMAN;
    setBoard(next);
    if (!finish(next)) jevTurn(next, gameLevel);
  }

  function newGame(who: First = first, lvl: Level = level) {
    game.current++;
    setFirst(who);
    setGameFirst(who);
    setLevel(lvl);
    setGameLevel(lvl);
    setBoard(emptyBoard());
    setLast(null);
    setError(null);
    setBusy(false);
    if (who === "jev") jevTurn(emptyBoard(), lvl);
  }

  // Changing a setting restarts only when no game is in progress.
  function chooseFirst(who: First) {
    if (midGame) setFirst(who);
    else newGame(who);
  }
  function chooseLevel(lvl: Level) {
    if (midGame) setLevel(lvl);
    else newGame(first, lvl);
  }

  const segment = (active: boolean) =>
    `cursor-pointer rounded-lg px-3 py-1.5 font-bold ${active ? "bg-accent text-white" : "text-muted hover:text-ink"}`;

  const status = result
    ? result.winner === "draw" ? "It's a draw." : result.winner === HUMAN ? "You win! 🎉" : "Jev wins."
    : busy ? thinking : error ? "Jev got stuck." : "Your turn. You're X.";

  const playPanel = (
    <div className={panel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div role="radiogroup" aria-label="Who goes first" className="inline-flex rounded-xl border border-line p-1 text-sm">
          {(["you", "jev"] as const).map((w) => (
            <button key={w} type="button" role="radio" aria-checked={first === w} onClick={() => chooseFirst(w)} className={segment(first === w)}>
              {w === "you" ? "You first" : "Jev first"}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => newGame()} className="cursor-pointer rounded-xl border border-line px-3 py-1.5 text-sm font-bold hover:border-accent">
          New game
        </button>
      </div>

      <div className="mb-4 rounded-xl bg-surface-2 p-3 text-sm">
        <div role="radiogroup" aria-label="Difficulty" className="flex rounded-xl border border-line bg-surface p-1">
          {LEVELS.map((l) => (
            <button key={l} type="button" role="radio" aria-checked={level === l} onClick={() => chooseLevel(l)} className={`flex-1 ${segment(level === l)}`}>
              {LEVEL_TEXT[l].label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-muted">{LEVEL_TEXT[level].blurb}</p>
        {pending && <p className="mt-1 font-bold text-accent">New settings start next game. This one stays as it is.</p>}
      </div>

      <div className="mx-auto grid w-full max-w-[300px] grid-cols-3 gap-2" role="grid" aria-label="Tic-tac-toe board">
        {board.map((cell, i) => {
          const winning = result && "line" in result && result.line.includes(i);
          const isLast = last?.move === i && board[i] === JEV;
          return (
            <button
              key={i}
              type="button"
              onClick={() => play(i)}
              disabled={!!cell || busy || !!result || !!error}
              aria-label={`${squareName(i)}: ${cell ?? "empty"}`}
              className={`grid aspect-square place-items-center rounded-xl border font-display text-5xl leading-none font-bold transition
                ${winning ? "border-gold bg-gold/20" : "border-line bg-canvas"}
                ${cell === JEV ? "text-accent" : "text-ink"}
                ${isLast && !winning ? "ring-2 ring-accent/50" : ""}
                ${!cell && !busy && !result && !error ? "cursor-pointer hover:border-accent hover:bg-accent-soft" : "cursor-default"}`}
            >
              {cell && <span className="pop">{cell}</span>}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center font-bold" aria-live="polite">
        {busy && <span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-accent-soft border-t-accent align-[-2px]" />}
        {status}
      </p>
      {error && (
        <div className="mt-2 text-center">
          <p role="alert" className="text-sm text-bad">{error}</p>
          <button type="button" onClick={() => jevTurn(board, gameLevel)} className="mt-2 cursor-pointer rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white">
            Retry Jev&apos;s move
          </button>
        </div>
      )}
      {result && (
        <div className="mt-3 text-center">
          <button type="button" onClick={() => newGame(nextFirst)} className="cursor-pointer rounded-xl bg-accent px-5 py-2.5 font-bold text-white">
            Play again
          </button>
          <p className="mt-1.5 text-xs text-muted">{nextFirst === "you" ? "You go" : "Jev goes"} first next.</p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        {([["You", score.you], ["Jev", score.jev], ["Draws", score.draw]] as const).map(([label, n]) => (
          <div key={label} className="rounded-xl bg-surface-2 py-2">
            <div className="font-display text-2xl">{n}</div>
            <div className="text-xs text-muted">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-muted">
          <input type="checkbox" checked={lab} onChange={(e) => setLab(e.target.checked)} className="size-4 accent-[var(--accent)]" />
          Show Jev&apos;s thinking
        </label>
        <button
          type="button"
          onClick={() => {
            setScore(NO_SCORE);
            setStats(NO_STATS);
          }}
          className="cursor-pointer text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Reset stats
        </button>
      </div>
    </div>
  );

  return (
    <>
      {wins > 0 && <Confetti key={wins} />}
      {lab ? (
        <div className="grid gap-5 md:grid-cols-[minmax(0,340px)_1fr]">
          {playPanel}
          <div className="flex flex-col gap-5">
            <ReportCard stats={stats} />
            {last ? <LastMovePanel key={last.id} last={last} /> : (
              <div className={`${panel} text-muted`}>
                Jev&apos;s thinking shows up here after its first move: how likely it rated each square, and whether it spotted wins and blocks.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-[380px]">{playPanel}</div>
      )}
    </>
  );
}

function ReportCard({ stats }: { stats: Stats }) {
  const cell = (key: Level, hit: number, total: number) => (
    <td key={key} className="py-2 text-right tabular-nums">
      {total === 0 ? (
        <span className="text-muted">–</span>
      ) : (
        <>
          <b>{hit}</b>/{total}
          <span className={`ml-1.5 hidden text-sm sm:inline ${hit === total ? "text-good" : "text-bad"}`}>{pct(hit / total)}</span>
        </>
      )}
    </td>
  );
  return (
    <div className={panel}>
      <h2 className="font-display text-xl">Jev&apos;s report card</h2>
      <p className="mb-2 text-sm text-muted">Checked by code after every Jev move, across all your games.</p>
      <table className="w-full">
        <thead>
          <tr className="text-xs text-muted">
            <th className="pb-1 text-left font-normal" />
            {LEVELS.map((l) => (
              <th key={l} className="pb-1 text-right font-normal">{LEVEL_TEXT[l].label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-line">
            <td className="py-2">Winning moves taken</td>
            {LEVELS.map((l) => cell(l, stats[l].winsTaken, stats[l].winChances))}
          </tr>
          <tr className="border-t border-line">
            <td className="py-2">Your threats blocked</td>
            {LEVELS.map((l) => cell(l, stats[l].blocksMade, stats[l].blockChances))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function LastMovePanel({ last }: { last: LastMove }) {
  const r = REVIEW_TEXT[last.review.kind];
  const [checks, setChecks] = useState<number[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  async function consistency() {
    setChecking(true);
    setCheckError(null);
    try {
      const runs = await Promise.all(Array.from({ length: 5 }, () => callTicTacToe(last.before, last.level)));
      setChecks(runs.map((x) => x.move));
    } catch (e) {
      setCheckError(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setChecking(false);
    }
  }

  const counts = checks ? Object.entries(checks.reduce<Record<number, number>>((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]) : [];
  const detail =
    last.review.kind === "missed-win" ? `It could have won at ${names(last.review.squares)}.`
    : last.review.kind === "missed-block" ? `You could win next at ${names(last.review.squares)}.`
    : last.review.kind === "free" ? "Nobody could win on this move, so any square was fair."
    : "";

  return (
    <div className={panel}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl">Jev&apos;s last move</h2>
        <span className="flex gap-1.5">
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-muted">{LEVEL_TEXT[last.level].label}</span>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">confidence {pct(last.confidence)}</span>
        </span>
      </div>
      <p className={`mt-1 font-bold ${r.tone}`}>{r.icon} {r.title}</p>
      {detail && <p className="text-sm text-muted">{detail}</p>}

      <p className="mt-4 mb-2 text-sm text-muted">
        How likely Jev rated each {last.level === "impossible" ? "safe" : "open"} square (board before its move):
      </p>
      <div className="grid max-w-[240px] grid-cols-3 gap-1.5">
        {last.before.map((cell, i) => {
          const p = last.probabilities[i];
          const chosen = i === last.move;
          return (
            <div
              key={i}
              className={`grid aspect-square place-items-center rounded-lg border-2 text-sm leading-none tabular-nums ${chosen ? "border-accent font-bold" : "border-line"}`}
              style={cell ? undefined : { backgroundColor: `color-mix(in srgb, var(--accent) ${Math.round(p * 70)}%, transparent)` }}
              aria-label={cell ? `${squareName(i)}: ${cell}` : `${squareName(i)}: ${pct(p)}${chosen ? ", chosen" : ""}`}
            >
              {cell ? <span className="font-display text-xl text-muted">{cell}</span> : <span className={p > 0.45 ? "text-white" : ""}>{pct(p)}</span>}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={consistency}
        disabled={checking}
        className="mt-4 cursor-pointer rounded-xl border border-line px-4 py-2 text-sm font-bold hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {checking ? "Asking 5 times…" : "Ask Jev 5× about this position"}
      </button>
      {checkError && <p className="mt-2 text-sm text-bad">{checkError}</p>}
      {checks && (
        <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
          <b>Consistency:</b>{" "}
          {counts.map(([sq, n]) => `${squareName(+sq)} ×${n}`).join(", ")}{" "}
          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${counts.length === 1 ? "bg-good/15 text-good" : "bg-bad/15 text-bad"}`}>
            {counts.length === 1 ? "Same move every time" : "Changes its mind"}
          </span>
        </div>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-muted">Show what was sent to Jev and what came back</summary>
        <pre className="mt-2 overflow-x-auto rounded-xl border border-line bg-canvas p-3 text-xs">
          {JSON.stringify({ request: last.request, response: last.response }, null, 2)}
        </pre>
      </details>
    </div>
  );
}
