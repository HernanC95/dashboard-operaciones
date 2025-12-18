import { useMemo } from "react";
import type { Ticket } from "../../interfaces/Ticket";
import { TicketStatus, TicketTag } from "../../interfaces/enums";
import { formatTimeAR } from "../../utils/date";

type Props = {
  tickets: Ticket[];
  onRequestClose: (ticket: Ticket) => void;
};

export default function PendingPanel({ tickets, onRequestClose }: Props) {
  const openCount = useMemo(
    () => tickets.filter((t) => t.status === TicketStatus.ABIERTO).length,
    [tickets]
  );

  const remindersCount = useMemo(
    () =>
      tickets.filter((t) => t.tags?.includes(TicketTag.RECORDATORIO)).length,
    [tickets]
  );
  const items = useMemo(() => {
    return tickets.filter((t) => {
      const isOpen = t.status === TicketStatus.ABIERTO;
      const isReminder = t.tags?.includes(TicketTag.RECORDATORIO) ?? false;
      return isOpen || isReminder;
    });
  }, [tickets]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 px-5 py-4 text-white">
        <div className="text-lg font-extrabold">📌 PANEL DE PENDIENTES</div>
        <div className="mt-1 text-sm text-white/90">
          Recordatorios activos y tickets sin cerrar
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 py-4">
        <div className="rounded-xl border border-pink-200 bg-pink-50 p-4">
          <div className="text-xs font-bold text-pink-700">Recordatorios</div>
          <div className="mt-2 text-2xl font-extrabold text-pink-700">
            {remindersCount}
          </div>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="text-xs font-bold text-orange-700">
            Tickets Abiertos
          </div>
          <div className="mt-2 text-2xl font-extrabold text-orange-700">
            {openCount}
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 pb-5">
        {items.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-extrabold text-slate-900">
                {formatTimeAR(t.date)} HS
              </div>

              {t.tags?.includes(TicketTag.RECORDATORIO) ? (
                <span className="inline-flex items-center rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs font-extrabold text-pink-700">
                  RECORDATORIO
                </span>
              ) : null}
              {t.status === TicketStatus.ABIERTO ? (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold bg-orange-100 text-orange-700 border-l-orange-500">
                  ABIERTO
                </span>
              ) : null}
            </div>

            <div className="mt-2 text-sm font-bold text-blue-700">
              {t.title}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <div>
                Cargado por:{" "}
                <span className="font-semibold text-slate-800">
                  {t.audit.createBy.name}
                </span>
              </div>

              <button
                onClick={() => onRequestClose(t)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
