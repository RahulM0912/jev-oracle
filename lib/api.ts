import type { Board, JevMove, Level } from "./games/tictactoe";
import type { Turn } from "./games/bouncer";
import type { AskResult, Hint, SecretLevel } from "./games/secret";
import type { JevRequest, JevResponse } from "./jev/types";
import type { ModeId, ModeInput } from "./modes";

export type JevResult = { request: JevRequest; response: JevResponse };

// Browser-side calls to our own API routes (never to TypeSafe directly).
async function post<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("Can't reach the server. Check your connection.");
  }
  const json = await res.json().catch(() => ({}));
  // 429 comes from the Vercel Firewall rate limit, before our route runs.
  if (res.status === 429) throw new Error("Whoa, slow down! Too many questions at once. Wait a minute and try again.");
  if (!res.ok) throw new Error(json.error ?? "The oracle is sleeping. Try again in a moment.");
  return json as T;
}

export const callJev = (mode: ModeId, input: ModeInput) => post<JevResult>("/api/jev", { mode, input });

export const callTicTacToe = (board: Board, level: Level) => post<JevMove & JevResult>("/api/tictactoe", { board, level });

export const callBouncer = (turn: Turn) => post<{ convinced: number } & JevResult>("/api/bouncer", turn);

export const secretApi = {
  start: (opts: { category: Hint; level?: SecretLevel; recent: string[] } | { custom: string; category: Hint }) =>
    post<{ token: string; category: Hint }>("/api/secret", { action: "new", ...opts }),
  ask: (token: string, question: string) =>
    post<{ result: AskResult; secret?: string } & JevResult>("/api/secret", { action: "ask", token, question }),
  guess: (token: string, guess: string) =>
    post<{ correct: boolean; secret?: string } & Partial<JevResult>>("/api/secret", { action: "guess", token, guess }),
  reveal: (token: string) => post<{ secret: string }>("/api/secret", { action: "reveal", token }),
};
