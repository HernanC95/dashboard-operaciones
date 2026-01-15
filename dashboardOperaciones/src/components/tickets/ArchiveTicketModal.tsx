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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-xs font-mono font-semibold text-slate-700 border border-slate-200">
              #{ticket.publicId}
            </span>

            <span className="text-xs font-semibold text-slate-600">
              {ticket.ticketKind}
            </span>

            {ticket.lpar ? (
              <span className="text-xs font-semibold text-slate-600">
                • {ticket.lpar}
              </span>
            ) : null}
          </div>

          <div className="mt-2 text-sm text-slate-700">{preview || "—"}</div>

          <div className="mt-2 text-xs text-slate-500">
            El ticket se archivará (no se borra) y dejará de mostrarse en el
            tablero.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => onConfirm(ticket.id)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-slate-800"
          >
            Sí, archivar
          </button>
        </div>
      </div>
    </Modal>
  );
}
