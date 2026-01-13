import { useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import RightActions from "../../components/header/RightActions";
import PendingPanel from "../../components/PendingPanel/PendingPanel";
import TicketsList from "../../components/TicketsList/TicketsList";
import NewTicketModal from "../../components/tickets/NewTicketModal";
import CloseTicketModal from "../../components/tickets/CloseTicketModal";
import useNow from "../../hooks/useNow";
import useModal from "../../hooks/useModal";
import useTickets from "../../hooks/useTickets";

import { formatDayHeaderAR, formatYearDay } from "../../utils/date";
import type { Ticket } from "../../interfaces/Ticket";
import { TicketStatus } from "../../interfaces/enums";

function normalizeText(v: unknown) {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function matchesQuery(haystack: string, query: string) {
  const q = normalizeText(query).trim();
  if (!q) return true;

  const words = q.split(/\s+/).filter(Boolean);
  const hay = normalizeText(haystack);

  // AND: todas las palabras deben aparecer
  return words.every((w) => hay.includes(w));
}

function getCloseDescription(ticket: Ticket): string {
  const rootMeta = (ticket.meta ?? {}) as Record<string, unknown>;
  const processMeta = (ticket.process?.meta ?? {}) as Record<string, unknown>;

  const fromProcess =
    typeof processMeta.closeDescription === "string"
      ? processMeta.closeDescription
      : "";

  const fromRoot =
    typeof rootMeta.closeDescription === "string"
      ? rootMeta.closeDescription
      : "";

  return (fromProcess || fromRoot || "").trim();
}

export default function DashboardPage() {
  const now = useNow(1000); // actualiza cada 1s

  const yearDay = useMemo(() => formatYearDay(now), [now]);
  const dayHeader = useMemo(() => formatDayHeaderAR(now), [now]);

  const clock = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
      now.getSeconds()
    )}`;
  }, [now]);

  const { tickets, counts, createTicket, closeTicket } = useTickets();

  // ✅ modal
  const newTicketModal = useModal(false);
  const closeTicketModal = useModal(false);
  const [ticketToClose, setTicketToClose] = useState<Ticket | null>(null);

  // ✅ búsqueda tickets cerrados
  const [closedQuery, setClosedQuery] = useState("");

  const leftTickets = useMemo(() => {
    // 1) solo cerrados con closedAt
    const base = tickets
      .filter((t) => t.status === TicketStatus.CERRADO && !!t.audit.closedAt)
      .slice()
      .sort((a, b) => {
        // 2) orden por hora de cierre DESC (más nuevo arriba)
        const ta = a.audit.closedAt?.getTime() ?? 0;
        const tb = b.audit.closedAt?.getTime() ?? 0;
        return tb - ta;
      });

    const q = closedQuery.trim();
    if (!q) return base;

    // 3) filtro por details + closeDescription (case-insensitive + acentos)
    return base.filter((t) => {
      const closeDesc = getCloseDescription(t);

      const searchable = [t.details ?? "", closeDesc]
        .map((s) => String(s ?? "").trim())
        .filter(Boolean)
        .join(" ");

      return matchesQuery(searchable, q);
    });
  }, [tickets, closedQuery]);

  return (
    <DashboardLayout
      left={
        <div className="space-y-5">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900">
              DEPARTAMENTO OPERACIONES
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Sistema de Registro Diario
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="text-sm font-bold uppercase tracking-wide text-blue-700">
              {dayHeader}
            </div>

            <div className="text-sm font-bold uppercase tracking-wide text-blue-700 font-mono">
              {clock} HS
            </div>

            <div className="text-sm font-bold uppercase tracking-wide text-blue-700">
              AÑO/DÍA: {yearDay}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-blue-500">
              <div className="text-sm font-semibold text-slate-500">
                Total Registros
              </div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">
                {counts.total}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-orange-500">
              <div className="text-sm font-semibold text-slate-500">
                Abiertos Hoy
              </div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">
                {counts.abiertos}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-green-500">
              <div className="text-sm font-semibold text-slate-500">
                Cerrados Hoy
              </div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">
                {counts.cerrados}
              </div>
            </div>
          </div>

          {/* ✅ Buscador arriba del listado */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-slate-900">
                  Buscar en tickets cerrados
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Filtra por palabras en descripción / detalle / cierre.
                </div>
              </div>

              {closedQuery.trim() ? (
                <button
                  type="button"
                  onClick={() => setClosedQuery("")}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Limpiar
                </button>
              ) : null}
            </div>

            <input
              value={closedQuery}
              onChange={(e) => setClosedQuery(e.target.value)}
              placeholder='Ej: "syslog error"'
              className="mt-3 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
            />

            <div className="mt-2 text-xs text-slate-500">
              {closedQuery.trim()
                ? `${leftTickets.length} resultado(s)`
                : `${leftTickets.length} ticket(s)`}
            </div>
          </div>

          <div className="text-lg font-extrabold text-slate-900">
            Tickets Cerrados
          </div>

          <TicketsList tickets={leftTickets} searchQuery={closedQuery} />
        </div>
      }
      right={
        <div className="space-y-4">
          <RightActions onNew={newTicketModal.open} />
          <PendingPanel
            tickets={tickets}
            onRequestClose={(t) => {
              setTicketToClose(t);
              closeTicketModal.open();
            }}
          />

          {closeTicketModal.isOpen && ticketToClose ? (
            <CloseTicketModal
              key={ticketToClose.id}
              open={closeTicketModal.isOpen}
              ticket={ticketToClose}
              onClose={() => {
                closeTicketModal.close();
                setTicketToClose(null);
              }}
              onConfirm={(payload) => closeTicket(payload)}
            />
          ) : null}

          <NewTicketModal
            open={newTicketModal.isOpen}
            onClose={newTicketModal.close}
            onCreate={(payload) => createTicket(payload)}
          />
        </div>
      }
    />
  );
}
