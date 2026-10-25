// Shapes of the TypeSafe Jev API (POST /v1/systemone).
// Safe to import from client and server code.

/** Instructions, criteria entries and state may be plain strings or structured JSON. */
export type JevText = string | Record<string, unknown> | unknown[];

export type NoulQuestion = { type: "noul"; instructions: JevText };
export type ChoiceQuestion = { type: "choice"; instructions: JevText; criteria: Record<string, JevText> };
export type ScoreQuestion = { type: "score"; instructions: JevText; criteria: JevText[] };
export type JevQuestion = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export type NoulAnswer = { type: "noul"; noul: number };
export type ChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};
export type ScoreAnswer = {
  type: "score";
  score: number;
  confidence: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
};
export type JevAnswer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export type JevRequest = { state: JevText; questions: Record<string, JevQuestion> };

export type JevResponse = {
  model: string;
  answers: Record<string, JevAnswer>;
  usage?: { input_tokens: number; output_tokens: number };
};
