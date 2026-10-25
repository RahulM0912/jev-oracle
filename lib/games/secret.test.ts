import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/secret/route";
import type { JevResponse } from "../jev/types";
import { CATEGORIES, PLACEHOLDERS, SUGGESTIONS, answerLabel, buildAskRequest, matchesSecret, pickSecret, readAsk } from "./secret";
import { SECRETS } from "./secrets";
import { open, seal } from "./secretToken";

describe("secret list", () => {
  it("has 250 unique secrets across every category and level", () => {
    expect(SECRETS).toHaveLength(250);
    expect(new Set(SECRETS.map((s) => s.name.toLowerCase())).size).toBe(250);
    for (const c of Object.keys(CATEGORIES)) {
      expect(SECRETS.some((s) => s.category === c && s.level === "easy")).toBe(true);
      expect(SECRETS.some((s) => s.category === c && s.level === "hard")).toBe(true);
    }
  });
});

describe("suggested questions", () => {
  it("exist for every hint and are unique yes/no questions", () => {
    for (const hint of ["anything", ...Object.keys(CATEGORIES)] as (keyof typeof SUGGESTIONS)[]) {
      const list = SUGGESTIONS[hint];
      expect(list.length).toBeGreaterThanOrEqual(6);
      expect(new Set(list).size).toBe(list.length);
      for (const q of list) expect(q).toMatch(/^(Is|Are|Can|Does|Do) .+\?$/);
    }
  });
  it("fit the category: no eating, holding or sizing up a country against a car", () => {
    expect([...SUGGESTIONS.countries, PLACEHOLDERS.countries].join(" ")).not.toMatch(/eat|hold|alive|car\b/i);
  });
});

describe("matchesSecret", () => {
  const fries = { name: "french fries", aliases: ["fries", "chips"], category: "food" as const };
  it("ignores case, articles, punctuation and plurals, and accepts aliases", () => {
    expect(matchesSecret(fries, "French Fries!")).toBe(true);
    expect(matchesSecret(fries, "the chips")).toBe(true);
    expect(matchesSecret({ name: "bus", aliases: [], category: "vehicles" }, "buses")).toBe(true);
    expect(matchesSecret({ name: "Eiffel Tower", aliases: [], category: "places" }, "eiffel tower")).toBe(true);
  });
  it("accepts country aliases and abbreviations", () => {
    const usa = SECRETS.find((s) => s.name === "United States")!;
    expect(usa.category).toBe("countries");
    expect(matchesSecret(usa, "the U.S.A.")).toBe(true);
    expect(matchesSecret(usa, "America")).toBe(true);
    expect(matchesSecret(SECRETS.find((s) => s.name === "Turkey")!, "Türkiye")).toBe(true);
    expect(matchesSecret(usa, "Canada")).toBe(false);
  });
  it("rejects other things and empty guesses", () => {
    expect(matchesSecret(fries, "potato")).toBe(false);
    expect(matchesSecret(fries, "  ")).toBe(false);
  });
});

describe("pickSecret", () => {
  it("filters by category and level and skips recent secrets", () => {
    const pool = SECRETS.filter((s) => s.category === "vehicles" && s.level === "hard");
    const recent = pool.slice(1).map((s) => s.name);
    expect(pickSecret(SECRETS, { category: "vehicles", level: "hard", recent }).name).toBe(pool[0].name);
  });
  it("falls back to repeats when everything was played recently", () => {
    const all = SECRETS.filter((s) => s.category === "vehicles").map((s) => s.name);
    expect(all).toContain(pickSecret(SECRETS, { category: "vehicles", recent: all }).name);
  });
});

