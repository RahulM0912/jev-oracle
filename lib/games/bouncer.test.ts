import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/bouncer/route";
import { ATTEMPTS, CLUBS, buildBouncerRequest, reaction, validateTurn } from "./bouncer";

describe("clubs", () => {
  it("get pickier", () => {
    const bars = CLUBS.map((c) => c.bar);
    expect(bars).toEqual([...bars].sort((a, b) => a - b));
    expect(new Set(bars).size).toBe(bars.length);
  });
});

describe("validateTurn", () => {
  it("accepts a turn and trims the line", () => {
    expect(validateTurn({ club: 1, line: "  hi  ", earlier: ["yo"] })).toEqual({ ok: true, turn: { club: 1, line: "hi", earlier: ["yo"] } });
    expect(validateTurn({ club: 0, line: "hi" })).toEqual({ ok: true, turn: { club: 0, line: "hi", earlier: [] } });
  });

  it("rejects bad clubs, lines and histories", () => {
    expect(validateTurn(null).ok).toBe(false);
    expect(validateTurn({ club: CLUBS.length, line: "hi" }).ok).toBe(false);
    expect(validateTurn({ club: 0.5, line: "hi" }).ok).toBe(false);
    expect(validateTurn({ club: 0, line: "  " }).ok).toBe(false);
    expect(validateTurn({ club: 0, line: "x".repeat(281) }).ok).toBe(false);
    expect(validateTurn({ club: 0, line: "hi", earlier: Array(ATTEMPTS).fill("a") }).ok).toBe(false);
    expect(validateTurn({ club: 0, line: "hi", earlier: [42] }).ok).toBe(false);
  });
});

describe("buildBouncerRequest", () => {
  it("sends the club's bouncer and the lines already rejected", () => {
    const req = buildBouncerRequest({ club: 2, line: "I own the building", earlier: ["I'm on the list"] });
    expect(req.state).toMatchObject({
      bouncer: expect.stringContaining("Madame Noir"),
      lines_already_rejected_tonight: ["I'm on the list"],
      new_line: "I own the building",
    });
    expect(req.questions.let_in.type).toBe("noul");
  });
});

describe("reaction", () => {
  it("is judged against the club's bar", () => {
    expect(reaction(0.7, 0.65, 0).verdict).toBe("in");
    expect(reaction(0.7, 0.85, 0).verdict).toBe("close");
    expect(reaction(0.4, 0.85, 0).verdict).toBe("no");
    expect(reaction(0.1, 0.55, 0).verdict).toBe("never");
  });
});

describe("POST /api/bouncer", () => {
  afterEach(() => vi.unstubAllEnvs());
  const post = (body: unknown) => POST(new Request("http://x/api/bouncer", { method: "POST", body: JSON.stringify(body) }));

  it("rejects invalid turns", async () => {
    expect((await post({ club: 9, line: "hi" })).status).toBe(400);
  });

  it("returns how convinced the bouncer is", async () => {
    vi.stubEnv("JEV_PROVIDER", "mock");
    const json = await (await post({ club: 0, line: "Evening!" })).json();
    expect(json.convinced).toBeGreaterThan(0);
    expect(json.convinced).toBeLessThan(1);
    expect(json.request.state.new_line).toBe("Evening!");
  });
});
