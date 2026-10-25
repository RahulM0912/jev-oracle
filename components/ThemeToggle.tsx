"use client";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const isDark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = isDark ? "light" : "dark";
    try {
      localStorage.setItem("jev-theme", root.dataset.theme);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light or dark theme"
      className="cursor-pointer rounded-full border border-line bg-surface px-3 py-1.5 text-sm hover:border-accent"
    >
      ◐ Theme
    </button>
  );
}
