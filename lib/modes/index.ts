import { aistyle } from "./aistyle";
import { ball } from "./ball";
import { fortune } from "./fortune";
import { roast } from "./roast";
import { scorer } from "./scorer";
import { stack } from "./stack";
import type { Example, ModeDef, ModeId, ModeInput, OptionRules } from "./types";

export type { Example, ModeDef, ModeId, ModeInput, OptionRules };

export const MODES: ModeDef[] = [fortune, ball, stack, scorer, aistyle, roast];

/** Turn-based games with their own page and API route. */
export const GAMES = [
  { id: "secret", emoji: "🤫", title: "Jev's Secret", answerType: "Yes / No", description: "Jev thinks of something. Ask up to 20 yes/no questions to guess it. Party mode: a friend picks." },
  { id: "bouncer", emoji: "🚪", title: "Convince the Bouncer", answerType: "Yes / No", description: "Talk your way past four bouncers, each pickier than the last. Three tries per door." },
  { id: "tictactoe", emoji: "⭕", title: "Tic-Tac-Toe", answerType: "Choice", description: "Play against Jev on Easy, Hard or Impossible. It picks every move from the open squares." },
];

export const getMode = (id: string): ModeDef | undefined => MODES.find((m) => m.id === id);

export const MAX_TEXT = 2000;

type Validation = { ok: true; input: ModeInput } | { ok: false; error: string };

/** Runs on the client for fast feedback and on the server as the real gate. */
export function validateInput(mode: ModeId, raw: unknown): Validation {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "Missing input." };
  const { text, options } = raw as { text?: unknown; options?: unknown };

  if (typeof text !== "string" || !text.trim()) return { ok: false, error: "Type something first." };
  if (text.length > MAX_TEXT) return { ok: false, error: `Keep it under ${MAX_TEXT} characters.` };
  const rules = getMode(mode)?.optionRules;
  if (!rules) return { ok: true, input: { text: text.trim() } };

  if (typeof options !== "object" || options === null) return { ok: false, error: "Add some options." };
  const groups = Object.keys(rules.defaults);
  const single = groups.length === 1;
  const clean: Record<string, string[]> = {};
  for (const [group, list] of Object.entries(options)) {
    if (!groups.includes(group)) return { ok: false, error: `Unknown category "${group}".` };
    if (!Array.isArray(list)) return { ok: false, error: `Options for ${group} must be a list.` };
    const opts = [...new Set(list.filter((o): o is string => typeof o === "string").map((o) => o.trim()).filter(Boolean))];
    if (opts.some((o) => o.length > rules.maxLen)) return { ok: false, error: `Keep each option under ${rules.maxLen} characters.` };
    if (opts.length < rules.min || opts.length > rules.max)
      return {
        ok: false,
        error: single
          ? `Add ${rules.min}–${rules.max} options (you have ${opts.length}).`
          : `Each category needs ${rules.min}–${rules.max} options (${group} has ${opts.length}).`,
      };
    clean[group] = opts;
  }
  if (!Object.keys(clean).length) return { ok: false, error: single ? `Add ${rules.min}–${rules.max} options.` : "Add at least one category." };
  return { ok: true, input: { text: text.trim(), options: clean } };
}
