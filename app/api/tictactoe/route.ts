import { LEVELS, type Level, buildMoveRequest, readMove, validateBoard } from "@/lib/games/tictactoe";
import { askJev, JevError } from "@/lib/jev/client";

// POST { board, level? } -> { move, confidence, probabilities, request, response }
// Jev plays O. The board is validated here so Jev only ever sees legal positions.
export async function POST(req: Request) {
  let body: { board?: unknown; level?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const check = validateBoard(body.board);
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 });
  const level = body.level ?? "easy";
  if (!LEVELS.includes(level as Level)) return Response.json({ error: `Level must be one of ${LEVELS.join(", ")}.` }, { status: 400 });

  const request = buildMoveRequest(check.board, { level: level as Level });
  try {
    const response = await askJev(request);
    const move = readMove(response);
    if (check.board[move.move]) return Response.json({ error: "Jev picked a taken square." }, { status: 502 });
    return Response.json({ ...move, request, response });
  } catch (e) {
    if (e instanceof JevError) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
