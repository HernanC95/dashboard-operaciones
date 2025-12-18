import { useMemo, useState } from "react";
import localidades from "../../constants/localidades.json";
import type { Localidad } from "../../interfaces/Localidad";

type Props = {
  value: Localidad | null;
  onChange: (value: Localidad | null) => void;
};

export default function LocalidadSelect({ value, onChange }: Props) {
  const [query, setQuery] = useState(value?.nombre ?? "");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 3) return [];

    return (localidades as Localidad[])
      .filter((l) => l.nombre.toLowerCase().includes(q))
      .slice(0, 25);
  }, [query]);

  return (
    <div className="relative">
      <input
        value={query}
        placeholder="Escribí al menos 3 letras…"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
      />

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {results.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(loc);
                setQuery(loc.nombre);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-slate-50"
            >
              <span className="text-sm font-semibold text-slate-800">
                {loc.nombre}
              </span>
              <span className="text-xs text-slate-400">{loc.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
