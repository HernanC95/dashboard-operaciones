import { useMemo } from "react";
import type { Ticket } from "../../interfaces/Ticket";
import { TicketKind, TicketStatus, TicketTag } from "../../interfaces/enums";
import { formatDateShortAR, formatTimeAR } from "../../utils/date";
import ClampText from "../ui/ClampText";

type Props = {
  tickets: Ticket[];
  onRequestClose: (ticket: Ticket) => void;
};

export default function PendingPanel({ tickets, onRequestClose }: Props) {
  const openCount = useMemo(
    () =>
      tickets.filter(
        (t) =>
          t.status === TicketStatus.ABIERTO &&
          !t.tags?.includes(TicketTag.RECORDATORIO)
      ).length,
    [tickets]
  );
  function kindChip(kind: TicketKind) {
    if (kind === TicketKind.Z15)
      return "bg-red-100 text-red-700 border-red-200";
    if (kind === TicketKind.NOTICIA)
      return "bg-purple-100 text-purple-700 border-purple-200";
    if (kind === TicketKind.INGRESO)
      return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  }
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
            className="flex flex-col rounded-2xl border border-blue-200 bg-white p-3 shadow-sm"
          >
            {t.tags?.includes(TicketTag.RECORDATORIO) ? (
              <span className="inline-flex mb-3 items-center rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs font-extrabold text-pink-700">
                RECORDATORIO: {formatDateShortAR(t.audit.createdAt)}
              </span>
            ) : (
              <span className="inline-flex mb-3 items-center rounded-full px-3 py-1 text-xs font-extrabold bg-orange-50 text-orange-700 border border-orange-200">
                ABIERTO: {formatDateShortAR(t.audit.createdAt)}
              </span>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-extrabold text-slate-900">
                {formatTimeAR(t.date)} HS
              </div>
              <div className="flex gap-2">
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
                    kindChip(t.ticketKind),
                  ].join(" ")}
                >
                  {t.ticketKind}
                </span>
                {t.siteLabel ? (
                  <span
                    className={[
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
                      kindChip(t.ticketKind),
                    ].join(" ")}
                  >
                    {t.siteLabel}
                  </span>
                ) : null}
                {t.ticketKind === TicketKind.Z15 && t.lpar ? (
                  <span
                    className={[
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
                      "bg-slate-100 text-slate-800 border-slate-200",
                    ].join(" ")}
                  >
                    {t.lpar}
                  </span>
                ) : null}
              </div>
            </div>

            <ClampText
              text={t.details}
              lines={3}
              className="mt-2 text-sm text-slate-700"
            />

            <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
              <div>
                Cargado por:{" "}
                <span className="text-xs font-semibold text-slate-800">
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
