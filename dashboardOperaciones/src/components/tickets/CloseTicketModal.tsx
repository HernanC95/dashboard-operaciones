import { useMemo, useState } from "react";
import Modal from "../modal/Modal";
import type { Ticket } from "../../interfaces/Ticket";
import { PEOPLE } from "../../constants/people";
import type { ActorRef } from "../../interfaces/ActorRef";

function toLocalDateTimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export type CloseTicketPayload = {
  ticketId: string;
  closedBy: ActorRef; // ✅ ahora coincide con lo que enviás
  closeDescription: string;
  closedAt?: Date;
};

type Props = {
  open: boolean;
  onClose: () => void;
  ticket?: Ticket | null;
  onConfirm: (payload: CloseTicketPayload) => void; // ✅ tipado correcto
};

export default function CloseTicketModal({
  open,
  onClose,
  ticket,
  onConfirm,
}: Props) {
  const [closedBy, setClosedBy] = useState<ActorRef>(PEOPLE[0]);
  const [closeDescription, setCloseDescription] = useState("");
  const [useNow, setUseNow] = useState(true);
  const [closedAtValue, setClosedAtValue] = useState(() =>
    toLocalDateTimeValue(new Date())
  );

  const canSubmit = useMemo(() => Boolean(ticket?.id), [ticket]);

  const handleConfirm = () => {
    if (!ticket?.id || !canSubmit) return;

    onConfirm({
      ticketId: ticket.id,
      closedBy,
      closeDescription: closeDescription.trim(),
      closedAt: useNow ? undefined : new Date(closedAtValue),
    });

    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cerrar Ticket"
      maxWidthClassName="max-w-[780px]"
    >
      <div className="space-y-4">
        {/* Resumen */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-extrabold text-slate-900">
            {ticket ? ticket.title : "—"}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Operador:{" "}
            <span className="font-semibold text-slate-800">
              {ticket?.operatorLabel ?? "—"}
            </span>
          </div>
        </div>

        {/* Quién cierra */}
        <div>
          <label className="text-sm font-bold text-slate-700">
            Cerrado por
          </label>

          <select
            value={closedBy.id}
            onChange={(e) => {
              const selected = PEOPLE.find((p) => p.id === e.target.value);
              if (selected) setClosedBy(selected);
            }}
            className="mt-2 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
          >
            {PEOPLE.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Descripción */}
        <div>
          <label className="text-sm font-bold text-slate-700">
            Descripción de cierre (opcional)
          </label>
          <textarea
            value={closeDescription}
            onChange={(e) => setCloseDescription(e.target.value)}
            placeholder="Detalle breve de la resolución..."
            rows={4}
            className="mt-2 w-full resize-none rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
          />
        </div>

        {/* Hora de cierre */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                Hora de cierre
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Si desactivás “usar hora actual”, podés definir la hora
                manualmente.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setUseNow((v) => !v)}
              className={[
                "relative h-7 w-12 rounded-full transition",
                useNow ? "bg-slate-900" : "bg-slate-300",
              ].join(" ")}
              aria-pressed={useNow}
            >
              <span
                className={[
                  "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                  useNow ? "left-6" : "left-0.5",
                ].join(" ")}
              />
            </button>
          </div>

          {!useNow ? (
            <div className="mt-4">
              <input
                type="datetime-local"
                value={closedAtValue}
                onChange={(e) => setClosedAtValue(e.target.value)}
                className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
              />
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className={[
              "rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow",
              canSubmit
                ? "bg-slate-900 hover:bg-slate-800"
                : "bg-slate-400 cursor-not-allowed",
            ].join(" ")}
          >
            Confirmar Cierre
          </button>
        </div>
      </div>
    </Modal>
  );
}
