"use client";

import { useState } from "react";
import type { OptionRules } from "@/lib/modes";

type Props = {
  rules: OptionRules;
  options: Record<string, string[]>;
  onChange: (next: Record<string, string[]>) => void;
};

/** Chip editor for one or more groups of options. Single-group modes hide the group header. */
export function OptionsEditor({ rules, options, onChange }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const single = Object.keys(options).length === 1;

  const remove = (group: string, i: number) => onChange({ ...options, [group]: options[group].filter((_, j) => j !== i) });

  function add(group: string) {
    const value = (drafts[group] ?? "").trim();
    if (!value || options[group].includes(value) || options[group].length >= rules.max) return;
    onChange({ ...options, [group]: [...options[group], value] });
    setDrafts({ ...drafts, [group]: "" });
  }

  return (
    <div className="mt-5">
      <span className="mb-1.5 block font-bold">{rules.title}</span>
      <p className="mb-2.5 text-sm text-muted">{rules.hint}</p>
      {Object.entries(options).map(([group, opts]) => (
        <div key={group} className="mt-4 border-t border-line pt-4 first-of-type:mt-0 first-of-type:border-t-0 first-of-type:pt-0">
          {!single && (
            <div className="flex items-baseline justify-between">
              <b>{group}</b>
              <span className="text-sm text-muted">{opts.length} options</span>
            </div>
          )}
          <div className={`flex flex-wrap gap-2 ${single ? "" : "mt-2.5"}`}>
            {opts.map((o, i) => (
              <span key={o} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas py-1 pr-1.5 pl-3 text-sm">
                {o}
                <button
                  type="button"
                  onClick={() => remove(group, i)}
                  aria-label={`Remove ${o}`}
                  className="size-5 cursor-pointer rounded-full bg-surface-2 leading-none hover:text-bad"
                >
                  ×
                </button>
              </span>
            ))}
            {opts.length < rules.max && (
              <input
                type="text"
                value={drafts[group] ?? ""}
                maxLength={rules.maxLen}
                onChange={(e) => setDrafts({ ...drafts, [group]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add(group);
                  }
                }}
                onBlur={() => add(group)}
                placeholder={single ? "+ type an option, press Enter" : "+ add option"}
                aria-label={`Add ${single ? "an" : group} option`}
                className={`${single ? "min-w-56 flex-1" : "w-32"} rounded-full border border-line bg-canvas px-2.5 py-1 text-sm focus:border-transparent focus:outline-2 focus:outline-accent`}
              />
            )}
          </div>
          {single && <p className="mt-2 text-xs text-muted">{opts.length}/{rules.max} options</p>}
        </div>
      ))}
    </div>
  );
}
