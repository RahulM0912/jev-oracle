import { describe, expect, it } from "vitest";
import { mockJev } from "../jev/mock";
import type { JevResponse } from "../jev/types";
import { BALL_ANSWERS, ballAnswer } from "./ball";
import { fortuneVerdict } from "./fortune";
import { MODES, getMode, validateInput } from "./index";
import { AI_SIGNALS, aiStyleResult, aiVerdict, aistyle, wordCount } from "./aistyle";
import { roastResult } from "./roast";
import { scoreOptions, scorer } from "./scorer";
import { STACK_DEFAULTS, rankStack, stack } from "./stack";

describe("validateInput", () => {
  it("rejects empty and oversized text", () => {
    expect(validateInput("fortune", { text: "   " })).toEqual({ ok: false, error: "Type something first." });
    expect(validateInput("fortune", { text: "x".repeat(2001) }).ok).toBe(false);
    expect(validateInput("fortune", null).ok).toBe(false);
  });

  it("trims text and drops options for non-stack modes", () => {
    expect(validateInput("roast", { text: "  idea  ", options: { Frontend: ["a", "b"] } })).toEqual({ ok: true, input: { text: "idea" } });
  });

  it("cleans stack options: trims, dedupes, drops blanks", () => {
    const res = validateInput("stack", { text: "app", options: { Frontend: [" React ", "React", "", "Vue"] } });
    expect(res).toEqual({ ok: true, input: { text: "app", options: { Frontend: ["React", "Vue"] } } });
  });

  it("rejects bad stack options", () => {
    expect(validateInput("stack", { text: "app", options: { Frontend: ["React"] } }).ok).toBe(false);
    expect(validateInput("stack", { text: "app", options: { Frontend: ["a", "b", "c", "d", "e", "f", "g"] } }).ok).toBe(false);
    expect(validateInput("stack", { text: "app", options: { Hacking: ["a", "b"] } }).ok).toBe(false);
    expect(validateInput("stack", { text: "app", options: { Frontend: ["a", "x".repeat(41)] } }).ok).toBe(false);
    expect(validateInput("stack", { text: "app", options: {} }).ok).toBe(false);
    expect(validateInput("stack", { text: "app" }).ok).toBe(false);
  });
});

describe("mode builders", () => {
  it("every mode builds a request whose mock response feeds its headline", async () => {
    for (const mode of MODES) {
      const options = mode.id === "stack" ? STACK_DEFAULTS : mode.id === "scorer" ? { Options: ["Slack", "Discord"] } : undefined;
      const input = { text: "A real-time chat app", options };
      const req = mode.build(input);
      expect(JSON.stringify(req.state)).toContain("A real-time chat app");
      const res = await mockJev(req);
      const h = mode.headline(res);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(1);
    }
  });

  it("getMode finds known modes only", () => {
    expect(getMode("ball")?.title).toBe("Magic 8-Ball");
    expect(getMode("nope")).toBeUndefined();
  });
});

describe("stack", () => {
  it("sends option names under safe keys and maps them back ranked", () => {
    const input = { text: "app", options: { Database: ["PostgreSQL", "Mongo DB (Atlas)", "SQLite"] } };
    const q = stack.build(input).questions.Database;
    expect(q).toMatchObject({ type: "choice", criteria: { opt0: "PostgreSQL", opt1: "Mongo DB (Atlas)", opt2: "SQLite" } });

    const res: JevResponse = {
      model: "t",
      answers: { Database: { type: "choice", choice: "opt1", confidence: 0.6, probabilities: { opt0: 0.25, opt1: 0.73, opt2: 0.02 } } },
    };
    expect(rankStack(input, res)).toEqual([
      {
        category: "Database",
        confidence: 0.6,
        ranked: [
          { option: "Mongo DB (Atlas)", probability: 0.73 },
          { option: "PostgreSQL", probability: 0.25 },
          { option: "SQLite", probability: 0.02 },
        ],
      },
    ]);
  });
});

