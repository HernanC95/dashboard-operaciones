// src/components/weeks/WeeksGrid.tsx
import { useMemo, useState } from "react";
import Modal from "../modal/Modal";
import TicketCard from "../../components/TicketCard/TicketCard";
import type { Ticket } from "../../interfaces/Ticket";
import {
  getISOWeek,
  getISOWeeksInYear,
  getISOWeekStartEnd,
} from "../../utils/isoWeek";
import { apiTicketToTicket } from "../../services/tickets.adapters";
import { api } from "../../services/api";

type Props = {
  now: Date; // para marcar semana activa y limitar futuro
};

type FilterKind = "ALL" | "INGRESO" | "Z15" | "NOTICIA";
type FilterVariant = "ALL" | "INGRESO" | "Z15" | "NOTICIA";

function toErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Error al cargar tickets";
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYYYYMMDD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function stylesByVariant(variant: FilterVariant) {
  switch (variant) {
    case "INGRESO":
      return {
        activeBtn: "border-blue-700 bg-blue-700 text-white",
        idleBtn:
          "border-blue-200 bg-white text-blue-800 hover:border-blue-400 hover:bg-blue-50",
        badgeActive: "bg-white/20 text-white",
        badgeIdle: "bg-blue-50 text-blue-800 border border-blue-200",
      };
    case "Z15":
      return {
        activeBtn: "border-red-700 bg-red-700 text-white",
        idleBtn:
          "border-red-200 bg-white text-red-800 hover:border-red-400 hover:bg-red-50",
        badgeActive: "bg-white/20 text-white",
        badgeIdle: "bg-red-50 text-red-800 border border-red-200",
      };
    case "NOTICIA":
      return {
        activeBtn: "border-purple-700 bg-purple-700 text-white",
        idleBtn:
          "border-purple-200 bg-white text-purple-800 hover:border-purple-400 hover:bg-purple-50",
        badgeActive: "bg-white/20 text-white",
        badgeIdle: "bg-purple-50 text-purple-800 border border-purple-200",
      };
    case "ALL":
    default:
      return {
        activeBtn: "border-slate-900 bg-slate-900 text-white",
        idleBtn:
          "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
        badgeActive: "bg-white/20 text-white",
        badgeIdle: "bg-slate-100 text-slate-700",
      };
  }
}

