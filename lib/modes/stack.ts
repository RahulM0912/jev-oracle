import type { ChoiceAnswer, JevResponse } from "../jev/types";
import type { ModeDef, ModeInput } from "./types";

export const STACK_DEFAULTS: Record<string, string[]> = {
  Frontend: ["React", "Vue", "Svelte", "Angular"],
  Backend: ["Node.js", "Python (FastAPI)", "Go", "Java (Spring)"],
  Database: ["PostgreSQL", "MongoDB", "SQLite", "Redis"],
  Hosting: ["Vercel", "AWS", "Railway", "Fly.io"],
};
export const STACK_CATEGORIES = Object.keys(STACK_DEFAULTS);

// Option names go to Jev as descriptions under safe keys (opt0, opt1...), so any
// user-typed name works as a choice. rankStack maps the keys back to names.
const optKey = (i: number) => `opt${i}`;

export type RankedCategory = {
  category: string;
  confidence: number;
  ranked: { option: string; probability: number }[];
};

export function rankStack(input: ModeInput, res: JevResponse): RankedCategory[] {
  return Object.entries(input.options ?? {}).map(([category, options]) => {
    const ans = res.answers[category] as ChoiceAnswer;
    const ranked = options
      .map((option, i) => ({ option, probability: ans.probabilities[optKey(i)] ?? 0 }))
      .sort((a, b) => b.probability - a.probability);
    return { category, confidence: ans.confidence, ranked };
  });
}

export const stack: ModeDef = {
  id: "stack",
  emoji: "🧱",
  title: "Stack Ranker",
  answerType: "Choice",
  description: "Describe your project. Get tech choices ranked best to worst.",
  lead: "Describe what you're building. Jev ranks the options in each category. Edit the options to compare anything.",
  label: "Your project",
  placeholder: "What are you building? Who uses it? Any constraints?",
  submitLabel: "Rank my stack",
  optionRules: {
    title: "Options to rank",
    hint: "Remove what you don't want, add what you do. 2–6 per category.",
    defaults: STACK_DEFAULTS,
    min: 2,
    max: 6,
    maxLen: 40,
  },
  examples: [
    "Real-time chat app for 10k users, solo dev who knows JavaScript",
    "Internal admin dashboard for a small team, needs auth and tables",
    "Mobile-first recipe sharing app with image uploads",
  ],
  build: ({ text, options = {} }) => ({
    state: `Project description: ${text}`,
    questions: Object.fromEntries(
      Object.entries(options).map(([category, opts]) => [
        category,
        {
          type: "choice",
          instructions: `Which ${category.toLowerCase()} option is the best fit for this project?`,
          criteria: Object.fromEntries(opts.map((o, i) => [optKey(i), o])),
        },
      ]),
    ),
  }),
  headline: (res) => {
    const first = Object.values(res.answers)[0] as ChoiceAnswer;
    return first.probabilities[first.choice];
  },
  headlineLabel: "Top pick share (first category)",
};
