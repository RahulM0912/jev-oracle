import { hash } from "../jev/mock";
import type { NoulAnswer } from "../jev/types";
import { yesNoInstructions } from "./fortune";
import type { ModeDef } from "./types";

// The 20 classic Magic 8-Ball replies, bucketed by Jev's chance of "yes".
export const BALL_ANSWERS: [minChance: number, replies: string[]][] = [
  [0.8, ["It is certain.", "It is decidedly so.", "Without a doubt.", "Yes, definitely.", "You may rely on it."]],
  [0.6, ["As I see it, yes.", "Most likely.", "Outlook good.", "Yes.", "Signs point to yes."]],
  [0.4, ["Reply hazy, try again.", "Ask again later.", "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again."]],
  [0, ["Don't count on it.", "My reply is no.", "My sources say no.", "Outlook not so good.", "Very doubtful."]],
];

/** Same question + same bucket always gives the same reply. */
export function ballAnswer(p: number, question: string): string {
  const replies = BALL_ANSWERS.find(([min]) => p >= min)![1];
  return replies[Math.floor(hash(question.trim().toLowerCase()) * replies.length) % replies.length];
}

export const ball: ModeDef = {
  id: "ball",
  emoji: "🎱",
  title: "Magic 8-Ball",
  answerType: "Yes / No",
  description: "Ask a question, shake the ball, read your fate in the little window.",
  lead: "Ask a yes-or-no question, then shake the ball. It answers with one of the 20 classic 8-Ball replies.",
  label: "Your question",
  placeholder: "Ask a yes-or-no question…",
  submitLabel: "🎱 Shake the ball",
  examples: ["Will I get the job?", "Should I text them back?", "Will my code compile on the first try?"],
  build: ({ text }) => ({
    state: `Question asked to a Magic 8-Ball: "${text}"`,
    questions: { answer: { type: "noul", instructions: yesNoInstructions(text) } },
  }),
  headline: (res) => (res.answers.answer as NoulAnswer).noul,
  headlineLabel: "Chance of yes",
};
