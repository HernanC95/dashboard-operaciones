import { useMemo, useState } from "react";
import Modal from "../modal/Modal";
import type { Ticket } from "../../interfaces/Ticket";
import { PEOPLE } from "../../constants/people";
import type { ActorRef } from "../../interfaces/ActorRef";
import { TicketKind } from "../../interfaces/enums";

function toLocalDateTimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export type CloseTicketPayload = {
  ticketId: string;
  closedBy: ActorRef;
  closeDescription: string;
  closedAt?: Date;

  // ✅ Solo para procesos que requieren resultado final (NO EJECUCION_CORTA)
  processResult?: "OK" | "ERROR";

  // ✅ IMS_IPL: SOLO checkpoint UP (sin hora)
  imsUpCheckpoint?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  ticket?: Ticket | null;
  onConfirm: (payload: CloseTicketPayload) => void;
};

function CloseTicketForm({
  ticket,
  onClose,
  onConfirm,
}: {
  ticket: Ticket;
  onClose: () => void;
  onConfirm: (payload: CloseTicketPayload) => void;
}) {
  const [closedBy, setClosedBy] = useState<ActorRef>(PEOPLE[0]);
  const [closeDescription, setCloseDescription] = useState<string>("");

  const [useManualCloseAt, setUseManualCloseAt] = useState(false);
  const [closedAtValue, setClosedAtValue] = useState(() =>
    toLocalDateTimeValue(new Date())
  );

  const isZ15 = ticket.ticketKind === TicketKind.Z15;
  const [processResult, setProcessResult] = useState<"OK" | "ERROR">("OK");

  // ✅ Detectar code/type (compat con ambos shapes)
  const processCode = useMemo(() => {
    // @ts-expect-error compat
    return ticket.process?.code ?? ticket.processCode ?? undefined;
  }, [ticket]);

  const processType = useMemo(() => {
    // @ts-expect-error compat
    return ticket.process?.type ?? ticket.processType ?? undefined;
  }, [ticket]);

  // ✅ Detectar IMS_IPL
  const isImsIpl = useMemo(() => {
    return isZ15 && processCode === "IMS_IPL";
  }, [isZ15, processCode]);

  // ✅ EJECUCION_CORTA: NO pedir Resultado final
  const isShortProcess = useMemo(() => {
    return isZ15 && processType === "EJECUCION_CORTA";
  }, [isZ15, processType]);

  // ✅ IMS UP checkpoint (sin hora)
  const [imsUpCheckpoint, setImsUpCheckpoint] = useState("");

  const canSubmit = useMemo(() => {
    // IMS_IPL: siempre requiere checkpoint UP
    if (isImsIpl) return Boolean(imsUpCheckpoint.trim());

    // ✅ EJECUCION_CORTA: solo tiene sentido cerrar si agregás detalle
    if (isShortProcess) return Boolean(closeDescription.trim());

    return true;
  }, [isImsIpl, imsUpCheckpoint, isShortProcess, closeDescription]);

  const handleConfirm = () => {
    if (!canSubmit) return;

    const closeDescTrim = closeDescription.trim();

    // ✅ IMS_IPL: agregar checkpoint UP al final del closeDescription
    const imsUpTrim = imsUpCheckpoint.trim();
    const finalCloseDescription = isImsIpl
      ? closeDescTrim
        ? `${closeDescTrim} - Checkpoint UP=${imsUpTrim}.`
        : `Checkpoint UP=${imsUpTrim}.`
      : closeDescTrim;

    const payload: CloseTicketPayload = {
      ticketId: ticket.id,
      closedBy,
      closeDescription: finalCloseDescription,
      closedAt: useManualCloseAt ? new Date(closedAtValue) : undefined,
    };

    // ✅ Solo para Z15 NO corto: mandamos resultado final
    if (isZ15 && !isShortProcess) payload.processResult = processResult;

    // ✅ Mantener el campo estructurado para IMS_IPL
    if (isImsIpl) payload.imsUpCheckpoint = imsUpTrim;

    onConfirm(payload);
    onClose();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mt-1 text-sm text-slate-600">
          Creado por:{" "}
          <span className="font-semibold text-slate-800">
            {ticket.operatorLabel ?? "—"}
          </span>
        </div>
        <div className="mt-1 text-sm text-slate-600">
          Tipo:{" "}
          <span className="font-semibold text-slate-800">
            {ticket.ticketKind}
          </span>
        </div>

        {isZ15 && processCode ? (
          <div className="mt-1 text-sm text-slate-600">
            Proceso:{" "}
            <span className="font-semibold text-slate-800">{processCode}</span>
            {processType ? (
              <>
                {" "}
                <span className="text-slate-400">·</span>{" "}
                <span className="font-semibold text-slate-800">
                  {processType}
                </span>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Descripción inicial (solo lectura) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-extrabold text-slate-900">
          Descripción inicial
        </div>
        <div className="mt-1 text-sm text-slate-500">
          Lo que se registró al crear el ticket.
        </div>

        <div className="mt-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3">
          <div className="whitespace-pre-wrap text-sm text-slate-800">
            {ticket.details?.trim() ? ticket.details : "—"}
          </div>
        </div>
      </div>

      {/* ✅ IMS_IPL: Checkpoint UP (sin hora) */}
      {isImsIpl ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
          <div className="text-sm font-extrabold text-slate-900">
            IMS UP (checkpoint)
          </div>
          <div className="text-sm text-slate-500">
            Al cerrar, registrá el checkpoint de subida. La hora se toma del
            cierre del ticket.
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">
              Checkpoint IMS UP (YYDDD/HHMMSS)
            </label>
            <input
              value={imsUpCheckpoint}
              onChange={(e) => setImsUpCheckpoint(e.target.value)}
              placeholder="25355/105232"
              className="mt-2 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
            />
            <div className="mt-2 text-xs text-slate-500">
              Ejemplo: <b>25355/105232</b>
            </div>
          </div>
        </div>
      ) : null}

      {/* ✅ Resultado final: solo Z15 y NO EJECUCION_CORTA */}
      {isZ15 && !isShortProcess ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-extrabold text-slate-900">
            Resultado final
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Indicá cómo terminó el proceso.
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setProcessResult("OK")}
              className={[
                "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold ring-1",
                processResult === "OK"
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              Terminó OK
            </button>

            <button
              type="button"
              onClick={() => setProcessResult("ERROR")}
              className={[
                "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold ring-1",
                processResult === "ERROR"
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              Terminó mal
            </button>
          </div>
        </div>
      ) : null}

      {/* Descripción de cierre */}
      <div>
        <label className="text-sm font-bold text-slate-700">
          Descripción de cierre{" "}
          {isShortProcess || isImsIpl ? "(requerida)" : "(opcional)"}
        </label>
        <textarea
          value={closeDescription}
          onChange={(e) => setCloseDescription(e.target.value)}
          placeholder={
            isShortProcess
              ? "Detalle del cierre (obligatorio para procesos cortos)..."
              : "Detalle breve de la resolución..."
          }
          rows={4}
          className="mt-2 w-full resize-none rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
        />
        {isShortProcess ? (
          <div className="mt-2 text-xs text-slate-500">
            Este proceso es <b>EJECUCION_CORTA</b>: no se informa “Resultado
            final” al cerrar, solo el detalle.
          </div>
        ) : null}
      </div>

      {/* Quién cierra */}
      <div>
        <label className="text-sm font-bold text-slate-700">Cerrado por</label>

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

      {/* Hora de cierre */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm font-extrabold text-slate-900">
            Definir hora de cierre manualmente
          </div>

          <button
            type="button"
            onClick={() => setUseManualCloseAt((v) => !v)}
            className={[
              "relative h-7 w-12 rounded-full transition",
              useManualCloseAt ? "bg-slate-900" : "bg-slate-300",
            ].join(" ")}
            aria-pressed={useManualCloseAt}
          >
            <span
              className={[
                "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                useManualCloseAt ? "left-6" : "left-0.5",
              ].join(" ")}
            />
          </button>
        </div>

        {useManualCloseAt ? (
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
  );
}

export default function CloseTicketModal({
  open,
  onClose,
  ticket,
  onConfirm,
}: Props) {
  const canRender = Boolean(open && ticket?.id);
  const formKey = `${ticket?.id ?? "none"}-${open ? "open" : "closed"}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cerrar Ticket"
      maxWidthClassName="max-w-[780px]"
    >
      {canRender ? (
        <CloseTicketForm
          key={formKey}
          ticket={ticket as Ticket}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      ) : (
        <div className="text-sm text-slate-500">Seleccioná un ticket…</div>
      )}
    </Modal>
  );
}