function FilterButton({
  active,
  label,
  count,
  variant,
  disabled,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  variant: FilterVariant;
  disabled?: boolean;
  onClick: () => void;
}) {
  const isDisabled = Boolean(disabled);
  const s = stylesByVariant(variant);

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      className={[
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-extrabold",
        "transition-all duration-200 ease-out",
        isDisabled
          ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
          : active
            ? [s.activeBtn, "shadow-sm"].join(" ")
            : [
                s.idleBtn,
                "hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-md",
              ].join(" "),
      ].join(" ")}
    >
      <span>{label}</span>

      <span
        className={[
          "rounded-full px-2 py-0.5 text-xs font-bold",
          isDisabled
            ? "bg-white text-slate-300"
            : active
              ? s.badgeActive
              : s.badgeIdle,
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

export default function WeeksGrid({ now }: Props) {
  const currentISO = useMemo(() => getISOWeek(now), [now]);
  const currentYear = currentISO.year;
  const currentWeek = currentISO.week;

  const [year, setYear] = useState(currentYear);

  const totalWeeks = useMemo(() => getISOWeeksInYear(year), [year]);
  const weeks = useMemo(
    () => Array.from({ length: totalWeeks }, (_, i) => i + 1),
    [totalWeeks],
  );

  const [open, setOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKind>("ALL");

  const activeWeek = year === currentYear ? currentWeek : null;

  const canPrevYear = year > 2000;
  const canNextYear = year < currentYear;

  function isFutureWeek(week: number) {
    if (year > currentYear) return true;
    if (year === currentYear) return week > currentWeek;
    return false;
  }

  const counts = useMemo(() => {
    const all = tickets.length;
    const ingresos = tickets.filter((t) => t.ticketKind === "INGRESO").length;
    const z15 = tickets.filter((t) => t.ticketKind === "Z15").length;
    const noticias = tickets.filter((t) => t.ticketKind === "NOTICIA").length;
    return { all, ingresos, z15, noticias };
  }, [tickets]);

  const visibleTickets = useMemo(() => {
    if (filter === "ALL") return tickets;
    return tickets.filter((t) => t.ticketKind === filter);
  }, [tickets, filter]);

  async function fetchWeekTickets(week: number) {
    if (isFutureWeek(week)) return;

    const baseRange = getISOWeekStartEnd(year, week);
    const isCurrentSelected = year === currentYear && week === currentWeek;

    const from = baseRange.from;
    const to = isCurrentSelected ? toYYYYMMDD(now) : baseRange.to;

    setSelectedWeek(week);
    setRange({ from, to });
    setOpen(true);

    setFilter("ALL");
    setLoading(true);
    setError(null);
    setTickets([]);

    try {
      const data: unknown = await api.get(
        `/tickets/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(
          to,
        )}`,
      );

      if (!Array.isArray(data)) {
        throw new Error(
          `Respuesta inesperada desde /tickets/range (no es array): ${JSON.stringify(
            data,
          ).slice(0, 200)}`,
        );
      }

      const mapped = data.map(apiTicketToTicket);
      setTickets(mapped);
    } catch (e: unknown) {
      setError(toErrorMessage(e));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-slate-900">
            Semanas del año
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Click en una semana para ver los tickets de ese rango.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canPrevYear}
            onClick={() => setYear((y) => y - 1)}
            className={[
              "rounded-lg border px-3 py-2 text-sm font-bold",
              canPrevYear
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed",
            ].join(" ")}
            title="Año anterior"
          >
            ←
          </button>

          <div className="text-sm font-extrabold text-slate-900">{year}</div>

          <button
            type="button"
            disabled={!canNextYear}
            onClick={() => setYear((y) => y + 1)}
            className={[
              "rounded-lg border px-3 py-2 text-sm font-bold",
              canNextYear
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed",
            ].join(" ")}
            title="Año siguiente"
          >
            →
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-13 gap-2">
        {weeks.map((w) => {
          const isActive = activeWeek === w;
          const disabled = isFutureWeek(w);

          return (
            <button
              key={w}
              type="button"
              disabled={disabled}
              onClick={() => fetchWeekTickets(w)}
              className={[
                "relative rounded-xl border px-2 py-2 text-sm font-extrabold",
                "transition-all duration-200 ease-out",
                disabled
                  ? "border-slate-100 bg-slate-100 text-slate-300 cursor-not-allowed"
                  : isActive
                    ? [
                        "border-blue-700 bg-blue-700 text-white",
                        "shadow-md",
                        "hover:bg-blue-600 hover:shadow-lg",
                        "hover:scale-[1.03]",
                      ].join(" ")
                    : [
                        "border-slate-200 bg-white text-slate-800",
                        "hover:-translate-y-0.5",
                        "hover:scale-[1.05]",
                        "hover:shadow-lg",
                        "hover:border-blue-400",
                        "hover:bg-blue-50",
                      ].join(" "),
              ].join(" ")}
              title={
                disabled
                  ? `Semana ${w} (futura)`
                  : isActive
                    ? `Semana ${w} (actual)`
                    : `Semana ${w}`
              }
            >
              {w}
            </button>
          );
        })}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Semana ${selectedWeek ?? ""}`}
        maxWidthClassName="max-w-[900px]"
      >
        {range ? (
          <div className="mb-3 text-sm text-slate-600">
            Rango: <span className="font-semibold">{range.from}</span> →{" "}
            <span className="font-semibold">{range.to}</span>
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap gap-2">
          <FilterButton
            active={filter === "ALL"}
            variant="ALL"
            label="TODOS"
            count={counts.all}
            onClick={() => setFilter("ALL")}
          />

          <FilterButton
            active={filter === "INGRESO"}
            variant="INGRESO"
            label="INGRESOS"
            count={counts.ingresos}
            onClick={() => setFilter("INGRESO")}
          />

          <FilterButton
            active={filter === "Z15"}
            variant="Z15"
            label="Z15"
            count={counts.z15}
            onClick={() => setFilter("Z15")}
          />

          <FilterButton
            active={filter === "NOTICIA"}
            variant="NOTICIA"
            label="NOTICIAS"
            count={counts.noticias}
            onClick={() => setFilter("NOTICIA")}
          />
        </div>

        {error ? (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-slate-600">Cargando tickets…</div>
        ) : visibleTickets.length === 0 ? (
          <div className="text-sm text-slate-600">
            No hay tickets para ese filtro en ese rango.
          </div>
        ) : (
          <div className="space-y-2">
            {visibleTickets.map((t) => (
              <TicketCard key={t.id} ticket={t} />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
