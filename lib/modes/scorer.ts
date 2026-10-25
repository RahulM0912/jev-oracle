import type { ChoiceAnswer, JevResponse, ScoreAnswer } from "../jev/types";
import type { ModeDef, ModeInput } from "./types";

// Each option gets its own Score against the condition (absolute, comparable), plus one
// Choice for the single best option (relative: options compete for probability).

export const FIT_LEVELS = [
  "Fails the condition: clearly unsuitable or breaks a stated requirement",
  "Weak fit: meets little of the condition and has major drawbacks",
  "Partial fit: meets some of the condition with notable trade-offs",
  "Good fit: meets the condition with only minor drawbacks",
  "Excellent fit: meets every part of the condition",
];
export const FIT_LABELS = ["Fails", "Weak", "Partial", "Good", "Excellent"];
const MAX_LEVEL = FIT_LEVELS.length - 1;
const GROUP = "Options";

const optKey = (i: number) => `opt${i}`;
const scoreKey = (i: number) => `fit_${i}`;
const options = (input: ModeInput) => input.options?.[GROUP] ?? [];

export type ScoredOption = { option: string; score10: number; label: string; confidence: number; pick: number };

export function scoreOptions(input: ModeInput, res: JevResponse) {
  const best = res.answers.best as ChoiceAnswer;
  const rows: ScoredOption[] = options(input)
    .map((option, i) => {
      const s = res.answers[scoreKey(i)] as ScoreAnswer;
      return {
        option,
        score10: Math.round((s.score / MAX_LEVEL) * 100) / 10,
        label: FIT_LABELS[Math.round(s.score)],
        confidence: s.confidence,
        pick: best.probabilities[optKey(i)] ?? 0,
      };
    })
    .sort((a, b) => b.score10 - a.score10 || b.pick - a.pick);
  const pickIndex = Number(best.choice.replace("opt", ""));
  return { rows, pick: options(input)[pickIndex], pickConfidence: best.confidence };
}

export const scorer: ModeDef = {
  id: "scorer",
  emoji: "⚖️",
  title: "Option Scorer",
  answerType: "Score + Choice",
  description: "Give a condition and some options. Jev scores how well each one fits.",
  lead: "Describe your condition or requirements, list the options, and Jev scores each one out of 10 and names its single best pick.",
  label: "Your condition",
  placeholder: "What must the right option satisfy? Budget, constraints, must-haves…",
  submitLabel: "Score my options",
  examples: [
    {
      text: "Weekend trip for 2 from Bangalore, budget under ₹15,000, we love nature and hate long drives",
      options: { [GROUP]: ["Coorg", "Goa", "Ooty", "Hampi", "Nandi Hills day trip"] },
    },
    {
      text: "Laptop for a college student who codes and travels daily, budget ₹70,000",
      options: { [GROUP]: ["MacBook Air M2", "Gaming laptop with RTX 4060", "Chromebook", "ThinkPad E14"] },
    },
    {
      text: "Pet for a small apartment, owner works 9 hours a day and is away most weekends",
      options: { [GROUP]: ["Labrador", "Cat", "Goldfish", "Parrot", "Hamster"] },
    },
  ],
  optionRules: {
    title: "Options to score",
    hint: "Type an option and press Enter. 2–8 options.",
    defaults: { [GROUP]: [] },
    min: 2,
    max: 8,
    maxLen: 100,
  },
  build: (input) => {
    const opts = options(input);
    return {
      state: { condition: input.text, options: opts },
      questions: {
        ...Object.fromEntries(
          opts.map((o, i) => [
            scoreKey(i),
            {
              type: "score",
              instructions: `How well does the option "${o}" satisfy the condition?`,
              criteria: FIT_LEVELS,
            },
          ]),
        ),
        best: {
          type: "choice",
          instructions: "Which single option best satisfies the condition overall?",
          criteria: Object.fromEntries(opts.map((o, i) => [optKey(i), o])),
        },
      },
    };
  },
  headline: (res) => {
    const scores = Object.entries(res.answers).filter(([k]) => k.startsWith("fit_")).map(([, a]) => (a as ScoreAnswer).score);
    return Math.max(...scores) / MAX_LEVEL;
  },
  headlineLabel: "Top option's score",
};
