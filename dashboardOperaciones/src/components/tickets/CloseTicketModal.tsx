import { useMemo, useState } from "react";
import Modal from "../modal/Modal";
import type { Ticket } from "../../interfaces/Ticket";
import { PEOPLE } from "../../constants/people";
import type { ActorRef } from "../../interfaces/ActorRef";
import { TicketKind } from "../../interfaces/enums";

function toLocalDateTimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export type CloseTicketPayload = {
  ticketId: string;
  closedBy: ActorRef;
  closeDescription: string;
  closedAt?: Date;

  // Solo para procesos que requieren resultado final (NO EJECUCION_CORTA)
  processResult?: "OK" | "ERROR";

  // IMS_IPL: SOLO checkpoint UP (sin hora)
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
  const [closedBy, setClosedBy] = useState<ActorRef | null>(null);
  const [closeDescription, setCloseDescription] = useState<string>("");

  const [useManualCloseAt, setUseManualCloseAt] = useState(false);
  const [closedAtValue, setClosedAtValue] = useState(() =>
    toLocalDateTimeValue(new Date()),
  );

  const isZ15 = ticket.ticketKind === TicketKind.Z15;
  const [processResult, setProcessResult] = useState<"OK" | "ERROR">("OK");

  // Detectar code/type (compatibilidad con ambos shapes)
  const processCode = useMemo(() => {
    // @ts-expect-error compat
    return ticket.process?.code ?? ticket.processCode ?? undefined;
  }, [ticket]);

  const processType = useMemo(() => {
    // @ts-expect-error compat
    return ticket.process?.type ?? ticket.processType ?? undefined;
  }, [ticket]);

  // Detectar IMS_IPL
  const isImsIpl = useMemo(() => {
    return isZ15 && processCode === "IMS_IPL";
  }, [isZ15, processCode]);

  // EJECUCION_CORTA: NO pedir Resultado final
  const isShortProcess = useMemo(() => {
    return isZ15 && processType === "EJECUCION_CORTA";
  }, [isZ15, processType]);

  // IMS UP checkpoint (sin hora)
  const [imsUpCheckpoint, setImsUpCheckpoint] = useState("");

  const canSubmit = useMemo(() => {
    // Operador requerido siempre
    if (!closedBy) return false;

    // IMS_IPL: siempre requiere checkpoint UP
    if (isImsIpl) return Boolean(imsUpCheckpoint.trim());

    // EJECUCION_CORTA: requiere detalle de cierre
    if (isShortProcess) return Boolean(closeDescription.trim());

    return true;
  }, [closedBy, isImsIpl, imsUpCheckpoint, isShortProcess, closeDescription]);

  const handleConfirm = () => {
    if (!canSubmit) return;
    if (!closedBy) return;

    const closeDescTrim = closeDescription.trim();

    // IMS_IPL: agregar checkpoint UP al final del closeDescription
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

    // Solo para Z15 NO corto: enviamos resultado final
    if (isZ15 && !isShortProcess) payload.processResult = processResult;

    // Mantener el campo estructurado para IMS_IPL
    if (isImsIpl) payload.imsUpCheckpoint = imsUpTrim;

    onConfirm(payload);

    // Limpiar antes de cerrar
    setClosedBy(null);
    setCloseDescription("");
    setUseManualCloseAt(false);
    setClosedAtValue(toLocalDateTimeValue(new Date()));
    setProcessResult("OK");
    setImsUpCheckpoint("");

    onClose();
  };

  return (
    <div className="space-y-4">
      {/* Información del ticket */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-200 dark:border-slate-700 dark:bg-slate-900">
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Creado por:{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {ticket.operatorLabel ?? "—"}
          </span>
        </div>

        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Tipo:{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {ticket.ticketKind}
          </span>
        </div>

        {isZ15 && processCode ? (
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Proceso:{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {processCode}
            </span>
            {processType ? (
              <>
                {" "}
                <span className="text-slate-400 dark:text-slate-500">
                  ·
                </span>{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {processType}
                </span>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Descripción inicial (solo lectura) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-200 dark:border-slate-700 dark:bg-slate-800">
        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
          Descripción inicial
        </div>

        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Lo que se registró al crear el ticket.
        </div>

        <div className="mt-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <div className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">
            {ticket.details?.trim() ? ticket.details : "—"}
          </div>
        </div>
      </div>

      {/* IMS_IPL: Checkpoint UP */}
      {isImsIpl ? (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            IMS UP (checkpoint)
          </div>

          <div className="text-sm text-slate-500 dark:text-slate-400">
            Al cerrar, registrá el checkpoint de subida. La hora se toma del
            cierre del ticket.
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Checkpoint IMS UP (YYDDD/HHMMSS)
            </label>

            <input
              value={imsUpCheckpoint}
              onChange={(e) => setImsUpCheckpoint(e.target.value)}
              placeholder="25355/105232"
              className="mt-2 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 transition-colors focus:bg-white focus:ring-2 focus:ring-slate-300 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:ring-slate-600 dark:focus:bg-slate-800 dark:focus:ring-blue-500"
            />

            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Ejemplo: <b>25355/105232</b>
            </div>
          </div>
        </div>
      ) : null}

      {/* Resultado final: solo Z15 y NO EJECUCION_CORTA */}
      {isZ15 && !isShortProcess ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            Resultado final
          </div>

          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Indicá cómo terminó el proceso.
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setProcessResult("OK")}
              className={[
                "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 transition-colors",
                processResult === "OK"
                  ? "bg-slate-900 text-white ring-slate-900 dark:bg-blue-700 dark:text-white dark:ring-blue-600"
                  : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-700",
              ].join(" ")}
            >
              Terminó OK
            </button>

            <button
              type="button"
              onClick={() => setProcessResult("ERROR")}
              className={[
                "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 transition-colors",
                processResult === "ERROR"
                  ? "bg-slate-900 text-white ring-slate-900 dark:bg-blue-700 dark:text-white dark:ring-blue-600"
                  : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-700",
              ].join(" ")}
            >
              Terminó mal
            </button>
          </div>
        </div>
      ) : null}

      {/* Descripción de cierre */}
      <div>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
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
          className="mt-2 w-full resize-none rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 transition-colors focus:bg-white focus:ring-2 focus:ring-slate-300 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:ring-slate-600 dark:focus:bg-slate-800 dark:focus:ring-blue-500"
        />

        {isShortProcess ? (
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Este proceso es <b>EJECUCION_CORTA</b>: no se informa “Resultado
            final” al cerrar, solo el detalle.
          </div>
        ) : null}
      </div>

      {/* Quién cierra */}
      <div>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Cerrado por
        </label>

        <select
          value={closedBy?.id ?? ""}
          onChange={(e) => {
            const selected =
              PEOPLE.find((p) => p.id === e.target.value) ?? null;
            setClosedBy(selected);
          }}
          className="mt-2 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 outline-none ring-1 ring-slate-200 transition-colors focus:bg-white focus:ring-2 focus:ring-slate-300 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-600 dark:focus:bg-slate-800 dark:focus:ring-blue-500"
        >
          <option value="" disabled>
            Seleccionar operador
          </option>

          {PEOPLE.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {!closedBy ? (
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Debés seleccionar quién realiza el cierre.
          </div>
        ) : null}
      </div>

      {/* Hora de cierre */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            Definir hora de cierre manualmente
          </div>

          <button
            type="button"
            onClick={() => setUseManualCloseAt((v) => !v)}
            className={[
              "relative h-7 w-12 rounded-full transition-colors",
              useManualCloseAt
                ? "bg-slate-900 dark:bg-blue-600"
                : "bg-slate-300 dark:bg-slate-600",
            ].join(" ")}
            aria-pressed={useManualCloseAt}
          >
            <span
              className={[
                "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
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
              className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 transition-colors focus:bg-white focus:ring-2 focus:ring-slate-300 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-600 dark:focus:bg-slate-800 dark:focus:ring-blue-500 dark:scheme-dark"
            />
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            // Limpiar al cancelar (sin useEffect)
            setClosedBy(null);
            setCloseDescription("");
            setUseManualCloseAt(false);
            setClosedAtValue(toLocalDateTimeValue(new Date()));
            setProcessResult("OK");
            setImsUpCheckpoint("");
            onClose();
          }}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canSubmit}
          className={[
            "rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow transition-colors",
            canSubmit
              ? "bg-slate-900 hover:bg-slate-800 dark:bg-blue-700 dark:hover:bg-blue-600"
              : "cursor-not-allowed bg-slate-400 dark:bg-slate-600 dark:text-slate-400",
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
      onClose={() => {
        // No hacemos setState acá; el formulario se resetea por key
        onClose();
      }}
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
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Seleccioná un ticket…
        </div>
      )}
    </Modal>
  );
}
