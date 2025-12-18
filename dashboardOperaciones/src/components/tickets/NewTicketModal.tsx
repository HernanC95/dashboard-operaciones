import { useMemo, useState } from "react";
import Modal from "../modal/Modal";
import { PEOPLE } from "../../constants/people";
import type { ActorRef } from "../../interfaces/ActorRef";
import { TicketKind } from "../../interfaces/enums";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate?: (payload: NewTicketPayload) => void;
};

export type NewTicketPayload = {
  ticketKind: TicketKind;
  operator: ActorRef;
  message: string;
  site?: string;
  isReminder: boolean;
};

export default function NewTicketModal({ open, onClose, onCreate }: Props) {
  const [ticketKind, setTicketKind] = useState<TicketKind>(TicketKind.INGRESO);
  const [operator, setOperator] = useState<ActorRef>(PEOPLE[0]);
  const [message, setMessage] = useState("");
  const [site, setSite] = useState("");
  const [isReminder, setIsReminder] = useState(false);

  const showSite = useMemo(
    () => ticketKind === TicketKind.INGRESO,
    [ticketKind]
  );

  const canSubmit = message.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;

    const payload: NewTicketPayload = {
      ticketKind,
      operator,
      message: message.trim(),
      site: showSite && site.trim() ? site.trim() : undefined,
      isReminder,
    };

    onCreate?.(payload);

    onClose();
    // opcional: limpiar
    setMessage("");
    setSite("");
    setIsReminder(false);
    setTicketKind(TicketKind.INGRESO);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo Registro / Ticket"
      maxWidthClassName="max-w-[780px]"
    >
      <div className="space-y-4">
        {/* TicketKind */}
        <div>
          <label className="text-sm font-bold text-slate-700">Tipo</label>
          <div className="mt-2">
            <select
              value={ticketKind}
              onChange={(e) => {
                setTicketKind(e.target.value as TicketKind);
              }}
              className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
            >
              {Object.values(TicketKind).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Operador */}
        <div>
          <label className="text-sm font-bold text-slate-700">Operador</label>
          <select
            value={operator.id}
            onChange={(e) => {
              const selected = PEOPLE.find((p) => p.id === e.target.value);
              if (selected) setOperator(selected);
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

        {/* Mensaje */}
        <div>
          <label className="text-sm font-bold text-slate-700">
            Mensaje / Descripción
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Descripción detallada del registro..."
            rows={4}
            className="mt-2 w-full resize-none rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
          />
        </div>

        {/* Sitio */}
        {showSite ? (
          <div>
            <label className="text-sm font-bold text-slate-700">
              Sitio / Ubicación (opcional)
            </label>
            <input
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="Ej: Reconquista, Fisherton, etc."
              className="mt-2 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
            />
          </div>
        ) : null}

        {/* Recordatorio */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                Mantener como Recordatorio
              </div>
              <div className="mt-1 text-sm text-slate-500">
                El registro permanecerá visible en el dashboard durante varios
                días
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsReminder((v) => !v)}
              className={[
                "relative h-7 w-12 rounded-full transition",
                isReminder ? "bg-slate-900" : "bg-slate-300",
              ].join(" ")}
              aria-pressed={isReminder}
              aria-label="Toggle recordatorio"
            >
              <span
                className={[
                  "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                  isReminder ? "left-6" : "left-0.5",
                ].join(" ")}
              />
            </button>
          </div>
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
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={[
              "rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow",
              canSubmit
                ? "bg-slate-900 hover:bg-slate-800"
                : "bg-slate-400 cursor-not-allowed",
            ].join(" ")}
          >
            Crear Registro
          </button>
        </div>
      </div>
    </Modal>
  );
}
