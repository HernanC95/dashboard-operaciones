import { useMemo, useState } from "react";
import Modal from "../modal/Modal";
import type { Ticket } from "../../interfaces/Ticket";

type Props = {
  open: boolean;
  ticket: Ticket;
  onClose: () => void;
  onConfirm: (payload: { ticketId: string; message: string }) => Promise<void>;
};

const MAX_LEN = 1000;

export default function EditTicketModal({
  open,
  ticket,
  onClose,
  onConfirm,
}: Props) {
  // ✅ se inicializa desde el ticket UNA SOLA VEZ al montar
  // (y como en DashboardPage usás key={ticket.id}, se reinicia al cambiar ticket)
  const [message, setMessage] = useState(() => ticket.details ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = useMemo(() => message.trim(), [message]);
  const tooLong = message.length > MAX_LEN;
  const canSave = trimmed.length > 0 && !tooLong && !isSaving;

  async function handleSave() {
    setError(null);
    setIsSaving(true);

    try {
      await onConfirm({ ticketId: ticket.id, message: trimmed });
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" &&
              e !== null &&
              "error" in e &&
              typeof (e as { error?: unknown }).error === "string"
            ? (e as { error: string }).error
            : "Error guardando cambios.";

      setError(msg);
      setIsSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-full max-w-[720px] overflow-x-hidden rounded-2xl bg-white p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-extrabold text-slate-900">
              Editar descripción
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Ticket #{ticket.publicId ?? "-"} · {ticket.ticketKind}
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="w-full resize-none rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
            placeholder="Escribí la nueva descripción…"
          />

          <div className="mt-2 flex items-center justify-between text-xs">
            <div className="text-slate-500">
              {message.length}/{MAX_LEN}
              {tooLong ? (
                <span className="ml-2 font-semibold text-red-600">
                  (excede el máximo)
                </span>
              ) : null}
            </div>

            {error ? (
              <div className="text-xs font-semibold text-red-600">{error}</div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
