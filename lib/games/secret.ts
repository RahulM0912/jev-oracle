import type { JevRequest, JevResponse, NoulAnswer } from "../jev/types";

// Jev's Secret: a 20-questions game. Code holds the secret and the rules;
// Jev only answers the player's yes/no questions about it. Safe to import from client code.

export const CATEGORIES = {
  animals: { label: "Animals", emoji: "🐾" },
  food: { label: "Food", emoji: "🍕" },
  objects: { label: "Everyday objects", emoji: "🏠" },
  places: { label: "Places & space", emoji: "🗺️" },
  countries: { label: "Countries", emoji: "🌍" },
  vehicles: { label: "Vehicles & machines", emoji: "🚗" },
} as const;

export type Category = keyof typeof CATEGORIES;
/** What guessers are told about the secret. "anything" = no hint. */
export type Hint = Category | "anything";
export type SecretLevel = "easy" | "hard";
export type Secret = { name: string; aliases: string[]; category: Hint };

/** Suggested questions per hint, broad to narrow. The game shows the first few not yet asked. */
export const SUGGESTIONS: Record<Hint, string[]> = {
  anything: [
    "Is it alive?", "Is it man-made?", "Is it bigger than a car?", "Can you eat it?",
    "Is it a place?", "Is it found indoors?", "Can you hold it in one hand?", "Does it use electricity?",
  ],
  animals: [
    "Is it a mammal?", "Does it live in water?", "Can it fly?", "Is it bigger than a dog?",
    "Is it kept as a pet?", "Does it eat meat?", "Does it live in Africa?", "Does it have fur?",
  ],
  food: [
    "Is it sweet?", "Is it a fruit?", "Is it a vegetable?", "Is it usually eaten hot?",
    "Is it a snack?", "Does it grow on a tree?", "Is it eaten for breakfast?", "Is it usually cooked?",
  ],
  objects: [
    "Does it use electricity?", "Can you hold it in one hand?", "Is it found in a kitchen?", "Is it made of metal?",
    "Do you wear it?", "Is it used at school?", "Is it a musical instrument?", "Is it furniture?",
  ],
  places: [
    "Is it a natural place?", "Is it in space?", "Is it a building?", "Is it a city?",
    "Is it in Europe?", "Is it hot there?", "Can you visit it?", "Is it near the sea?",
  ],
  countries: [
    "Is it in Europe?", "Is it in Asia?", "Is it in Africa?", "Is it in the Americas?",
    "Is it an island country?", "Is it bigger than France?", "Is English an official language there?", "Is it in the Southern Hemisphere?",
  ],
  vehicles: [
    "Does it fly?", "Does it go on water?", "Does it have wheels?", "Does it have an engine?",
    "Can it carry more than 10 people?", "Is it used in emergencies?", "Does it run on rails?", "Do you pedal it?",
  ],
};

/** Example shown in the empty question box. */
export const PLACEHOLDERS: Record<Hint, string> = {
  anything: "Is it bigger than a car?",
  animals: "Does it have stripes?",
  food: "Is it crunchy?",
  objects: "Is it bigger than a shoebox?",
  places: "Is it on Earth?",
  countries: "Does it have a coastline?",
  vehicles: "Is it faster than a car?",
};

export const MAX_QUESTIONS = 20;
export const MAX_QUESTION = 200;
export const MAX_SECRET = 60;

export const hintLabel = (h: Hint) => (h === "anything" ? "Anything" : CATEGORIES[h].label);
export const isHint = (h: unknown): h is Hint => h === "anything" || (typeof h === "string" && h in CATEGORIES);
export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Picks a random secret, avoiding recently played names when the pool allows it. */
export function pickSecret<T extends Secret & { level: SecretLevel }>(
  pool: T[],
  { category = "anything", level, recent = [] }: { category?: Hint; level?: SecretLevel; recent?: string[] },
  random = Math.random,
): T {
  const matching = pool.filter((s) => (category === "anything" || s.category === category) && (!level || s.level === level));
  const fresh = matching.filter((s) => !recent.includes(s.name));
  const from = fresh.length ? fresh : matching;
  return from[Math.floor(random() * from.length)];
}

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[.'’]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\b(a|an|the)\b/g, " ").replace(/\s+/g, " ").trim();
const plurals = (s: string) => [s, `${s}s`, `${s}es`];

/** Exact match on the name or an alias, ignoring case, articles, punctuation and simple plurals. */
export function matchesSecret(secret: Secret, guess: string): boolean {
  const g = normalize(guess);
  if (!g) return false;
  return [secret.name, ...secret.aliases].some((n) => {
    const m = normalize(n);
    return plurals(m).includes(g) || plurals(g).includes(m);
  });
}

const secretState = (secret: Secret) => ({
  secret_thing: secret.name,
  category: secret.category === "anything" ? "not given" : CATEGORIES[secret.category].label,
});

/**
 * Three independent questions over the same state, asked in one request:
 * the answer itself, whether it's a yes/no question at all, and whether it names the secret.
 */
export function buildAskRequest(secret: Secret, question: string): JevRequest {
  return {
    state: { game: "20 questions: the player asks yes/no questions to guess the secret thing", ...secretState(secret), player_question: question },
    questions: {
      answer: {
        type: "noul",
        instructions:
          "Using common knowledge about `secret_thing`, is the truthful answer to `player_question` yes? " +
          "Answer about the typical, everyday version of `secret_thing`.",
      },
      yes_no: {
        type: "noul",
        instructions: "Can `player_question` be sensibly answered with yes or no? Questions like 'What colour is it?' or 'Tell me more' cannot.",
      },
      names_it: {
        type: "noul",
        instructions:
          "Is `player_question` directly asking whether the secret is `secret_thing` itself or an exact synonym of it " +
          "(for example 'Is it a <secret_thing>?')? Questions about a broader group or a property do not count.",
      },
    },
  };
}

export type AskResult =
  | { kind: "not-yes-no" }
  | { kind: "solved" }
  | { kind: "answer"; p: number };

const noul = (res: JevResponse, key: string) => (res.answers[key] as NoulAnswer).noul;

export function readAsk(res: JevResponse): AskResult {
  if (noul(res, "yes_no") < 0.4) return { kind: "not-yes-no" };
  const p = noul(res, "answer");
  if (noul(res, "names_it") >= 0.7 && p >= 0.6) return { kind: "solved" };
  return { kind: "answer", p };
}

/** Only used when the guess doesn't match the name or an alias exactly. */
export function buildGuessRequest(secret: Secret, guess: string): JevRequest {
  return {
    state: { ...secretState(secret), player_guess: guess },
    questions: {
      same: {
        type: "noul",
        instructions:
          "Does `player_guess` name the same thing as `secret_thing`? A synonym, alternative name, spelling variant or plural counts. " +
          "A broader category (like 'animal' for a dog), a narrower kind, or a related but different thing does not.",
      },
    },
  };
}

export const GUESS_BAR = 0.75;
export const readGuess = (res: JevResponse) => noul(res, "same");

export type AnswerLabel = { text: string; tone: "good" | "bad" | "gold" };

export function answerLabel(p: number): AnswerLabel {
  if (p >= 0.8) return { text: "Yes", tone: "good" };
  if (p >= 0.6) return { text: "Mostly yes", tone: "good" };
  if (p > 0.4) return { text: "Sort of… it depends", tone: "gold" };
  if (p > 0.2) return { text: "Mostly no", tone: "bad" };
  return { text: "No", tone: "bad" };
}
