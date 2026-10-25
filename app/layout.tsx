import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: { default: "Jev Oracle", template: "%s · Jev Oracle" },
  description: "Ask, rank and judge with TypeSafe's Jev decision model.",
};

// Applies the saved theme before paint so there is no light/dark flash.
const themeScript = `try{var t=localStorage.getItem("jev-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${dmSans.variable} ${fraunces.variable} antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans">
        <div className="mx-auto max-w-[960px] px-4 pb-16">
          <header className="flex items-center justify-between py-5">
            <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold">
              <span className="brand-mark size-8 rounded-full" aria-hidden="true" />
              Jev Oracle
            </Link>
            <ThemeToggle />
          </header>
          {children}
          <footer className="mt-12 text-center text-xs text-muted">Unofficial. Built on TypeSafe&apos;s Jev.</footer>
        </div>
      </body>
    </html>
  );
}
