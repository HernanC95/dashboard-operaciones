import { useMemo } from "react";
import type { Ticket } from "../../interfaces/Ticket";
import { TicketKind, TicketStatus, TicketTag } from "../../interfaces/enums";
import { formatDateShortAR, formatTimeAR } from "../../utils/date";
import ClampText from "../ui/ClampText";

type Props = {
  tickets: Ticket[];
  onRequestClose: (ticket: Ticket) => void;

  // Abre modal de edición en el padre
  onRequestEdit: (ticket: Ticket) => void;
};

export default function PendingPanel({
  tickets,
  onRequestClose,
  onRequestEdit,
}: Props) {
  const openCount = useMemo(
    () =>
      tickets.filter(
        (t) =>
          t.status === TicketStatus.ABIERTO &&
          !t.tags?.includes(TicketTag.RECORDATORIO),
      ).length,
    [tickets],
  );

  function kindChip(kind: TicketKind) {
    if (kind === TicketKind.Z15)
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800";

    if (kind === TicketKind.NOTICIA)
      return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800";

    if (kind === TicketKind.INGRESO)
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800";

    return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600";
  }

  const remindersCount = useMemo(
    () =>
      tickets.filter((t) => t.tags?.includes(TicketTag.RECORDATORIO)).length,
    [tickets],
  );

  const items = useMemo(() => {
    return tickets.filter((t) => {
      const isOpen = t.status === TicketStatus.ABIERTO;
      const isReminder = t.tags?.includes(TicketTag.RECORDATORIO) ?? false;
      return isOpen || isReminder;
    });
  }, [tickets]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:border-slate-700 dark:bg-slate-800">
      {/* Encabezado */}
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 px-5 py-4 text-white dark:from-pink-800 dark:to-purple-900">
        <div className="text-lg font-extrabold">📌 PANEL DE PENDIENTES</div>

        <div className="mt-1 text-sm text-white/90">
          Recordatorios activos y tickets sin cerrar
        </div>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-2 gap-3 px-5 py-4">
        <div className="rounded-xl border border-pink-200 bg-pink-50 p-4 dark:border-pink-900 dark:bg-pink-950">
          <div className="text-xs font-bold text-pink-700 dark:text-pink-300">
            Recordatorios
          </div>

          <div className="mt-2 text-2xl font-extrabold text-pink-700 dark:text-pink-300">
            {remindersCount}
          </div>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
          <div className="text-xs font-bold text-orange-700 dark:text-orange-300">
            Tickets Abiertos
          </div>

          <div className="mt-2 text-2xl font-extrabold text-orange-700 dark:text-orange-300">
            {openCount}
          </div>
        </div>
      </div>

      {/* Lista de tickets */}
      <div className="space-y-4 px-5 pb-5">
        {items.map((t) => {
          const isReminder = t.tags?.includes(TicketTag.RECORDATORIO) ?? false;

          const canEdit = t.status === TicketStatus.ABIERTO;

          return (
            <div
              key={t.id}
              className="flex flex-col rounded-2xl border border-blue-200 bg-white p-3 shadow-sm transition-colors duration-200 dark:border-slate-600 dark:bg-slate-900"
            >
              {/* Estado y fecha */}
              {isReminder ? (
                <span className="mb-3 inline-flex items-center rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs font-extrabold text-pink-700 dark:border-pink-800 dark:bg-pink-950 dark:text-pink-300">
                  RECORDATORIO: {formatDateShortAR(t.audit.createdAt)}
                </span>
              ) : (
                <span className="mb-3 inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-extrabold text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300">
                  ABIERTO: {formatDateShortAR(t.audit.createdAt)}
                </span>
              )}

              {/* Hora y etiquetas */}
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {formatTimeAR(t.audit.createdAt)} HS
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
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                      {t.lpar}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Descripción */}
              <ClampText
                text={t.details}
                lines={3}
                className="mt-2 text-sm text-slate-700 dark:text-slate-300"
              />

              {/* Operador y acciones */}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <div>
                  Cargado por:{" "}
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {t.audit.createBy.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => onRequestEdit(t)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    >
                      Editar
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => onRequestClose(t)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
