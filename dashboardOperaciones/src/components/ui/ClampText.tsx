import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  text: ReactNode;
  lines?: number; // default: 3
  className?: string; // estilos del texto
};

export default function ClampText({ text, lines = 3, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      if (expanded) {
        setIsClamped(false);
        return;
      }
      setIsClamped(el.scrollHeight > el.clientHeight + 1);
    };

    check();

    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded, text, lines]);

  return (
    <div>
      <div
        ref={ref}
        className={[
          "break-words whitespace-normal",
          expanded ? "" : `line-clamp-${lines}`,
          className,
        ].join(" ")}
      >
        {text}
      </div>

      {!expanded && isClamped && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          …ver más
        </button>
      )}

      {expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          ver menos
        </button>
      )}
    </div>
  );
}
