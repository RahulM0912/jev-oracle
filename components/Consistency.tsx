"use client";

import { useState } from "react";
import { callJev } from "@/lib/api";
import { getMode, type ModeId, type ModeInput } from "@/lib/modes";
import { pct } from "./Results";

const RUNS = 5;
const STABLE_SPREAD = 0.15;

/** Sends the same request 5 times and shows how much the headline number moves. */
export function Consistency({ mode, input }: { mode: ModeId; input: ModeInput }) {
  const [values, setValues] = useState<number[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const def = getMode(mode)!;

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const results = await Promise.all(Array.from({ length: RUNS }, () => callJev(mode, input)));
      setValues(results.map((r) => def.headline(r.response)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setBusy(false);
    }
  }

  const spread = values ? Math.max(...values) - Math.min(...values) : 0;
  const stable = spread <= STABLE_SPREAD;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="cursor-pointer rounded-xl border border-line px-5 py-3 font-bold hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? `Asking ${RUNS} times…` : `Check consistency (ask ${RUNS}×)`}
      </button>
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
      {values && (
        <div className="mt-3 rounded-xl bg-surface-2 p-3.5 text-[15px]">
          <b>Consistency check</b> · {def.headlineLabel} across {RUNS} identical requests
          <div className="my-2 flex flex-wrap gap-1.5">
            {values.map((v, i) => (
              <span key={i} className="rounded-lg border border-line bg-surface px-2 py-0.5 tabular-nums">{pct(v)}</span>
            ))}
          </div>
          Spread: <b>{pct(spread)}</b>{" "}
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${stable ? "bg-good/15 text-good" : "bg-bad/15 text-bad"}`}>
            {stable ? "Stable" : "Wobbly"}
          </span>
          <p className="mt-1.5 text-sm text-muted">
            {stable
              ? "Same question, near-same answer. Safe to rely on for this kind of decision."
              : "Answers vary a lot. Treat this decision as a suggestion, not a rule."}
          </p>
        </div>
      )}
    </div>
  );
}
