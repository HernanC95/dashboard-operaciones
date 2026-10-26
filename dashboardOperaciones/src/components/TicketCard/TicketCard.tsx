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
  if (kind === TicketKind.Z15)
    return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800";

  if (kind === TicketKind.NOTICIA)
    return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800";

  if (kind === TicketKind.INGRESO)
    return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800";

  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600";
}

function tagChip(tag: TicketTag) {
  if (tag === "RECORDATORIO")
    return "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-800";

  if (tag === "IMPORTANTE")
    return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800";

  if (tag === "MENCIONES")
    return "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800";

  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600";
}

// Toma el primer token numérico (acepta "#137" o "137")
// para resaltar el publicId.
function extractTicketIdQuery(q?: string): string {
  const words = String(q ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const token = words
    .map((w) => w.replace(/^#/, ""))
    .find((w) => /^\d+$/.test(w));

  return token ?? "";
}

type Props = {
  ticket: Ticket;
  searchQuery?: string;

  // Archivar ticket (soft delete)
  onArchive?: (ticketId: string) => void;
};

function buildDisplayDetails(ticket: Ticket): string {
  const base = (ticket.details ?? "").trim() || "—";
  const isClosed = ticket.status === TicketStatus.CERRADO;

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

  if (ticket.ticketKind !== TicketKind.Z15) {
    if (!isClosed || !closeDesc) return base;
    return `${base} [Cierre] ${closeDesc}`;
  }

  if (!isClosed) return base;

  const baseAlreadyHasClose =
    /\[cierre\]/i.test(base) || /resultado final:/i.test(base);

  if (baseAlreadyHasClose) return base;

  const code = ticket.process?.code;
  const result = ticket.process?.result;
  const type = ticket.process?.type;

  if (!result && !closeDesc) return base;

  if (code === "IMS_IPL") {
    const parts: string[] = [];
    if (closeDesc) parts.push(closeDesc);
    if (result) parts.push(`Resultado final: ${result}`);
    return `${base} [Cierre] ${parts.join(" | ")}`;
  }

  if (type === "EJECUCION_CORTA") {
    if (!closeDesc) return base;
    return `${base} | Cierre: ${closeDesc}`;
  }

  const parts: string[] = [];
  if (result) parts.push(`Resultado final: ${result}`);
  if (closeDesc) parts.push(`Detalle: ${closeDesc}`);

  return `${base} [Cierre] ${parts.join(" | ")}`;
}

export default function TicketCard({ ticket, searchQuery, onArchive }: Props) {
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

  const canArchive =
    ticket.status === TicketStatus.CERRADO && !ticket.archived && !!onArchive;

  const idQuery = extractTicketIdQuery(searchQuery);

  return (
    <article
      className={[
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors duration-200",
        "dark:border-slate-700 dark:bg-slate-800",
        "border-l-4",
        leftBorderbyKind(ticket.ticketKind),
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
          {/* ID visible para referenciar tickets */}
          <div className="mb-1 flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              #
              {idQuery
                ? highlightText(String(ticket.publicId), idQuery)
                : ticket.publicId}
            </span>{" "}
            {ticket.archived ? (
              <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-extrabold text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                ARCHIVADO
              </span>
            ) : null}
            {(() => {
              const created = formatDateShortAR(ticket.audit.createdAt);
              const closed = ticket.audit.closedAt
                ? formatDateShortAR(ticket.audit.closedAt)
                : null;

              if (!closed || created === closed) return created;
              return `${created} - ${closed}`;
            })()}
          </div>

          {/* Horarios */}
          <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
            {(() => {
              const open = ticket.audit.createdAt;
              const close =
                ticket.status === TicketStatus.CERRADO
                  ? ticket.audit.closedAt
                  : null;

              const openLabel = `${formatTimeAR(open)} HS`;
              if (!close) return openLabel;

              // Si apertura y cierre coinciden, mostrar una sola hora.
              const sameTime =
                open.getHours() === close.getHours() &&
                open.getMinutes() === close.getMinutes();

              if (sameTime) return openLabel;

              return `${openLabel} - ${formatTimeAR(close)} HS`;
            })()}
          </div>
        </div>

        {/* Acciones y etiquetas */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canArchive ? (
            <button
              type="button"
              onClick={() => onArchive(ticket.id)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-extrabold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              title="Archivar ticket (no se borra)"
            >
              Archivar
            </button>
          ) : null}

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
                "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
              ].join(" ")}
            >
              {searchQuery
                ? highlightText(ticket.siteLabel ?? "", searchQuery)
                : ticket.siteLabel}
            </span>
          ) : null}

          {ticket.ticketKind === TicketKind.Z15 && ticket.lpar ? (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
              {ticket.lpar}
            </span>
          ) : null}
        </div>
      </div>

      {/* Descripción */}
      <ClampText
        lines={3}
        className="mt-2 text-sm text-slate-700 dark:text-slate-300"
        text={
          searchQuery ? highlightText(displayText, searchQuery) : displayText
        }
      />

      {/* Información de operadores */}
      <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
        {!isClosed ? (
          <div>
            Cargado por:{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {createdBy.name}
            </span>
          </div>
        ) : samePerson ? (
          <div>
            Carga/Cierre:{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {createdBy.name}
            </span>
          </div>
        ) : (
          <>
            <div>
              Cargado por:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {createdBy.name}
              </span>
            </div>

            <div>
              Cerrado por:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {closedBy?.name ?? "—"}
              </span>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
