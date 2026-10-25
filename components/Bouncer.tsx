"use client";

import { useState } from "react";
import { callBouncer, type JevResult } from "@/lib/api";
import { ATTEMPTS, CLUBS, MAX_LINE, type Reaction, reaction } from "@/lib/games/bouncer";
import { useStored } from "@/lib/useStored";
import { Confetti } from "./Confetti";
import { panel, pct } from "./Results";

type Attempt = { line: string; convinced: number; reaction: Reaction; result: JevResult };
type Status = "playing" | "in" | "out";

const NO_RECORD = { best: 0, champion: 0 };

const EXAMPLES = [
  "Evening! I brought you a coffee, you look like you've had a long shift.",
  "I'm on the list. Check under 'Very Important Developer'.",
  "Let me in or I'll explain blockchain to everyone in line.",
];

const THINKING = ["looks you up and down…", "crosses their arms…", "checks the list…", "raises an eyebrow…"];

const TONE: Record<Reaction["verdict"], string> = { in: "text-good", close: "text-gold", no: "text-bad", never: "text-bad" };
const meterTone: Record<Reaction["verdict"], string> = { in: "bg-good", close: "bg-gold", no: "bg-bad", never: "bg-bad" };

export function Bouncer() {
  const [club, setClub] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [status, setStatus] = useState<Status>("playing");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(THINKING[0]);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(0); // remounts the confetti
  const [record, setRecord] = useStored("jev-bouncer", NO_RECORD);

  const c = CLUBS[club];
  const lastClub = club === CLUBS.length - 1;
  const left = ATTEMPTS - attempts.length;
  const last = attempts.at(-1);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy || status !== "playing") return;
    const line = text.trim();
    if (!line) return setError("Say something to the bouncer first.");
    if (attempts.some((a) => a.line.toLowerCase() === line.toLowerCase())) return setError("You already tried that one. They remember.");

    setError(null);
    setBusy(true);
    setThinking(THINKING[(club + attempts.length) % THINKING.length]);
    try {
      const res = await callBouncer({ club, line, earlier: attempts.map((a) => a.line) });
      const r = reaction(res.convinced, c.bar, attempts.length);
      const next = [...attempts, { line, convinced: res.convinced, reaction: r, result: res }];
      setAttempts(next);
      setText("");
      if (r.verdict === "in") {
        setStatus("in");
        setCelebrate((n) => n + 1);
        setRecord((s) => ({ best: Math.max(s.best, club + 1), champion: s.champion + (lastClub ? 1 : 0) }));
      } else if (next.length >= ATTEMPTS) {
        setStatus("out");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The bouncer ignored you. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function goTo(i: number) {
    setClub(i);
    setAttempts([]);
    setStatus("playing");
    setText("");
    setError(null);
  }

  const speech = busy
    ? `${c.bouncer} ${thinking}`
    : last ? `“${last.reaction.line}”`
    : `${c.bouncer} blocks the door. “And who are you?”`;

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_260px]">
      {celebrate > 0 && <Confetti key={celebrate} />}

      <div className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 basis-60 items-center gap-3">
            <span className="text-4xl" aria-hidden="true">{c.emoji}</span>
            <div>
              <p className="text-xs font-bold tracking-wide text-muted uppercase">Club {club + 1} of {CLUBS.length}</p>
              <h2 className="font-display text-2xl">{c.name}</h2>
              <p className="text-sm text-muted">{c.vibe}</p>
            </div>
          </div>
          <div className="ml-auto shrink-0 text-right text-sm">
            <div aria-label={`${left} attempts left`} className="text-lg tracking-wider">
              {Array.from({ length: ATTEMPTS }, (_, i) => (
                <span key={i} className={i < left ? "" : "opacity-25 grayscale"}>🎟️</span>
              ))}
            </div>
            <p className="text-muted">Need <b className="text-ink">{pct(c.bar)}</b> convinced</p>
          </div>
        </div>

        <div
          key={attempts.length}
          className={`mt-5 rounded-2xl bg-surface-2 px-4 py-5 text-center ${last && last.reaction.verdict !== "in" && !busy ? "nope" : ""}`}
          aria-live="polite"
        >
          <p className="text-xs font-bold text-muted">{c.bouncer} says</p>
          <p className={`mt-1 font-display text-xl ${busy || !last ? "" : TONE[last.reaction.verdict]}`}>
            {busy && <span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-accent-soft border-t-accent align-[-2px]" />}
            {speech}
          </p>
          {last && !busy && (
            <div className="mx-auto mt-3 max-w-xs">
              <div className="relative h-2.5 overflow-hidden rounded-full bg-surface">
                <span className={`block h-full rounded-full transition-[width] duration-700 ${meterTone[last.reaction.verdict]}`} style={{ width: pct(last.convinced) }} />
                <span className="absolute top-0 h-full w-0.5 bg-ink" style={{ left: pct(c.bar) }} aria-hidden="true" />
              </div>
              <p className="mt-1 text-xs text-muted">Convinced: <b className="text-ink">{pct(last.convinced)}</b> · bar {pct(c.bar)}</p>
            </div>
          )}
        </div>

        {status === "playing" && (
          <form onSubmit={submit} noValidate className="mt-5">
            <label htmlFor="line" className="mb-1.5 block font-bold">Your line</label>
            <textarea
              id="line"
              rows={2}
              maxLength={MAX_LINE}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
              }}
              placeholder={`Say something to ${c.bouncer}…`}
              autoFocus
              className="w-full resize-y rounded-xl border border-line bg-canvas px-3.5 py-3 focus:border-transparent focus:outline-2 focus:outline-accent"
            />
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>Ctrl + Enter to submit · repeats don&apos;t work, they remember</span>
              <span>{text.length}/{MAX_LINE}</span>
            </div>
            {club === 0 && attempts.length === 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button key={ex} type="button" onClick={() => setText(ex)} className="cursor-pointer rounded-full border border-line bg-surface-2 px-3 py-1 text-left text-sm hover:border-accent">
                    {ex}
                  </button>
                ))}
              </div>
            )}
            <button type="submit" disabled={busy} className="mt-4 cursor-pointer rounded-xl bg-accent px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "Waiting…" : `Try to get in (${left} left)`}
            </button>
            {error && <p role="alert" className="mt-2.5 text-sm text-bad">{error}</p>}
          </form>
        )}

        {status === "in" && (
          <div className="mt-5 text-center">
            <p className="font-display text-2xl text-good">{lastClub ? "You own the night. 👑" : "You're in! 🎉"}</p>
            <p className="mt-1 text-muted">
              {lastClub ? "Every door in town opened for you." : `Next up: ${CLUBS[club + 1].emoji} ${CLUBS[club + 1].name}, where the bar is ${pct(CLUBS[club + 1].bar)}.`}
            </p>
            <button type="button" onClick={() => goTo(lastClub ? 0 : club + 1)} autoFocus className="mt-3 cursor-pointer rounded-xl bg-accent px-5 py-2.5 font-bold text-white">
              {lastClub ? "Play again" : "Head to the next club →"}
            </button>
          </div>
        )}

        {status === "out" && (
          <div className="mt-5 text-center">
            <p className="font-display text-2xl text-bad">Bounced. 🚪</p>
            <p className="mt-1 text-muted">
              {club === 0 ? "Didn't get past the first door." : `You got into ${club} club${club === 1 ? "" : "s"} tonight.`}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => goTo(0)} autoFocus className="cursor-pointer rounded-xl bg-accent px-5 py-2.5 font-bold text-white">
                New night
              </button>
              {club > 0 && (
                <button type="button" onClick={() => goTo(club)} className="cursor-pointer rounded-xl border border-line px-5 py-2.5 font-bold hover:border-accent">
                  Retry {c.name}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div className={panel}>
          <h2 className="font-display text-lg">Tonight&apos;s route</h2>
          <ol className="mt-2 space-y-1.5 text-sm">
            {CLUBS.map((k, i) => (
              <li key={k.name} className={`flex items-center justify-between gap-2 ${i === club ? "font-bold" : "text-muted"}`}>
                <span>{i < club || (i === club && status === "in") ? "✅" : i === club ? "👉" : "🔒"} {k.name}</span>
                <span className="tabular-nums">{pct(k.bar)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 border-t border-line pt-2 text-sm text-muted">
            Best run: <b className="text-ink">{record.best}/{CLUBS.length}</b>
            {record.champion > 0 && <> · Full nights: <b className="text-ink">{record.champion}</b></>}
          </p>
        </div>

        {attempts.length > 0 && (
          <div className={panel}>
            <h2 className="font-display text-lg">Your lines here</h2>
            <ul className="mt-2 space-y-3 text-sm">
              {attempts.map((a, i) => (
                <li key={i}>
                  <p className="break-words">&ldquo;{a.line}&rdquo;</p>
                  <p className={`text-xs font-bold ${TONE[a.reaction.verdict]}`}>{pct(a.convinced)} convinced</p>
                </li>
              ))}
            </ul>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-muted">Show what was sent to Jev</summary>
              <pre className="mt-2 max-h-80 overflow-auto rounded-xl border border-line bg-canvas p-2 text-[11px]">
                {JSON.stringify(last?.result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
