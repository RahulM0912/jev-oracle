# Jev Oracle

Small Next.js app for trying out TypeSafe's **Jev** decision model. Pick a mode, ask something, get a typed decision.

**▶ Try it live: https://jev-oracle-ten.vercel.app**: no sign-up needed. Start with [Jev's Secret](https://jev-oracle-ten.vercel.app/secret), [Convince the Bouncer](https://jev-oracle-ten.vercel.app/bouncer) or [Tic-Tac-Toe](https://jev-oracle-ten.vercel.app/tictactoe). The live site answers with real Jev and is rate-limited to 30 requests per minute per visitor.

| Mode | Jev answer type |
|---|---|
| 🔮 Fortune Teller | `noul` (yes/no probability) |
| 🎱 Magic 8-Ball | `noul`, mapped to the 20 classic replies |
| 🧱 Stack Ranker | `choice` (probability per option, sorted) |
| ⚖️ Option Scorer | `score` per option (0–10) + `choice` for the single best pick |
| 🤖 AI-Style Meter | 5 × `noul` over the same text: overall + 4 style signals (composite scoring) |
| 🔥 Roast My Idea | `score` (4 criteria, 0–3 rubric) |
| 🚪 Convince the Bouncer *(game)* | `noul` per line; 4 clubs with rising bars, 3 tries each, rejected lines sent back so repeats fail |
| 🤫 Jev's Secret *(game)* | 3 × `noul` per question (answer, is it yes/no, does it name the secret) + 1 `noul` for fuzzy guesses; 250 hand-picked secrets or a friend's (party mode) |
| ⭕ Tic-Tac-Toe *(game)* | `choice` over empty squares; Easy = raw Jev, Hard = code-computed threat hints, Impossible = hints + only minimax-safe squares offered |

Every mode result has **Check consistency (ask 5×)** and **Show what was sent to Jev** for testing. Games keep score in `localStorage`; tic-tac-toe hides its report card behind **Show Jev's thinking**.

## Run

```bash
cp .env.example .env.local   # add TYPESAFE_API_KEY, set JEV_PROVIDER=typesafe
npm install
npm run dev                  # http://localhost:3000  (or: npx next dev -p 3100)
npm test                     # unit + API route tests (no key needed)
```

Set `JEV_PROVIDER=mock` to build the UI without spending credits.

## Deploy

Hosted on Vercel at https://jev-oracle-ten.vercel.app. Every push to `main` deploys production; other branches get preview deployments.

| Setting | Production | Preview |
|---|---|---|
| `JEV_PROVIDER` | `typesafe` | `mock` (no credits spent) |
| `TYPESAFE_API_KEY` | set (sensitive) | not set |
| `GAME_SECRET` | optional; derived from the API key when unset | |

A Vercel Firewall rule rate-limits `POST /api/*` to 30 requests per minute per IP, so a public URL can't drain the Jev credits. Blocked requests return 429 and never reach Jev. Environment variable changes only apply to new deployments, so redeploy after changing one.

## Layout

```
lib/jev/        Jev client (server-only, holds the key), types, mock provider  ← reusable in other projects
lib/modes/      one file per mode: prompts + result helpers, plain TypeScript
app/api/jev/    POST { mode, input } → validates, builds prompts, calls Jev
lib/games/      tic-tac-toe (rules, minimax, move review), bouncer (clubs, reactions), secret (prompts, matching);
                secrets.ts = the secret list and secretToken.ts = AES-GCM tokens, both server-only
app/api/tictactoe/  POST { board, level } → Jev picks O's move
app/api/bouncer/    POST { club, line, earlier } → how convinced the bouncer is
app/api/secret/     POST { action: new | ask | guess | reveal } → secret travels as an encrypted token
app/[mode]/     one page per mode; app/bouncer/, app/secret/ and app/tictactoe/ for games
components/     ModeRunner, MagicBall, OptionsEditor, Results, Consistency, TicTacToe, Bouncer, SecretGame, Confetti
design/demo.html  original static mockup
```

## Add a mode

1. Create `lib/modes/<name>.ts` exporting a `ModeDef` (see `fortune.ts` for the smallest one).
2. Add it to `MODES` in `lib/modes/index.ts` and its id to `ModeId` in `lib/modes/types.ts`.
3. Add a result view branch in `components/Results.tsx`.

## Reuse Jev in another project

Copy `lib/jev/` and call it from server code only:

```ts
import { askJev } from "./lib/jev/client";

const res = await askJev({
  state: "Customer email: my payouts failed for 3 days",
  questions: { urgent: { type: "noul", instructions: "Is this urgent?" } },
});
res.answers.urgent; // { type: "noul", noul: 0.93 }
```
