import type { JevRequest, JevResponse, NoulAnswer } from "../jev/types";

// Rules live in code; Jev only judges how convinced the bouncer is by each line.

export type Club = {
  name: string;
  emoji: string;
  vibe: string;
  bouncer: string;
  persona: string;
  /** Jev's "convinced" probability must reach this to get in. */
  bar: number;
};

export const CLUBS: Club[] = [
  {
    name: "The Rusty Anchor",
    emoji: "🍺",
    vibe: "A sticky-floored dive bar by the docks.",
    bouncer: "Big Sal",
    persona: "Big Sal, a bored, good-natured bouncer at a dive bar. Lets in anyone polite or mildly funny; turns away rude or creepy people.",
    bar: 0.55,
  },
  {
    name: "Neon Pulse",
    emoji: "🪩",
    vibe: "The loudest nightclub downtown. Queue around the block.",
    bouncer: "Dmitri",
    persona: "Dmitri, a strict nightclub bouncer who has heard every cliché. Name-dropping, fake guest lists and bribes annoy him; real charm and wit work.",
    bar: 0.65,
  },
  {
    name: "The Velvet Rope",
    emoji: "🥂",
    vibe: "A members-only VIP lounge. Celebrities get turned away here.",
    bouncer: "Madame Noir",
    persona: "Madame Noir, a legendary VIP-lounge door host. Only a genuinely remarkable, confident and original line gets past her. Anything generic fails.",
    bar: 0.75,
  },
  {
    name: "The Vault",
    emoji: "🗝️",
    vibe: "A secret speakeasy nobody admits exists.",
    bouncer: "The Gatekeeper",
    persona: "The Gatekeeper, guardian of a secret speakeasy. Has heard every line ever spoken. Only something truly original, clever and surprising earns entry.",
    bar: 0.85,
  },
];

export const ATTEMPTS = 3;
export const MAX_LINE = 280;

export type Turn = { club: number; line: string; earlier: string[] };
type Validation = { ok: true; turn: Turn } | { ok: false; error: string };

export function validateTurn(raw: unknown): Validation {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "Missing turn." };
  const { club, line, earlier = [] } = raw as { club?: unknown; line?: unknown; earlier?: unknown };
  if (!Number.isInteger(club) || (club as number) < 0 || (club as number) >= CLUBS.length) return { ok: false, error: "Unknown club." };
  if (typeof line !== "string" || !line.trim()) return { ok: false, error: "Say something to the bouncer first." };
  if (line.length > MAX_LINE) return { ok: false, error: `Keep it under ${MAX_LINE} characters.` };
  if (!Array.isArray(earlier) || earlier.length >= ATTEMPTS || earlier.some((l) => typeof l !== "string" || l.length > MAX_LINE))
    return { ok: false, error: `Earlier lines must be a list of up to ${ATTEMPTS - 1} short strings.` };
  return { ok: true, turn: { club: club as number, line: line.trim(), earlier: earlier as string[] } };
}

/** Earlier rejected lines are sent so the bouncer remembers you and repeats don't work. */
export function buildBouncerRequest({ club, line, earlier }: Turn): JevRequest {
  const c = CLUBS[club];
  return {
    state: {
      venue: `${c.name}: ${c.vibe}`,
      bouncer: c.persona,
      lines_already_rejected_tonight: earlier,
      new_line: line,
    },
    questions: {
      let_in: {
        type: "noul",
        instructions:
          "Given this bouncer's personality, would they be convinced by the new line to let the person in? " +
          "They already rejected the earlier lines, so repeating or lightly rephrasing one should not help.",
      },
    },
  };
}

export const readConvinced = (res: JevResponse) => (res.answers.let_in as NoulAnswer).noul;

export type Reaction = { verdict: "in" | "close" | "no" | "never"; line: string };

const REACTIONS: Record<Reaction["verdict"], string[]> = {
  in: ["Alright. Get in.", "…Fine. You're in.", "Heh. Go on, then.", "Welcome inside."],
  close: ["Almost had me. Try again.", "Hmm. Keep talking.", "Closer. Not there yet."],
  no: ["Not buying it.", "Next.", "Nice try, pal.", "Step aside, please."],
  never: ["Are you serious right now?", "Absolutely not.", "Out of the line. Now."],
};

/** The bouncer's response to a line, judged against the club's bar. */
export function reaction(p: number, bar: number, attempt: number): Reaction {
  const verdict = p >= bar ? "in" : p >= bar - 0.15 ? "close" : p >= 0.25 ? "no" : "never";
  const options = REACTIONS[verdict];
  return { verdict, line: options[attempt % options.length] };
}
