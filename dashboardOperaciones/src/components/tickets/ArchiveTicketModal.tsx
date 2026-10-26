import Modal from "../modal/Modal";
import type { Ticket } from "../../interfaces/Ticket";

type Props = {
  open: boolean;
  ticket: Ticket;
  onClose: () => void;
  onConfirm: (ticketId: string) => void;
};

export default function ArchiveTicketModal({
  open,
  ticket,
  onClose,
  onConfirm,
}: Props) {
  const shortDetails = (ticket.details ?? "").trim();
  const preview =
    shortDetails.length > 140 ? shortDetails.slice(0, 140) + "…" : shortDetails;

  return (
    <Modal open={open} onClose={onClose} title="Confirmar archivado">
      <div className="space-y-4">
        {/* Información del ticket */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors duration-200 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            {/* Identificador del ticket */}
            <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
              #{ticket.publicId}
            </span>

            {/* Tipo de ticket */}
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {ticket.ticketKind}
            </span>

            {/* LPAR */}
            {ticket.lpar ? (
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                • {ticket.lpar}
              </span>
            ) : null}
          </div>

          {/* Vista previa de la descripción */}
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {preview || "—"}
          </div>

          {/* Mensaje informativo */}
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            El ticket se archivará (no se borra) y dejará de mostrarse en el
            tablero.
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => onConfirm(ticket.id)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white transition-colors duration-200 hover:bg-slate-800 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Sí, archivar
          </button>
        </div>
      </div>
    </Modal>
  );
}
