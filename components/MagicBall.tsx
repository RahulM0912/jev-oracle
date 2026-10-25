type Props = { shaking: boolean; answer: string | null };

/** Submit button shaped like an 8-Ball. Shows "8" until an answer arrives. */
export function MagicBall({ shaking, answer }: Props) {
  return (
    <div className="pt-2 pb-5">
      <button
        type="submit"
        disabled={shaking}
        aria-label="Shake the ball"
        className={`ball relative mx-auto grid size-[220px] cursor-pointer place-items-center rounded-full border-0 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-progress ${shaking ? "shaking" : ""}`}
      >
        {answer && !shaking ? (
          <span className="ball-window grid size-[118px] place-items-center rounded-full">
            <span
              key={answer}
              className="ball-tri mt-2 flex h-[88px] w-[100px] items-start justify-center px-4 pt-3.5 text-center text-[0.62rem] leading-tight font-bold tracking-wide text-[#e8ecff] uppercase"
            >
              <span className="max-w-16">{answer}</span>
            </span>
          </span>
        ) : (
          <span className="grid size-24 place-items-center rounded-full bg-white text-[58px] leading-none font-bold text-black">8</span>
        )}
      </button>
      <p className="mt-2.5 text-center text-sm text-muted" aria-live="polite">
        {shaking ? "Shaking…" : answer ? `The ball says: ${answer}` : "Tap the ball to shake it"}
      </p>
    </div>
  );
}
