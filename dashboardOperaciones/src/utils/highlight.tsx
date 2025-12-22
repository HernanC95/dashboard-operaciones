import { type JSX } from "react";

export function highlightText(
  text: string,
  query: string
): Array<string | JSX.Element> {
  if (!query.trim()) return [text];

  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (!words.length) return [text];

  const regex = new RegExp(`(${words.join("|")})`, "gi");

  return text.split(regex).map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="rounded bg-yellow-200 font-semibold text-slate-900"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}
