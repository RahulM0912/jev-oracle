import type { NoulAnswer } from "../jev/types";
import type { ModeDef } from "./types";

export const yesNoInstructions = (question: string) =>
  `Considering general knowledge and common sense, is the answer to this question more likely yes than no? Question: ${question}`;

export function fortuneVerdict(p: number): { title: string; sub: string } {
  if (p >= 0.85) return { title: "Yes, definitely.", sub: "The signs are clear." };
  if (p >= 0.65) return { title: "Most likely yes.", sub: "The odds lean your way." };
  if (p >= 0.45) return { title: "Hard to say.", sub: "The future is cloudy. Ask again later." };
  if (p >= 0.2) return { title: "Probably not.", sub: "Don't count on it." };
  return { title: "No.", sub: "My sources say no." };
}

export const fortune: ModeDef = {
  id: "fortune",
  emoji: "🔮",
  title: "Fortune Teller",
  answerType: "Yes / No",
  description: "Ask any yes-or-no question. Get a verdict and how sure Jev is.",
  lead: "Type a yes-or-no question. Jev answers with a probability, and we turn it into a verdict.",
  label: "Your question",
  placeholder: "Will it rain on my wedding day?",
  submitLabel: "Ask the oracle",
  examples: ["Will my side project get 100 users?", "Should I learn Rust this year?", "Is today a good day to deploy on Friday?"],
  build: ({ text }) => ({
    state: `Question asked to a fortune teller: "${text}"`,
    questions: { answer: { type: "noul", instructions: yesNoInstructions(text) } },
  }),
  headline: (res) => (res.answers.answer as NoulAnswer).noul,
  headlineLabel: "Chance of yes",
};