describe("scorer", () => {
  const input = { text: "Pet for a small apartment", options: { Options: ["Cat", "Labrador", "Goldfish"] } };

  it("asks one Score per option plus one Choice", () => {
    const req = scorer.build(input);
    expect(Object.keys(req.questions)).toEqual(["fit_0", "fit_1", "fit_2", "best"]);
    expect(req.questions.fit_1).toMatchObject({ type: "score", instructions: expect.stringContaining('"Labrador"') });
    expect(req.questions.best).toMatchObject({ type: "choice", criteria: { opt0: "Cat", opt1: "Labrador", opt2: "Goldfish" } });
    expect(req.state).toEqual({ condition: "Pet for a small apartment", options: ["Cat", "Labrador", "Goldfish"] });
  });

  it("converts scores to /10, sorts, and names the pick", () => {
    const score = (s: number) => ({ type: "score" as const, score: s, confidence: 0.8, legend: {}, probabilities: {} });
    const res: JevResponse = {
      model: "t",
      answers: {
        fit_0: score(3.6), fit_1: score(0.4), fit_2: score(3.6),
        best: { type: "choice", choice: "opt2", confidence: 0.5, probabilities: { opt0: 0.4, opt1: 0.05, opt2: 0.55 } },
      },
    };
    const r = scoreOptions(input, res);
    expect(r.rows.map((x) => [x.option, x.score10, x.label])).toEqual([
      ["Goldfish", 9, "Excellent"], ["Cat", 9, "Excellent"], ["Labrador", 1, "Fails"],
    ]);
    expect(r.pick).toBe("Goldfish");
    expect(scorer.headline(res)).toBeCloseTo(0.9);
  });

  it("validates the options list", () => {
    expect(validateInput("scorer", { text: "x", options: { Options: ["a"] } })).toEqual({ ok: false, error: "Add 2–8 options (you have 1)." });
    expect(validateInput("scorer", { text: "x", options: { Options: [] } }).ok).toBe(false);
    expect(validateInput("scorer", { text: "x", options: { Options: Array.from({ length: 9 }, (_, i) => `o${i}`) } }).ok).toBe(false);
    expect(validateInput("scorer", { text: "x", options: { Options: ["a", "b"] } }).ok).toBe(true);
  });
});

describe("aistyle", () => {
  it("asks an overall Noul plus one per signal over the same text", () => {
    const req = aistyle.build({ text: "hello there" });
    expect(req.state).toEqual({ text: "hello there" });
    expect(Object.keys(req.questions)).toEqual(["overall", ...AI_SIGNALS.map((s) => s.key)]);
    expect(Object.values(req.questions).every((q) => q.type === "noul")).toBe(true);
  });

  it("reads the composite result and buckets the verdict", () => {
    const n = (p: number) => ({ type: "noul" as const, noul: p });
    const res: JevResponse = { model: "t", answers: { overall: n(0.84), phrases: n(0.9), generic: n(0.7), structure: n(0.5), polish: n(0.8) } };
    const r = aiStyleResult(res);
    expect(r.overall).toBe(0.84);
    expect(r.signals.map((s) => s.p)).toEqual([0.9, 0.7, 0.5, 0.8]);
    expect(aiVerdict(0.84).title).toBe("Sounds like AI");
    expect(aiVerdict(0.43).title).toBe("Mixed signals");
    expect(aiVerdict(0.13).title).toBe("Sounds human");
    expect(wordCount("  ugh missed   the bus ")).toBe(4);
  });
});

describe("roast", () => {
  it("averages criteria scores into a 0–10 rating", () => {
    const score = (s: number) => ({ type: "score" as const, score: s, confidence: 1, legend: {}, probabilities: {} });
    const res: JevResponse = {
      model: "t",
      answers: { Originality: score(3), Feasibility: score(3), "Market demand": score(1.5), "Fun factor": score(0) },
    };
    const r = roastResult(res);
    expect(r.overall).toBe(6.3);
    expect(r.line).toBe("Promising. Needs a sharper edge.");
    expect(r.rows.map((x) => x.level)).toEqual(["Great", "Great", "Solid", "Weak"]);
  });
});

describe("yes/no presenters", () => {
  it("fortuneVerdict buckets probabilities", () => {
    expect(fortuneVerdict(0.9).title).toBe("Yes, definitely.");
    expect(fortuneVerdict(0.5).title).toBe("Hard to say.");
    expect(fortuneVerdict(0.05).title).toBe("No.");
  });

  it("ballAnswer picks from the right bucket and is stable per question", () => {
    const [yes, lean, hazy, no] = BALL_ANSWERS.map(([, r]) => r);
    expect(yes).toContain(ballAnswer(0.95, "Will it work?"));
    expect(lean).toContain(ballAnswer(0.7, "Will it work?"));
    expect(hazy).toContain(ballAnswer(0.5, "Will it work?"));
    expect(no).toContain(ballAnswer(0.1, "Will it work?"));
    expect(ballAnswer(0.9, "Will it work?")).toBe(ballAnswer(0.85, "  will it WORK?  "));
  });
});
