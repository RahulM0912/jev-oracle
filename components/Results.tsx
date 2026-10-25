import type { JevResult } from "@/lib/api";
import type { NoulAnswer } from "@/lib/jev/types";
import { SHORT_TEXT_WORDS, aiStyleResult, aiVerdict, wordCount } from "@/lib/modes/aistyle";
import { ballAnswer } from "@/lib/modes/ball";
import { fortuneVerdict } from "@/lib/modes/fortune";
import { roastResult } from "@/lib/modes/roast";
import { scoreOptions } from "@/lib/modes/scorer";
import { rankStack } from "@/lib/modes/stack";
import type { ModeId, ModeInput } from "@/lib/modes/types";

export const pct = (x: number) => `${Math.round(x * 100)}%`;
export const panel = "rounded-2xl border border-line bg-surface p-5 shadow-card";

function Meter({ value, tone = "accent" }: { value: number; tone?: "accent" | "good" | "bad" }) {
  const bg = { accent: "bg-accent", good: "bg-good", bad: "bg-bad" }[tone];
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
      <span className={`block h-full rounded-full transition-[width] duration-700 ${bg}`} style={{ width: pct(value) }} />
    </div>
  );
}

function Verdict({ orb, title, children }: { orb: string; title: string; children: React.ReactNode }) {
  return (
    <div className={`${panel} px-4 py-7 text-center`}>
      <div className="orb pop mx-auto mb-4 grid size-36 place-items-center rounded-full font-display text-3xl text-white">{orb}</div>
      <h2 className="font-display text-2xl">{title}</h2>
      {children}
    </div>
  );
}

