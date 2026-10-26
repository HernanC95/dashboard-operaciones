// src/pages/dashboard/DashboardPage.tsx
import { useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import RightActions from "../../components/header/RightActions";
import PendingPanel from "../../components/PendingPanel/PendingPanel";
import TicketsList from "../../components/TicketsList/TicketsList";
import NewTicketModal from "../../components/tickets/NewTicketModal";
import CloseTicketModal from "../../components/tickets/CloseTicketModal";
import ArchiveTicketModal from "../../components/tickets/ArchiveTicketModal";
import EditTicketModal from "../../components/tickets/EditTicketModal";
import WeeksGrid from "../../components/weeks/WeeksGrid";
import useNow from "../../hooks/useNow";
import useModal from "../../hooks/useModal";
import useTickets from "../../hooks/useTickets";
import { formatDayHeaderAR, formatYearDay } from "../../utils/date";
import type { Ticket } from "../../interfaces/Ticket";
import { TicketStatus } from "../../interfaces/enums";

// Propiedades del modo nocturno
type DashboardPageProps = {
  darkMode: boolean;
  onToggleDarkMode: () => void;
};

export default function DashboardPage({
  darkMode,
  onToggleDarkMode,
}: DashboardPageProps) {
  const now = useNow(1000);

  const yearDay = useMemo(() => formatYearDay(now), [now]);
  const dayHeader = useMemo(() => formatDayHeaderAR(now), [now]);

  const clock = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
      now.getSeconds(),
    )}`;
  }, [now]);

  const {
    tickets,
    pendingTickets,
    query,
    setQuery,
    clearQuery,
    loadMore,
    hasMore,
    isLoading,
    error,
    createTicket,
    closeTicket,
    archiveTicket,
    updateTicketMessage,
  } = useTickets();

  // Modales
  const newTicketModal = useModal(false);
  const closeTicketModal = useModal(false);
  const archiveTicketModal = useModal(false);
  const editTicketModal = useModal(false);

  const [ticketToClose, setTicketToClose] = useState<Ticket | null>(null);
  const [ticketToArchive, setTicketToArchive] = useState<Ticket | null>(null);
  const [ticketToEdit, setTicketToEdit] = useState<Ticket | null>(null);

  // Búsqueda tickets cerrados
  const closedQuery = query;

  const leftTickets = useMemo(() => {
    const base = tickets
      .filter(
        (t) =>
          t.status === TicketStatus.CERRADO &&
          !!t.audit.closedAt &&
          !t.archived,
      )
      .slice()
      .sort((a, b) => {
        const ta = a.audit.closedAt?.getTime() ?? 0;
        const tb = b.audit.closedAt?.getTime() ?? 0;
        return tb - ta;
      });

    const q = closedQuery.trim();
    if (!q) return base;

    // El backend ya filtra la búsqueda global.
    return base;
  }, [tickets, closedQuery]);

  return (
    <DashboardLayout
      left={
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 space-y-5">
            {/* Encabezado + botón modo nocturno */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  DEPARTAMENTO OPERACIONES
                </h1>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Sistema de Registro Diario
                </p>
              </div>

              <button
                type="button"
                onClick={onToggleDarkMode}
                aria-label={
                  darkMode ? "Activar modo claro" : "Activar modo nocturno"
                }
                title={
                  darkMode ? "Activar modo claro" : "Activar modo nocturno"
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-yellow-300 dark:hover:bg-slate-700"
              >
                {darkMode ? (
                  // Sol
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="m4.93 4.93 1.42 1.42" />
                    <path d="m17.65 17.65 1.42 1.42" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="m6.35 17.65-1.42 1.42" />
                    <path d="m19.07 4.93-1.42 1.42" />
                  </svg>
                ) : (
                  // Luna
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20.985 12.486A9 9 0 0 1 11.514 3.015 9 9 0 1 0 20.985 12.486Z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Fecha y reloj */}
            <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-slate-800">
              <div className="text-sm font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                {dayHeader}
              </div>

              <div className="font-mono text-sm font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                {clock} HS
              </div>

              <div className="text-sm font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                AÑO/DÍA: {yearDay}
              </div>
            </div>

            {/* Buscador */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    Buscar en tickets cerrados
                  </div>

                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Busca por palabra en todo el histórico (y refina localmente
                    por detalle/cierre).
                  </div>
                </div>

                {closedQuery.trim() ? (
                  <button
                    type="button"
                    onClick={clearQuery}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                  >
                    Volver a últimos 7 días
                  </button>
                ) : null}
              </div>

              <input
                value={closedQuery}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Ej: "syslog error"'
                className="mt-3 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-600 dark:placeholder:text-slate-500 dark:focus:bg-slate-950 dark:focus:ring-blue-500"
              />

              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {closedQuery.trim()
                  ? `${leftTickets.length} resultado(s)`
                  : `${leftTickets.length} ticket(s)`}
              </div>

              {error ? (
                <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Tickets Cerrados
            </div>
          </div>

          <TicketsList
            tickets={leftTickets}
            searchQuery={closedQuery}
            hasMore={hasMore}
            isLoading={isLoading}
            onLoadMore={loadMore}
            onArchive={(ticketId) => {
              const t = leftTickets.find((x) => x.id === ticketId) ?? null;
              if (!t) return;
              setTicketToArchive(t);
              archiveTicketModal.open();
            }}
          />

          {archiveTicketModal.isOpen && ticketToArchive ? (
            <ArchiveTicketModal
              open={archiveTicketModal.isOpen}
              ticket={ticketToArchive}
              onClose={() => {
                archiveTicketModal.close();
                setTicketToArchive(null);
              }}
              onConfirm={async (ticketId) => {
                await archiveTicket(ticketId);
                archiveTicketModal.close();
                setTicketToArchive(null);
              }}
            />
          ) : null}
        </div>
      }
      right={
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 space-y-4">
            <RightActions onNew={newTicketModal.open} />

            <WeeksGrid now={now} />

            <PendingPanel
              tickets={pendingTickets}
              onRequestEdit={(t) => {
                setTicketToEdit(t);
                editTicketModal.open();
              }}
              onRequestClose={(t) => {
                setTicketToClose(t);
                closeTicketModal.open();
              }}
            />
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-2" />

          {editTicketModal.isOpen && ticketToEdit ? (
            <EditTicketModal
              key={ticketToEdit.id}
              open={editTicketModal.isOpen}
              ticket={ticketToEdit}
              onClose={() => {
                editTicketModal.close();
                setTicketToEdit(null);
              }}
              onConfirm={async (payload: {
                ticketId: string;
                message: string;
              }) => {
                await updateTicketMessage(payload.ticketId, payload.message);
                editTicketModal.close();
                setTicketToEdit(null);
              }}
            />
          ) : null}

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
            onCreate={(payload) =>
              createTicket({
                ...payload,
                createdAt: payload.createdAt ?? new Date(now),
              })
            }
          />
        </div>
      }
    />
  );
}
