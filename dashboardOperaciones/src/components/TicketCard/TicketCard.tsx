import type { Ticket } from "../../interfaces/Ticket";
import type { TicketTag } from "../../interfaces/enums";
import { TicketKind, TicketStatus } from "../../interfaces/enums";
import { highlightText } from "../../utils/highlight";
import { formatDateShortAR, formatTimeAR } from "../../utils/date";
import ClampText from "../ui/ClampText";

function leftBorderbyKind(kind: TicketKind) {
  switch (kind) {
    case "Z15":
      return "border-l-red-500";
    case "NOTICIA":
      return "border-l-purple-500";
    default:
      return "border-l-blue-500";
  }
}

function kindChip(kind: TicketKind) {
  if (kind === TicketKind.Z15) return "bg-red-100 text-red-700 border-red-200";
  if (kind === TicketKind.NOTICIA)
    return "bg-purple-100 text-purple-700 border-purple-200";
  if (kind === TicketKind.INGRESO)
    return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function tagChip(tag: TicketTag) {
  if (tag === "RECORDATORIO")
    return "bg-pink-100 text-pink-700 border-pink-200";
  if (tag === "IMPORTANTE")
    return "bg-orange-100 text-orange-700 border-orange-200";
  if (tag === "MENCIONES")
    return "bg-indigo-100 text-indigo-700 border-indigo-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

type Props = {
  ticket: Ticket;
  searchQuery?: string;
};

function buildDisplayDetails(ticket: Ticket): string {
  const base = (ticket.details ?? "").trim() || "—";
  const isClosed = ticket.status === TicketStatus.CERRADO;

  // ✅ closeDescription puede venir:
  // - en root meta (NOTICIA / INGRESO)
  // - en process.meta (Z15)
  const rootMeta = (ticket.meta ?? {}) as Record<string, unknown>;
  const processMeta = (ticket.process?.meta ?? {}) as Record<string, unknown>;

  const closeDesc = (
    (typeof processMeta.closeDescription === "string"
      ? processMeta.closeDescription
      : "") ||
    (typeof rootMeta.closeDescription === "string"
      ? rootMeta.closeDescription
      : "")
  ).trim();

  // ✅ NO Z15: si está cerrado, mostrar cierre (y listo)
  if (ticket.ticketKind !== TicketKind.Z15) {
    if (!isClosed || !closeDesc) return base;
    return `${base} [Cierre] ${closeDesc}`;
  }

  // ✅ Z15: solo agregamos cosas si está cerrado
  if (!isClosed) return base;
  const baseAlreadyHasClose =
    /\[cierre\]/i.test(base) || /resultado final:/i.test(base);

  if (baseAlreadyHasClose) return base;

  const code = ticket.process?.code;
  const result = ticket.process?.result; // OK | ERROR
  const type = ticket.process?.type; // EJECUCION_CORTA | EJECUCION_LARGA | CONTROL_OPERATIVO

  // Si no hay nada que mostrar, devolvemos el base
  if (!result && !closeDesc) return base;

  // ✅ Caso especial: IMS_IPL (sin "Detalle:" y resultado al final)
  if (code === "IMS_IPL") {
    const parts: string[] = [];

    if (closeDesc) parts.push(closeDesc);
    if (result) parts.push(`Resultado final: ${result}`);
    return `${base} [Cierre] ${parts.join(" | ")}`;
  }

  // ✅ Procesos cortos (SYSLOG, OPDELETE, etc):
  // NO agregar "Resultado final" para evitar cierre duplicado,
  // pero si hay closeDesc, mostrarlo como cierre simple.
  if (type === "EJECUCION_CORTA") {
    if (!closeDesc) return base;
    return `${base} | Cierre: ${closeDesc}`;
  }

  // ✅ Procesos largos / control: cierre completo
  const parts: string[] = [];
  if (result) parts.push(`Resultado final: ${result}`);
  if (closeDesc) parts.push(`Detalle: ${closeDesc}`);

  return `${base} [Cierre] ${parts.join(" | ")}`;
}

export default function TicketCard({ ticket, searchQuery }: Props) {
  const displayText = buildDisplayDetails(ticket);

  const isClosed =
    ticket.status === TicketStatus.CERRADO &&
    Boolean(ticket.audit.closedAt) &&
    Boolean(ticket.audit.closedBy);

  const createdBy = ticket.audit.createBy;
  const closedBy = ticket.audit.closedBy;

  const samePerson =
    isClosed &&
    ((createdBy?.id && closedBy?.id && createdBy.id === closedBy.id) ||
      createdBy.name.trim().toLowerCase() ===
        (closedBy?.name ?? "").trim().toLowerCase());

  return (
    <article
      className={[
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
        "border-l-4",
        leftBorderbyKind(ticket.ticketKind),
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-extrabold text-slate-900">
          {(() => {
            const created = formatDateShortAR(ticket.audit.createdAt);
            const closed = ticket.audit.closedAt
              ? formatDateShortAR(ticket.audit.closedAt)
              : null;

            if (!closed || created === closed) {
              return created;
            }

            return `${created} - ${closed}`;
          })()}
          <div className="text-lg font-extrabold text-slate-900">
            {formatTimeAR(ticket.audit.createdAt)} HS
            {ticket.status === TicketStatus.CERRADO && ticket.audit.closedAt
              ? ` - ${formatTimeAR(ticket.audit.closedAt)} HS`
              : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={[
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
              kindChip(ticket.ticketKind),
            ].join(" ")}
          >
            {ticket.ticketKind}
          </span>

          {ticket.tags?.map((t) => (
            <span
              key={t}
              className={[
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold",
                tagChip(t),
              ].join(" ")}
            >
              {t}
            </span>
          ))}

          {ticket.siteId ? (
            <span
              className={[
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
                "bg-blue-100 text-blue-700",
              ].join(" ")}
            >
              {ticket.siteLabel}
            </span>
          ) : null}
          {ticket.ticketKind === TicketKind.Z15 && ticket.lpar ? (
            <span
              className={[
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
                "bg-slate-100 text-slate-800 border-slate-200",
              ].join(" ")}
            >
              {ticket.lpar}
            </span>
          ) : null}
        </div>
      </div>

      <ClampText
        lines={3}
        className="mt-2 text-sm text-slate-700"
        text={
          searchQuery ? highlightText(displayText, searchQuery) : displayText
        }
      />

      <div className="mt-4 space-y-1 text-xs text-slate-500">
        {!isClosed ? (
          <div>
            Cargado por:{" "}
            <span className="font-semibold text-slate-700">
              {createdBy.name}
            </span>
          </div>
        ) : samePerson ? (
          <div>
            Cargado/Cierre:{" "}
            <span className="font-semibold text-slate-700">
              {createdBy.name}
            </span>
          </div>
        ) : (
          <>
            <div>
              Cargado por:{" "}
              <span className="font-semibold text-slate-700">
                {createdBy.name}
              </span>
            </div>

            <div>
              Cerrado por:{" "}
              <span className="font-semibold text-slate-700">
                {closedBy?.name ?? "—"}
              </span>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
