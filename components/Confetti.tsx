const COLORS = ["var(--accent)", "var(--gold)", "var(--good)", "var(--bad)"];

/** One burst of falling confetti. Remount (change `key`) to play it again. */
export function Confetti() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: 40 }, (_, i) => (
        <span
          key={i}
          className="confetti"
          style={{
            left: `${(i * 37) % 100}%`,
            background: COLORS[i % COLORS.length],
            animationDelay: `${(i % 10) * 0.06}s`,
            animationDuration: `${1.6 + (i % 5) * 0.25}s`,
          }}
        />
      ))}
    </div>
  );
}
