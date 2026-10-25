import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/jev", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/jev", () => {
  it("rejects bad JSON, unknown modes and invalid input", async () => {
    expect((await post("{nope")).status).toBe(400);
    expect((await post({ mode: "hack", input: { text: "hi" } })).status).toBe(400);
    const res = await post({ mode: "fortune", input: { text: "" } });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Type something first." });
  });

  it("answers from the mock provider", async () => {
    vi.stubEnv("JEV_PROVIDER", "mock");
    const res = await post({ mode: "fortune", input: { text: "Will it rain?" } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.request.questions.answer.type).toBe("noul");
    expect(json.response.answers.answer.noul).toBeGreaterThan(0);
  });

  it("explains a missing API key", async () => {
    vi.stubEnv("JEV_PROVIDER", "typesafe");
    vi.stubEnv("TYPESAFE_API_KEY", "");
    const res = await post({ mode: "fortune", input: { text: "Will it rain?" } });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/TYPESAFE_API_KEY/);
  });

  it("sends the key server-side and maps upstream errors", async () => {
    vi.stubEnv("JEV_PROVIDER", "typesafe");
    vi.stubEnv("TYPESAFE_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response("nope", { status: 402 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await post({ mode: "fortune", input: { text: "Will it rain?" } });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/credits/);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(init.headers.Authorization).toBe("Bearer test-key");
    expect(JSON.parse(init.body)).toMatchObject({ model: "jev-latest", questions: { answer: { type: "noul" } } });
  });
});
