import { buildBouncerRequest, readConvinced, validateTurn } from "@/lib/games/bouncer";
import { askJev, JevError } from "@/lib/jev/client";

// POST { club, line, earlier? } -> { convinced, request, response }
// The club's bar and the attempt limit are enforced in the browser; Jev only judges the line.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const check = validateTurn(body);
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 });

  const request = buildBouncerRequest(check.turn);
  try {
    const response = await askJev(request);
    return Response.json({ convinced: readConvinced(response), request, response });
  } catch (e) {
    if (e instanceof JevError) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
