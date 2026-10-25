import type { Metadata } from "next";
import Link from "next/link";
import { TicTacToe } from "@/components/TicTacToe";

export const metadata: Metadata = { title: "Tic-Tac-Toe" };

export default function TicTacToePage() {
  return (
    <main>
      <Link href="/" className="mb-2 inline-flex items-center gap-1.5 py-2 text-muted hover:text-ink">
        ← All modes
      </Link>
      <div className="mb-1.5 flex items-center gap-3.5">
        <span className="text-4xl" aria-hidden="true">⭕</span>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Tic-Tac-Toe</h1>
      </div>
      <p className="mb-6 text-muted">
        You&apos;re X, Jev is O. Jev picks every move from the open squares, and code checks whether it spots wins and blocks.
      </p>
      <TicTacToe />
    </main>
  );
}
