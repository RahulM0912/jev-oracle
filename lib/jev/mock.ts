import type { JevAnswer, JevQuestion, JevRequest, JevResponse } from "./types";

// Fake Jev answers with the same shape as the real API.
// Used when JEV_PROVIDER=mock so the UI can be built without spending credits.

export function hash(s: string): number {
  let h = 2166136261;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

const jitter = (n = 0.08) => (Math.random() - 0.5) * 2 * n;
const clamp01 = (x: number) => Math.max(0.01, Math.min(0.99, x));
const round2 = (x: number) => Math.round(x * 100) / 100;
const asText = (t: unknown) => (typeof t === "string" ? t : JSON.stringify(t));

/**
 * Options a real model would lean towards: the first `state.threats` list (in key order)
 * that names any of them. Lets games that send hints (tic-tac-toe) behave sensibly in mock mode.
 */
function favoured(state: JevRequest["state"], options: string[]): string[] {
  if (typeof state !== "object" || Array.isArray(state) || typeof state.threats !== "object" || !state.threats) return [];
  for (const list of Object.values(state.threats)) {
    const hits = Array.isArray(list) ? options.filter((o) => list.includes(o)) : [];
    if (hits.length) return hits;
  }
  return [];
}

function mockAnswer(key: string, req: JevRequest, q: JevQuestion): JevAnswer {
  const state = asText(req.state);
  if (q.type === "noul") {
    return { type: "noul", noul: round2(clamp01(hash(key + state) + jitter())) };
  }
  if (q.type === "choice") {
    const options = Object.keys(q.criteria);
    const boost = favoured(req.state, options);
    const raw = options.map((o) => Math.pow(hash(key + state + o) + 0.05 + Math.abs(jitter(0.05)), 3) + (boost.includes(o) ? 10 : 0));
    const sum = raw.reduce((a, b) => a + b, 0);
    const probabilities = Object.fromEntries(options.map((o, i) => [o, round2(raw[i] / sum)]));
    const choice = options[raw.indexOf(Math.max(...raw))];
    return { type: "choice", choice, confidence: round2(probabilities[choice] * 0.85), probabilities };
  }
  const levels = q.criteria.map((_, i) => i);
  const center = hash(key + state) * (levels.length - 1) + jitter(0.25);
  const weights = levels.map((i) => Math.exp(-Math.pow(i - center, 2)));
  const sum = weights.reduce((a, b) => a + b, 0);
  return {
    type: "score",
    score: round2(levels.reduce((a, i) => a + (i * weights[i]) / sum, 0)),
    confidence: round2(Math.max(...weights) / sum),
    legend: Object.fromEntries(q.criteria.map((c, i) => [String(i), asText(c)])),
    probabilities: Object.fromEntries(levels.map((i) => [String(i), round2(weights[i] / sum)])),
  };
}

export async function mockJev(req: JevRequest): Promise<JevResponse> {
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
  const state = asText(req.state);
  let tokens = 60 + state.length / 4;
  const answers: Record<string, JevAnswer> = {};
  for (const [key, q] of Object.entries(req.questions)) {
    tokens += 30 + asText(q.instructions).length / 4;
    answers[key] = mockAnswer(key, req, q);
  }
  return { model: "jev-mock", answers, usage: { input_tokens: Math.round(tokens), output_tokens: 40 } };
}
