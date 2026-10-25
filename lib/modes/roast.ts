import type { JevResponse, ScoreAnswer } from "../jev/types";
import type { ModeDef } from "./types";

export const ROAST_CRITERIA = ["Originality", "Feasibility", "Market demand", "Fun factor"];
export const ROAST_LEVELS = ["Weak", "Meh", "Solid", "Great"];
const MAX_LEVEL = ROAST_LEVELS.length - 1;

export type Roast = {
  overall: number; // 0–10, one decimal
  line: string;
  rows: { criterion: string; score: number; level: string }[];
};

export function roastResult(res: JevResponse): Roast {
  const rows = ROAST_CRITERIA.map((criterion) => {
    const score = (res.answers[criterion] as ScoreAnswer).score;
    return { criterion, score, level: ROAST_LEVELS[Math.round(score)] };
  });
  const avg = rows.reduce((t, r) => t + r.score, 0) / rows.length;
  const overall = Math.round((avg / MAX_LEVEL) * 100) / 10;
  const line =
    overall >= 8 ? "Honestly? Ship it."
    : overall >= 6 ? "Promising. Needs a sharper edge."
    : overall >= 4 ? "There's something here… somewhere."
    : "Back to the whiteboard.";
  return { overall, line, rows };
}

export const roast: ModeDef = {
  id: "roast",
  emoji: "🔥",
  title: "Roast My Idea",
  answerType: "Score",
  description: "Pitch an idea. Get rated on originality, feasibility, demand and fun.",
  lead: "Pitch your idea in a few sentences. Jev scores it on four criteria and gives an overall rating.",
  label: "Your idea",
  placeholder: "Describe your idea in 1–3 sentences…",
  submitLabel: "Roast it",
  examples: [
    "Uber for dog walkers, but the dogs rate the walkers",
    "A browser extension that blurs Twitter until you finish your todo list",
    "AI that writes your commit messages in Shakespearean English",
  ],
  build: ({ text }) => ({
    state: `Startup / project idea: ${text}`,
    questions: Object.fromEntries(
      ROAST_CRITERIA.map((c) => [c, { type: "score", instructions: `Rate this idea's ${c.toLowerCase()}.`, criteria: ROAST_LEVELS }]),
    ),
  }),
  headline: (res) => roastResult(res).overall / 10,
  headlineLabel: "Overall rating",
};
