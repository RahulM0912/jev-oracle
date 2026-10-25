"use client";

import { useState } from "react";
import { type JevResult, secretApi } from "@/lib/api";
import {
  type AskResult,
  type Hint,
  type SecretLevel,
  CATEGORIES,
  MAX_QUESTION,
  MAX_QUESTIONS,
  MAX_SECRET,
  PLACEHOLDERS,
  SUGGESTIONS,
  answerLabel,
  hintLabel,
  titleCase,
} from "@/lib/games/secret";
import { useStored } from "@/lib/useStored";
import { Confetti } from "./Confetti";
import { panel, pct } from "./Results";

type Mode = "solo" | "party";
type Phase = "setup" | "handover" | "play" | "over";
type Entry =
  | { kind: "ask"; text: string; result: AskResult; jev: JevResult }
  | { kind: "guess"; text: string; correct: boolean; jev?: Partial<JevResult> };
type End = { won: boolean; secret: string; reason: "solved" | "guessed" | "out" | "gave-up" };

// Module constants: useStored needs stable defaults.
const NO_STATS = { played: 0, won: 0, best: 0 };
const NO_RECENT: string[] = [];

const HINTS: Hint[] = ["anything", ...(Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[])];
const hintEmoji = (h: Hint) => (h === "anything" ? "✨" : CATEGORIES[h].emoji);
const SHOWN_SUGGESTIONS = 4;
const TONE = { good: "bg-good/15 text-good", bad: "bg-bad/15 text-bad", gold: "bg-gold/15 text-gold" };

/** Asks and guesses both use up a question; "not a yes/no question" doesn't. */
const counts = (e: Entry) => e.kind === "guess" || e.result.kind !== "not-yes-no";