describe("asking", () => {
  const answers = (answer: number, yes_no: number, names_it: number): JevResponse => ({
    model: "t",
    answers: { answer: { type: "noul", noul: answer }, yes_no: { type: "noul", noul: yes_no }, names_it: { type: "noul", noul: names_it } },
  });

  it("asks answer, yes/no check and direct-guess check in one request", () => {
    const req = buildAskRequest({ name: "giraffe", aliases: [], category: "animals" }, "Is it tall?");
    expect(Object.keys(req.questions)).toEqual(["answer", "yes_no", "names_it"]);
    expect(req.state).toMatchObject({ secret_thing: "giraffe", category: "Animals", player_question: "Is it tall?" });
  });

  it("reads non-questions, direct hits and plain answers", () => {
    expect(readAsk(answers(0.5, 0.1, 0))).toEqual({ kind: "not-yes-no" });
    expect(readAsk(answers(0.95, 0.99, 0.9))).toEqual({ kind: "solved" });
    expect(readAsk(answers(0.1, 0.99, 0.9))).toEqual({ kind: "answer", p: 0.1 });
    expect(readAsk(answers(0.7, 0.99, 0.1))).toEqual({ kind: "answer", p: 0.7 });
  });

  it("labels probabilities, with an honest middle band", () => {
    expect(answerLabel(0.9).text).toBe("Yes");
    expect(answerLabel(0.5).text).toMatch(/Sort of/);
    expect(answerLabel(0.05).text).toBe("No");
  });
});

describe("tokens", () => {
  it("round-trip and reject tampering", () => {
    const s = { name: "kite", aliases: [], category: "objects" as const };
    const t = seal(s);
    expect(t).not.toContain("kite");
    expect(open(t)).toEqual(s);
    expect(open(t.slice(0, -2) + (t.endsWith("A") ? "BB" : "AA"))).toBeNull();
    expect(open("nope")).toBeNull();
    expect(open(42)).toBeNull();
  });
});

describe("POST /api/secret", () => {
  afterEach(() => vi.unstubAllEnvs());
  const post = async (body: unknown) => {
    const res = await POST(new Request("http://x/api/secret", { method: "POST", body: JSON.stringify(body) }));
    return { status: res.status, json: await res.json() };
  };

  it("starts a game without revealing the secret", async () => {
    const { json } = await post({ action: "new", category: "animals", level: "easy" });
    expect(json.category).toBe("animals");
    expect(SECRETS.some((s) => JSON.stringify(json).includes(`"${s.name}"`))).toBe(false);
    expect(open(json.token)?.category).toBe("animals");
  });

  it("party mode seals the friend's secret", async () => {
    const { json } = await post({ action: "new", custom: " a rubber duck ", category: "objects" });
    expect(open(json.token)).toEqual({ name: "a rubber duck", aliases: [], category: "objects" });
    expect((await post({ action: "new", custom: "" })).status).toBe(400);
    expect((await post({ action: "new", custom: "x", category: "planets" })).status).toBe(400);
  });

  it("answers questions from the mock without leaking the secret", async () => {
    vi.stubEnv("JEV_PROVIDER", "mock");
    const token = seal({ name: "giraffe", aliases: [], category: "animals" });
    const { json } = await post({ action: "ask", token, question: "Does it have stripes?" });
    expect(["answer", "not-yes-no", "solved"]).toContain(json.result.kind);
    if (json.result.kind !== "solved") expect(JSON.stringify(json)).not.toContain("giraffe");
  });

  it("accepts exact guesses without calling Jev, and reveals on request", async () => {
    vi.stubEnv("JEV_PROVIDER", "typesafe");
    vi.stubEnv("TYPESAFE_API_KEY", ""); // would fail if Jev were called
    const token = seal({ name: "hippopotamus", aliases: ["hippo"], category: "animals" });
    expect((await post({ action: "guess", token, guess: "Hippos" })).json).toEqual({ correct: true, secret: "hippopotamus" });
    expect((await post({ action: "reveal", token })).json).toEqual({ secret: "hippopotamus" });
  });

  it("rejects bad tokens, questions and actions", async () => {
    expect((await post({ action: "ask", token: "junk", question: "Is it big?" })).status).toBe(400);
    const token = seal({ name: "kite", aliases: [], category: "objects" });
    expect((await post({ action: "ask", token, question: " " })).status).toBe(400);
    expect((await post({ action: "dance", token })).status).toBe(400);
  });
});
