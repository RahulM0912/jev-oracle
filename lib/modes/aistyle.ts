import type { JevResponse, NoulAnswer } from "../jev/types";
import type { ModeDef } from "./types";

// Composite scoring: several narrow Noul checks over the same text, asked in one request.
// Measures writing style, not authorship. Short or non-native English text is unreliable.

export const AI_SIGNALS = [
  {
    key: "phrases",
    label: "Stock AI phrases",
    detail: "“delve”, “landscape”, “it's important to note”, “Certainly!”",
    instructions:
      "Does `text` use stock phrases typical of AI assistants, such as \"delve\", \"in today's fast-paced world\", \"it's important to note\", \"a testament to\", \"Certainly!\" or \"I hope this helps\"?",
  },
  {
    key: "generic",
    label: "Generic, no specifics",
    detail: "No personal experience, names, numbers or concrete details",
    instructions:
      "Is `text` generic, lacking the personal experience, concrete names, numbers or specific details a person writing about this would usually include?",
  },
  {
    key: "structure",
    label: "Formulaic structure",
    detail: "Neat lists, “on one hand… on the other”, tidy summary ending",
    instructions:
      "Is `text` structured in an overly balanced or formulaic way, such as neat parallel lists, \"on one hand / on the other hand\", or a tidy summarising conclusion?",
  },
  {
    key: "polish",
    label: "Unnaturally polished",
    detail: "No typos, slang, abbreviations or personal quirks",
    instructions: "Is `text` unusually polished and uniform, with no typos, slang, abbreviations, humour or personal quirks?",
  },
] as const;

export const SHORT_TEXT_WORDS = 25;
export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export function aiVerdict(p: number): { title: string; tone: "good" | "accent" | "bad" } {
  if (p >= 0.6) return { title: "Sounds like AI", tone: "bad" };
  if (p >= 0.3) return { title: "Mixed signals", tone: "accent" };
  return { title: "Sounds human", tone: "good" };
}

export function aiStyleResult(res: JevResponse) {
  const noul = (k: string) => (res.answers[k] as NoulAnswer).noul;
  return {
    overall: noul("overall"),
    signals: AI_SIGNALS.map((s) => ({ key: s.key, label: s.label, detail: s.detail, p: noul(s.key) })),
  };
}

export const aistyle: ModeDef = {
  id: "aistyle",
  emoji: "🤖",
  title: "AI-Style Meter",
  answerType: "Yes / No × 5",
  description: "Paste some text. See how AI-like it sounds, and which style signals drive that.",
  lead: "Paste text and Jev checks how much it reads like typical AI writing, with a breakdown of the style signals behind the score.",
  label: "Text to check",
  placeholder: "Paste a paragraph or two. Longer text gives more meaningful results…",
  submitLabel: "Check the style",
  examples: [
    "In today's fast-paced digital landscape, it is crucial to leverage innovative solutions to enhance productivity and drive meaningful outcomes. By embracing a holistic approach, organizations can unlock new opportunities and foster sustainable growth.",
    "ugh missed the bus again, gonna be late for standup lol. third time this week. if my manager asks im blaming the 42B, that route is cursed",
    "I am very much thankful for your kind support in this matter. Kindly do the needful at the earliest and revert back with the updated documents.",
  ],
  build: ({ text }) => ({
    state: { text },
    questions: {
      overall: { type: "noul", instructions: "Does `text` read like it was written by an AI language model rather than by a person?" },
      ...Object.fromEntries(AI_SIGNALS.map((s) => [s.key, { type: "noul", instructions: s.instructions }])),
    },
  }),
  headline: (res) => (res.answers.overall as NoulAnswer).noul,
  headlineLabel: "Sounds like AI",
};