export function Result({ mode, input, result }: { mode: ModeId; input: ModeInput; result: JevResult }) {
  const { answers } = result.response;

  if (mode === "fortune") {
    const p = (answers.answer as NoulAnswer).noul;
    const v = fortuneVerdict(p);
    return (
      <Verdict orb={pct(p)} title={v.title}>
        <p className="mt-1.5 text-muted">{v.sub}</p>
        <p className="mt-1.5 text-muted">Chance of &quot;yes&quot;: <b className="text-ink">{pct(p)}</b></p>
      </Verdict>
    );
  }

  if (mode === "ball") {
    const p = (answers.answer as NoulAnswer).noul;
    return (
      <div className={`${panel} text-center`}>
        The ball says <b>&ldquo;{ballAnswer(p, input.text)}&rdquo;</b>
        <p className="mt-1 text-sm text-muted">Behind the glass, Jev put the chance of &quot;yes&quot; at <b className="text-ink">{pct(p)}</b>.</p>
      </div>
    );
  }

  if (mode === "aistyle") {
    const r = aiStyleResult(result.response);
    const v = aiVerdict(r.overall);
    const words = wordCount(input.text);
    const toneText = { good: "text-good", accent: "text-accent", bad: "text-bad" }[v.tone];
    return (
      <div className={panel}>
        <div className="flex flex-wrap items-center gap-5">
          <div className={`font-display text-6xl leading-none ${toneText}`}>{pct(r.overall)}</div>
          <div>
            <h2 className="font-display text-2xl">{v.title}</h2>
            <p className="mt-1 text-sm text-muted">How much this reads like typical AI writing.</p>
          </div>
        </div>
        <div className="mt-3"><Meter value={r.overall} tone={v.tone} /></div>

        {words < SHORT_TEXT_WORDS && (
          <p className="mt-3 rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">
            Only {words} words. Style checks on short text are close to guesswork. Paste more for a meaningful result.
          </p>
        )}

        <h3 className="mt-5 mb-1 font-display text-lg">Style signals</h3>
        {r.signals.map((s) => (
          <div key={s.key} className="my-3 grid grid-cols-[1fr_48px] items-center gap-2.5">
            <div>
              <div className="font-medium">{s.label}</div>
              <div className="mb-1 text-xs text-muted">{s.detail}</div>
              <Meter value={s.p} tone={s.p >= 0.6 ? "bad" : s.p >= 0.3 ? "accent" : "good"} />
            </div>
            <span className="text-right text-muted tabular-nums">{pct(s.p)}</span>
          </div>
        ))}

        <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
          This measures writing <b>style</b>, not who wrote it. Plain AI text can pass as human, and formal or non-native
          English can look AI-like. Don&apos;t use it to accuse anyone.
        </p>
      </div>
    );
  }

  if (mode === "scorer") {
    const s = scoreOptions(input, result.response);
    const tone = (x: number) => (x >= 7 ? "good" : x >= 4 ? "accent" : "bad") as "good" | "accent" | "bad";
    return (
      <div className={panel}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl">Scores</h2>
          <span className="text-sm text-muted">
            Jev&apos;s single pick: <b className="text-ink">{s.pick}</b> ({pct(s.pickConfidence)} confident)
          </span>
        </div>
        {s.rows.map((r, i) => (
          <div key={r.option} className="my-3 grid grid-cols-[28px_1fr_auto] items-center gap-2.5">
            <span className={`font-bold ${i === 0 ? "text-gold" : "text-muted"}`}>#{i + 1}</span>
            <div className="min-w-0">
              <div className="mb-1 font-medium break-words">
                {r.option}
                {r.option === s.pick && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">Jev&apos;s pick</span>}
              </div>
              <Meter value={r.score10 / 10} tone={tone(r.score10)} />
            </div>
            <span className="text-right tabular-nums">
              <b className="font-display text-xl">{r.score10.toFixed(1)}</b>
              <span className="text-sm text-muted">/10</span>
              <span className="block text-xs text-muted">{r.label}</span>
            </span>
          </div>
        ))}
        <p className="mt-3 text-xs text-muted">
          Each score judges one option against your condition on its own. &quot;Jev&apos;s pick&quot; is a separate question where
          the options compete, so it can break ties between similar scores.
        </p>
      </div>
    );
  }

  if (mode === "stack") {
    const cats = rankStack(input, result.response);
    return (
      <div className={panel}>
        <h2 className="font-display text-xl">Recommended stack</h2>
        <p className="mt-1 text-sm text-muted">
          {cats.map((c, i) => (
            <span key={c.category}>{i > 0 && " + "}<b className="text-ink">{c.ranked[0].option}</b></span>
          ))}
        </p>
        {cats.map((c) => (
          <div key={c.category} className="mt-4 border-t border-line pt-4">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-lg">{c.category}</h3>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">confidence {pct(c.confidence)}</span>
            </div>
            {c.ranked.map((r, i) => (
              <div key={r.option} className="my-2.5 grid grid-cols-[28px_1fr_48px] items-center gap-2.5">
                <span className={`font-bold ${i === 0 ? "text-gold" : "text-muted"}`}>#{i + 1}</span>
                <div>
                  <div className="mb-1 font-medium">{r.option}{i === 0 && " ⭐"}</div>
                  <Meter value={r.probability} />
                </div>
                <span className="text-right text-muted tabular-nums">{pct(r.probability)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  const r = roastResult(result.response);
  return (
    <div className={panel}>
      <div className="flex flex-wrap items-center gap-5">
        <div className="font-display text-6xl leading-none text-accent">
          {r.overall.toFixed(1)}<small className="text-xl text-muted">/10</small>
        </div>
        <div>
          <h2 className="font-display text-xl">{r.line}</h2>
          <p className="mt-1 text-sm text-muted">Average of 4 criteria, each scored 0–3.</p>
        </div>
      </div>
      {r.rows.map((row) => (
        <div key={row.criterion} className="my-3 grid grid-cols-[1fr_90px] items-center gap-2.5">
          <div>
            <div className="mb-1 font-medium">{row.criterion}</div>
            <Meter value={row.score / 3} />
          </div>
          <span className="text-right text-sm text-muted tabular-nums">{row.level} · {row.score.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}
