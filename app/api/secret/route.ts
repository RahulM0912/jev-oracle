import {
  GUESS_BAR,
  MAX_QUESTION,
  MAX_SECRET,
  buildAskRequest,
  buildGuessRequest,
  isHint,
  matchesSecret,
  pickSecret,
  readAsk,
  readGuess,
} from "@/lib/games/secret";
import { SECRETS } from "@/lib/games/secrets";
import { open, seal } from "@/lib/games/secretToken";
import { askJev, JevError } from "@/lib/jev/client";
import type { JevRequest } from "@/lib/jev/types";

// POST { action, ... }. The secret travels as an encrypted token; the browser never sees it until the game ends.
//   new    { category?, level?, recent? } or { custom, category? } -> { token, category }
//   ask    { token, question } -> { result, secret?, request, response }
//   guess  { token, guess }    -> { correct, secret?, request?, response? }
//   reveal { token }           -> { secret }

const bad = (error: string) => Response.json({ error }, { status: 400 });
/** The request is echoed back for the "what was sent to Jev" panel, minus the secret itself. */
const redact = (request: JevRequest): JevRequest => ({ ...request, state: { ...(request.state as object), secret_thing: "(hidden)" } });
const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (typeof body !== "object" || body === null) throw new Error();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.action === "new") {
    const category = body.category ?? "anything";
    if (!isHint(category)) return bad("Unknown category.");
    if (body.custom !== undefined) {
      const name = text(body.custom, MAX_SECRET);
      if (!name) return bad(`Type a secret of 1–${MAX_SECRET} characters.`);
      return Response.json({ token: seal({ name, aliases: [], category }), category });
    }
    const level = body.level === "easy" || body.level === "hard" ? body.level : undefined;
    const recent = Array.isArray(body.recent) ? body.recent.filter((r): r is string => typeof r === "string").slice(-50) : [];
    const { name, aliases } = pickSecret(SECRETS, { category, level, recent });
    return Response.json({ token: seal({ name, aliases, category }), category });
  }

  const secret = open(body.token);
  if (!secret) return bad("This game has expired. Start a new one.");

  if (body.action === "reveal") return Response.json({ secret: secret.name });

  try {
    if (body.action === "ask") {
      const question = text(body.question, MAX_QUESTION);
      if (!question) return bad(`Ask a question of 1–${MAX_QUESTION} characters.`);
      const request = buildAskRequest(secret, question);
      const response = await askJev(request);
      const result = readAsk(response);
      return Response.json({ result, ...(result.kind === "solved" && { secret: secret.name }), request: redact(request), response });
    }

    if (body.action === "guess") {
      const guess = text(body.guess, MAX_SECRET);
      if (!guess) return bad("Type a guess first.");
      if (matchesSecret(secret, guess)) return Response.json({ correct: true, secret: secret.name });
      const request = buildGuessRequest(secret, guess);
      const response = await askJev(request);
      const correct = readGuess(response) >= GUESS_BAR;
      return Response.json({ correct, ...(correct && { secret: secret.name }), request: redact(request), response });
    }
  } catch (e) {
    if (e instanceof JevError) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }

  return bad("Unknown action.");
}
