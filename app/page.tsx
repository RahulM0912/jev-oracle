import Link from "next/link";
import { GAMES, MODES } from "@/lib/modes";

const card = "relative rounded-2xl border border-line bg-surface p-5 text-left shadow-card";
const link = `${card} transition hover:-translate-y-0.5 hover:border-accent focus-visible:border-accent focus-visible:outline-none`;
const tag = "mt-3.5 inline-block rounded-full px-2 py-0.5 text-xs font-bold";
const grid = "grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4";

type Card = { id: string; emoji: string; title: string; description: string; answerType: string };

function CardBody({ m }: { m: Card }) {
  return (
    <>
      <span className="text-3xl" aria-hidden="true">{m.emoji}</span>
      <h3 className="mt-2.5 mb-1.5 font-display text-xl">{m.title}</h3>
      <p className="text-[15px] text-muted">{m.description}</p>
      <span className={`${tag} bg-accent-soft text-accent`}>{m.answerType}</span>
    </>
  );
}

export default function Home() {
  return (
    <main>
      <section className="pt-6 pb-8">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">Ask. Rank. Judge.</h1>
        <p className="mt-3 max-w-xl text-lg text-muted">
          Play a game or pick a mode. Jev doesn&apos;t write essays. It makes one clear decision and tells you how sure it is.
        </p>
      </section>

      <h2 className="mb-3 font-display text-2xl">Play</h2>
      <div className={grid}>
        {GAMES.map((m) => (
          <Link key={m.id} href={`/${m.id}`} className={link}>
            <CardBody m={m} />{" "}
            <span className={`${tag} bg-gold/15 text-gold`}>Game</span>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 mb-3 font-display text-2xl">Ask</h2>
      <div className={grid}>
        {MODES.map((m) => (
          <Link key={m.id} href={`/${m.id}`} className={link}>
            <CardBody m={m} />
          </Link>
        ))}
      </div>
    </main>
  );
}