export function SecretGame() {
  const [mode, setMode] = useState<Mode>("solo");
  const [phase, setPhase] = useState<Phase>("setup");
  const [hint, setHint] = useState<Hint>("anything");
  const [level, setLevel] = useState<SecretLevel | "any">("any");
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [game, setGame] = useState<{ token: string; category: Hint } | null>(null);
  const [log, setLog] = useState<Entry[]>([]);
  const [end, setEnd] = useState<End | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useStored("jev-secret-stats", NO_STATS);
  const [recent, setRecent] = useStored("jev-secret-recent", NO_RECENT);

  const used = log.filter(counts).length;
  const left = MAX_QUESTIONS - used;
  const last = log.at(-1);
  const asked = new Set(log.map((e) => e.text.toLowerCase()));
  const suggestions = game ? SUGGESTIONS[game.category].filter((s) => !asked.has(s.toLowerCase())).slice(0, SHOWN_SUGGESTIONS) : [];

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Jev lost track of the game. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const start = () =>
    run(async () => {
      if (mode === "party") {
        const secret = custom.trim();
        if (!secret) throw new Error("Type a secret first.");
        setGame(await secretApi.start({ custom: secret, category: hint }));
        setCustom(""); // gone from the page before the device is handed over
        setShowCustom(false);
        setPhase("handover");
      } else {
        setGame(await secretApi.start({ category: hint, level: level === "any" ? undefined : level, recent }));
        setPhase("play");
      }
      setLog([]);
      setEnd(null);
      setText("");
    });

  function finish(token: string, next: Entry[], result: Omit<End, "secret">, secret?: string) {
    return (secret ? Promise.resolve({ secret }) : secretApi.reveal(token)).then(({ secret: s }) => {
      setEnd({ ...result, secret: s });
      setPhase("over");
      if (mode === "solo") {
        const n = next.filter(counts).length;
        setStats((st) => ({
          played: st.played + 1,
          won: st.won + (result.won ? 1 : 0),
          best: result.won && (!st.best || n < st.best) ? n : st.best,
        }));
        setRecent((r) => [...r.filter((x) => x !== s), s].slice(-50));
      }
    });
  }

  const ask = (question: string) =>
    run(async () => {
      if (!game) return;
      const q = question.trim();
      if (!q) throw new Error("Type a question first.");
      const res = await secretApi.ask(game.token, q);
      const next = [...log, { kind: "ask" as const, text: q, result: res.result, jev: res }];
      setLog(next);
      setText("");
      if (res.result.kind === "solved") await finish(game.token, next, { won: true, reason: "solved" }, res.secret);
      else if (next.filter(counts).length >= MAX_QUESTIONS) await finish(game.token, next, { won: false, reason: "out" });
    });

  const guess = () =>
    run(async () => {
      if (!game) return;
      const g = text.trim();
      if (!g) throw new Error("Type your guess in the box first.");
      const res = await secretApi.guess(game.token, g);
      const next = [...log, { kind: "guess" as const, text: g, correct: res.correct, jev: res }];
      setLog(next);
      setText("");
      if (res.correct) await finish(game.token, next, { won: true, reason: "guessed" }, res.secret);
      else if (next.filter(counts).length >= MAX_QUESTIONS) await finish(game.token, next, { won: false, reason: "out" });
    });

  const giveUp = () => run(async () => void (game && (await finish(game.token, log, { won: false, reason: "gave-up" }))));

  function playAgain() {
    setPhase("setup");
    setGame(null);
    setLog([]);
    setEnd(null);
    setError(null);
    if (mode === "solo") start();
  }

  const segment = (active: boolean) =>
    `flex-1 cursor-pointer rounded-lg px-3 py-1.5 font-bold ${active ? "bg-accent text-white" : "text-muted hover:text-ink"}`;
  const chip = (active: boolean) =>
    `cursor-pointer rounded-full border px-3 py-1 text-sm ${active ? "border-accent bg-accent-soft font-bold text-accent" : "border-line bg-surface-2 hover:border-accent"}`;
  const primary = "cursor-pointer rounded-xl bg-accent px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50";
  const errorLine = error && <p role="alert" className="mt-2.5 text-sm text-bad">{error}</p>;

  const side = (
    <div className="flex flex-col gap-5">
      <div className={panel}>
        <h2 className="font-display text-lg">How to play</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Ask yes/no questions. Jev answers about the secret.</li>
          <li>{MAX_QUESTIONS} questions in total. Guesses count too.</li>
          <li>&ldquo;Sort of&rdquo; means Jev is torn. Try asking another way.</li>
          <li>Party mode: one person types the secret, everyone else guesses.</li>
        </ul>
      </div>
      <div className={panel}>
        <h2 className="font-display text-lg">Your solo record</h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          {([["Played", stats.played], ["Won", stats.won], ["Best", stats.best || "–"]] as const).map(([label, n]) => (
            <div key={label} className="rounded-xl bg-surface-2 py-2">
              <div className="font-display text-2xl">{n}</div>
              <div className="text-xs text-muted">{label}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Best = fewest questions to solve one.</p>
      </div>
    </div>
  );

  if (phase === "setup")
    return (
      <div className="grid gap-5 md:grid-cols-[1fr_260px]">
        <div className={panel}>
          <div role="radiogroup" aria-label="Mode" className="flex rounded-xl border border-line p-1 text-sm">
            {(["solo", "party"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={segment(mode === m)}>
                {m === "solo" ? "🤫 Solo: Jev picks" : "🎉 Party: a friend picks"}
              </button>
            ))}
          </div>

          {mode === "party" && (
            <div className="mt-5">
              <label htmlFor="secret" className="mb-1.5 block font-bold">Player 1, type the secret. Everyone else, look away! 🙈</label>
              <div className="flex gap-2">
                <input
                  id="secret"
                  value={custom}
                  maxLength={MAX_SECRET}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && start()}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="e.g. a rubber duck"
                  className={`min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3.5 py-3 focus:border-transparent focus:outline-2 focus:outline-accent ${showCustom ? "" : "[-webkit-text-security:disc]"}`}
                />
                <button type="button" onClick={() => setShowCustom((s) => !s)} aria-pressed={showCustom} className="cursor-pointer rounded-xl border border-line px-3 text-sm hover:border-accent">
                  {showCustom ? "Hide" : "Show"}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted">Pick something most people know. Jev answers from common knowledge.</p>
            </div>
          )}

          <p className="mt-5 mb-2 font-bold">{mode === "party" ? "Tell the guessers it's in:" : "Category"}</p>
          <div className="flex flex-wrap gap-2">
            {HINTS.map((h) => (
              <button key={h} type="button" aria-pressed={hint === h} onClick={() => setHint(h)} className={chip(hint === h)}>
                {hintEmoji(h)} {hintLabel(h)}
              </button>
            ))}
          </div>

          {mode === "solo" && (
            <>
              <p className="mt-5 mb-2 font-bold">Difficulty</p>
              <div role="radiogroup" aria-label="Difficulty" className="flex max-w-sm rounded-xl border border-line p-1 text-sm">
                {(["any", "easy", "hard"] as const).map((l) => (
                  <button key={l} type="button" role="radio" aria-checked={level === l} onClick={() => setLevel(l)} className={segment(level === l)}>
                    {l === "any" ? "Mixed" : titleCase(l)}
                  </button>
                ))}
              </div>
            </>
          )}

          <button type="button" onClick={start} disabled={busy} className={`mt-6 ${primary}`}>
            {busy ? "Thinking of something…" : mode === "party" ? "Lock in the secret 🔒" : "Start game"}
          </button>
          {errorLine}
        </div>
        {side}
      </div>
    );

  if (phase === "handover")
    return (
      <div className={`${panel} mx-auto max-w-md py-10 text-center`}>
        <div className="text-5xl" aria-hidden="true">🔒</div>
        <h2 className="mt-3 font-display text-2xl">Secret locked.</h2>
        <p className="mt-1 text-muted">Hand the device to the guessers. Hint: <b className="text-ink">{hintEmoji(hint)} {hintLabel(hint)}</b></p>
        <button type="button" onClick={() => setPhase("play")} autoFocus className={`mt-5 ${primary}`}>
          We&apos;re ready, start asking
        </button>
      </div>
    );

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_260px]">
      {end?.won && <Confetti />}
      <div className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-muted uppercase">{mode === "party" ? "Party game" : "Jev is thinking of…"}</p>
            <h2 className="font-display text-2xl">{game && `${hintEmoji(game.category)} ${game.category === "anything" ? "Something" : hintLabel(game.category)}`}</h2>
          </div>
          <div className="text-right">
            <div className={`font-display text-4xl leading-none tabular-nums ${left <= 3 ? "text-bad" : ""}`}>{left}</div>
            <div className="text-xs text-muted">questions left</div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <span className="block h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: pct(used / MAX_QUESTIONS) }} />
        </div>

        {phase === "over" && end ? (
          <div className="mt-6 rounded-2xl bg-surface-2 px-4 py-6 text-center" aria-live="polite">
            <p className="text-xs font-bold text-muted">{end.won ? "You got it!" : end.reason === "out" ? "Out of questions." : "You gave up."} It was…</p>
            <p className={`pop mt-1 font-display text-3xl ${end.won ? "text-good" : "text-ink"}`}>{titleCase(end.secret)}</p>
            <p className="mt-1 text-sm text-muted">
              {end.won ? `Solved in ${used} question${used === 1 ? "" : "s"}. ${used <= 8 ? "Brilliant!" : used <= 15 ? "Nicely done." : "Just in time!"}` : "Better luck next round."}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={playAgain} autoFocus className="cursor-pointer rounded-xl bg-accent px-5 py-2.5 font-bold text-white">
                {mode === "party" ? "New secret" : "Play again"}
              </button>
              <button type="button" onClick={() => { setPhase("setup"); setGame(null); }} className="cursor-pointer rounded-xl border border-line px-5 py-2.5 font-bold hover:border-accent">
                Change settings
              </button>
            </div>
          </div>
        ) : (
          <form
            className="mt-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              ask(text);
            }}
          >
            <label htmlFor="q" className="mb-1.5 block font-bold">Ask a yes/no question, or type a guess</label>
            <input
              id="q"
              value={text}
              maxLength={MAX_QUESTION}
              onChange={(e) => setText(e.target.value)}
              autoComplete="off"
              autoFocus
              placeholder={PLACEHOLDERS[game?.category ?? "anything"]}
              className="w-full rounded-xl border border-line bg-canvas px-3.5 py-3 focus:border-transparent focus:outline-2 focus:outline-accent"
            />
            {suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted">Try:</span>
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => ask(s)} disabled={busy} className="cursor-pointer rounded-full border border-line bg-surface-2 px-3 py-1 text-sm hover:border-accent">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="submit" disabled={busy} className={primary}>{busy ? "Jev is thinking…" : "Ask"}</button>
              <button type="button" onClick={guess} disabled={busy} className="cursor-pointer rounded-xl border-2 border-accent px-5 py-2.5 font-bold text-accent disabled:cursor-not-allowed disabled:opacity-50">
                Guess it
              </button>
              <button type="button" onClick={giveUp} disabled={busy} className="ml-auto cursor-pointer text-sm text-muted underline-offset-2 hover:text-ink hover:underline">
                Give up
              </button>
            </div>
            {errorLine}
          </form>
        )}

        {log.length > 0 && (
          <ol className="mt-6 space-y-2" aria-label="Questions so far">
            {log.map((e, i) => {
              const n = log.slice(0, i + 1).filter(counts).length;
              const badge =
                e.kind === "guess" ? (e.correct ? { text: "Correct!", tone: "good" as const } : { text: "Not it", tone: "bad" as const })
                : e.result.kind === "answer" ? answerLabel(e.result.p)
                : e.result.kind === "solved" ? { text: "Yes! That's it", tone: "good" as const }
                : null;
              return (
                <li key={i} className="flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-2">
                  <span className="min-w-0 break-words">
                    <span className="mr-1.5 text-xs text-muted tabular-nums">{counts(e) ? `${n}.` : "–"}</span>
                    {e.kind === "guess" && <b>Guess: </b>}
                    {e.text}
                    {e.kind === "ask" && e.result.kind === "not-yes-no" && (
                      <span className="block text-xs text-muted">Not a yes/no question, so it didn&apos;t count. Try rephrasing.</span>
                    )}
                  </span>
                  {badge && (
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE[badge.tone]}`}>
                      {badge.text}
                      {e.kind === "ask" && e.result.kind === "answer" && <span className="ml-1 font-normal opacity-80">{pct(e.result.p)}</span>}
                    </span>
                  )}
                </li>
              );
            }).reverse()}
          </ol>
        )}

        {last?.jev?.request && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted">Show what was sent to Jev last (secret hidden)</summary>
            <pre className="mt-2 max-h-80 overflow-auto rounded-xl border border-line bg-canvas p-3 text-xs">
              {JSON.stringify({ request: last.jev.request, response: last.jev.response }, null, 2)}
            </pre>
          </details>
        )}
      </div>
      {side}
    </div>
  );
}
