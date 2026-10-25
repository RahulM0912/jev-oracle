import type { Metadata } from "next";
import Link from "next/link";
import { SecretGame } from "@/components/SecretGame";
import { MAX_QUESTIONS } from "@/lib/games/secret";

export const metadata: Metadata = { title: "Jev's Secret" };

export default function SecretPage() {
  return (
    <main>
      <Link href="/" className="mb-2 inline-flex items-center gap-1.5 py-2 text-muted hover:text-ink">
        ← All modes
      </Link>
      <div className="mb-1.5 flex items-center gap-3.5">
        <span className="text-4xl" aria-hidden="true">🤫</span>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Jev&apos;s Secret</h1>
      </div>
      <p className="mb-6 text-muted">
        Jev is thinking of something. Ask up to {MAX_QUESTIONS} yes/no questions to work out what it is, or let a friend pick the secret in party mode.
      </p>
      <SecretGame />
    </main>
  );
}
