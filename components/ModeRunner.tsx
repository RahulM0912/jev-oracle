"use client";

import { useState } from "react";
import { callJev, type JevResult } from "@/lib/api";
import { MAX_TEXT, getMode, validateInput, type Example, type ModeId, type ModeInput } from "@/lib/modes";
import { ballAnswer } from "@/lib/modes/ball";
import type { NoulAnswer } from "@/lib/jev/types";
import { Consistency } from "./Consistency";
import { MagicBall } from "./MagicBall";
import { OptionsEditor } from "./OptionsEditor";
import { Result, panel } from "./Results";

const exampleText = (ex: Example) => (typeof ex === "string" ? ex : ex.text);

const MIN_SHAKE_MS = 1300;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ModeRunner({ modeId }: { modeId: ModeId }) {
  const mode = getMode(modeId)!;
  const isBall = modeId === "ball";

  const [text, setText] = useState("");
  const [options, setOptions] = useState(() => (mode.optionRules ? structuredClone(mode.optionRules.defaults) : undefined));

  function applyExample(ex: Example) {
    setText(exampleText(ex));
    if (typeof ex !== "string") setOptions(structuredClone(ex.options));
  }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ input: ModeInput; result: JevResult; id: number } | null>(null);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (loading) return;
    const check = validateInput(modeId, { text, options });
    if (!check.ok) return setError(check.error);

    setError(null);
    setLoading(true);
    if (!isBall) setDone(null);
    try {
      const [result] = await Promise.all([callJev(modeId, check.input), isBall ? sleep(MIN_SHAKE_MS) : null]);
      setDone({ input: check.input, result, id: Date.now() });
    } catch (err) {
      setDone(null);
      setError(err instanceof Error ? err.message : "The oracle is sleeping. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  const ballText = isBall && done ? ballAnswer((done.result.response.answers.answer as NoulAnswer).noul, done.input.text) : null;

  return (
    <>
      <form onSubmit={submit} noValidate className={panel}>
        {isBall && <MagicBall shaking={loading} answer={ballText} />}

        <label htmlFor="text" className="mb-1.5 block font-bold">{mode.label}</label>
        <textarea
          id="text"
          rows={modeId === "fortune" || isBall ? 2 : 3}
          maxLength={MAX_TEXT}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
          }}
          placeholder={mode.placeholder}
          autoFocus
          className="w-full resize-y rounded-xl border border-line bg-canvas px-3.5 py-3 focus:border-transparent focus:outline-2 focus:outline-accent"
        />
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>Ctrl + Enter to submit</span>
          <span>{text.length}/{MAX_TEXT}</span>
        </div>

        <p className="mt-2 text-sm text-muted">Try an example:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {mode.examples.map((ex) => (
            <button
              key={exampleText(ex)}
              type="button"
              onClick={() => applyExample(ex)}
              className="cursor-pointer rounded-full border border-line bg-surface-2 px-3 py-1 text-left text-sm hover:border-accent"
            >
              {exampleText(ex)}
            </button>
          ))}
        </div>

        {options && mode.optionRules && <OptionsEditor rules={mode.optionRules} options={options} onChange={setOptions} />}

        <div className="mt-4">
          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer rounded-xl bg-accent px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && !isBall ? "Consulting…" : mode.submitLabel}
          </button>
        </div>
        {error && <p role="alert" className="mt-2.5 text-sm text-bad">{error}</p>}
      </form>

      <div className="mt-5" aria-live="polite">
        {loading && !isBall && (
          <div className={`${panel} flex items-center gap-3 text-muted`}>
            <span className="size-7 animate-spin rounded-full border-3 border-accent-soft border-t-accent" />
            Consulting the oracle…
          </div>
        )}
        {done && !loading && (
          <>
            <Result mode={modeId} input={done.input} result={done.result} />
            <Consistency key={done.id} mode={modeId} input={done.input} />
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted">Show what was sent to Jev and what came back</summary>
              <pre className="mt-2 overflow-x-auto rounded-xl border border-line bg-canvas p-3 text-xs">
                {JSON.stringify(done.result, null, 2)}
              </pre>
            </details>
          </>
        )}
      </div>
    </>
  );
}
