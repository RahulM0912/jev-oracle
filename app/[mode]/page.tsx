import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModeRunner } from "@/components/ModeRunner";
import { MODES, getMode } from "@/lib/modes";

export const generateStaticParams = () => MODES.map((m) => ({ mode: m.id }));

export async function generateMetadata({ params }: PageProps<"/[mode]">): Promise<Metadata> {
  const mode = getMode((await params).mode);
  return { title: mode?.title ?? "Not found" };
}

export default async function ModePage({ params }: PageProps<"/[mode]">) {
  const mode = getMode((await params).mode);
  if (!mode) notFound();

  return (
    <main>
      <Link href="/" className="mb-2 inline-flex items-center gap-1.5 py-2 text-muted hover:text-ink">
        ← All modes
      </Link>
      <div className="mb-1.5 flex items-center gap-3.5">
        <span className="text-4xl" aria-hidden="true">{mode.emoji}</span>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{mode.title}</h1>
      </div>
      <p className="mb-6 text-muted">{mode.lead}</p>
      <ModeRunner modeId={mode.id} />
    </main>
  );
}
