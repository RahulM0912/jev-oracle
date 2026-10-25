import type { Metadata } from "next";
import Link from "next/link";
import { Bouncer } from "@/components/Bouncer";
import { ATTEMPTS, CLUBS } from "@/lib/games/bouncer";

export const metadata: Metadata = { title: "Convince the Bouncer" };

export default function BouncerPage() {
  return (
    <main>
      <Link href="/" className="mb-2 inline-flex items-center gap-1.5 py-2 text-muted hover:text-ink">
        ← All modes
      </Link>
      <div className="mb-1.5 flex items-center gap-3.5">
        <span className="text-4xl" aria-hidden="true">🚪</span>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Convince the Bouncer</h1>
      </div>
      <p className="mb-6 text-muted">
        {CLUBS.length} clubs, each pickier than the last. You get {ATTEMPTS} tries per door, and the bouncer remembers every line.
        Jev decides how convinced they are.
      </p>
      <Bouncer />
    </main>
  );
}
