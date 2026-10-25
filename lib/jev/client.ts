import "server-only";
import { mockJev } from "./mock";
import type { JevRequest, JevResponse } from "./types";

// The only file that touches TYPESAFE_API_KEY. Copy lib/jev/ into other projects as-is.

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const TIMEOUT_MS = 20_000;

export class JevError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function askJev(req: JevRequest): Promise<JevResponse> {
  const provider = process.env.JEV_PROVIDER ?? "typesafe";
  if (provider === "mock") return mockJev(req);
  if (provider !== "typesafe") throw new JevError(`Unknown JEV_PROVIDER "${provider}". Use "typesafe" or "mock".`, 500);

  const key = process.env.TYPESAFE_API_KEY;
  if (!key) throw new JevError("TYPESAFE_API_KEY is not set. Add it to .env.local, or set JEV_PROVIDER=mock.", 500);

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.JEV_MODEL ?? "jev-latest", ...req }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    throw new JevError(timedOut ? "Jev took too long to answer." : "Could not reach Jev.", 504);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`Jev API ${res.status}: ${body.slice(0, 500)}`);
    const message =
      res.status === 401 || res.status === 403 ? "Jev rejected the API key. Check TYPESAFE_API_KEY."
      : res.status === 402 ? "Out of Jev credits. Top up at console.typesafe.ai."
      : res.status === 429 ? "Too many requests to Jev. Wait a moment and try again."
      : `Jev returned an error (${res.status}).`;
    throw new JevError(message, 502);
  }

  return (await res.json()) as JevResponse;
}
