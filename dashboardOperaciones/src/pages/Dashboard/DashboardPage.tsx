import DashboardLayout from "../../components/layout/DashboardLayout";
import RightActions from "../../components/header/RightActions";
import PendingPanel from "../../components/PendingPanel/PendingPanel";
import TicketsList from "../../components/TicketsList/TicketsList";
import NewTicketModal from "../../components/tickets/NewTicketModal";
import CloseTicketModal from "../../components/tickets/CloseTicketModal";

import useModal from "../../hooks/useModal";
import useTickets from "../../hooks/useTickets";

import { mockTickets } from "./mocktickets";
import { formatDayHeaderAR, formatYearDay } from "../../utils/date";
import type { Ticket } from "../../interfaces/Ticket";
import { useState } from "react";

export default function DashboardPage() {
  const now = new Date();
  const yearDay = formatYearDay(now);

  // ✅ estado real
  const { tickets, counts, createTicket, closeTicket } =
    useTickets(mockTickets);

  // ✅ modal
  const newTicketModal = useModal(false);
  const leftTickets = tickets.filter((t) => t.status === "CERRADO");
  const closeTicketModal = useModal(false);
  const [ticketToClose, setTicketToClose] = useState<Ticket | null>(null);

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
              {formatDayHeaderAR(now)}
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

          {/* filtros (si ya los tenés armados, dejalo igual) */}
          {/* ... */}

          <TicketsList tickets={leftTickets} />
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
