import type { JevRequest, JevResponse } from "../jev/types";

export type ModeId = "fortune" | "ball" | "stack" | "roast" | "scorer" | "aistyle";

export type ModeInput = {
  text: string;
  /** Modes with optionRules only: group -> options */
  options?: Record<string, string[]>;
};

/** For modes where the user edits lists of options (Stack Ranker, Option Scorer). */
export type OptionRules = {
  title: string;
  hint: string;
  defaults: Record<string, string[]>;
  min: number;
  max: number;
  maxLen: number;
};

export type Example = string | { text: string; options: Record<string, string[]> };

export type ModeDef = {
  id: ModeId;
  emoji: string;
  title: string;
  answerType: string;
  description: string;
  lead: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  examples: Example[];
  optionRules?: OptionRules;
  build: (input: ModeInput) => JevRequest;
  /** One 0–1 number per response, compared across runs by the consistency check. */
  headline: (res: JevResponse) => number;
  headlineLabel: string;
};
