import { askJev, JevError } from "@/lib/jev/client";
import { getMode, validateInput } from "@/lib/modes";

// POST { mode, input } -> { request, response }
// The browser only sends the mode name and what the user typed; prompts are built here.
export async function POST(req: Request) {
  let body: { mode?: unknown; input?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode = typeof body.mode === "string" ? getMode(body.mode) : undefined;
  if (!mode) return Response.json({ error: "Unknown mode." }, { status: 400 });

  const check = validateInput(mode.id, body.input);
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 });

  const request = mode.build(check.input);
  try {
    const response = await askJev(request);
    return Response.json({ request, response });
  } catch (e) {
    if (e instanceof JevError) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
