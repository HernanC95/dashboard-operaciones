import type { Ticket } from "../../interfaces/Ticket";
import type { TicketTag } from "../../interfaces/enums";
import { TicketKind, TicketStatus } from "../../interfaces/enums";
import { formatTimeAR } from "../../utils/date";

function leftBorderByStatus(status: Ticket["status"]) {
  switch (status) {
    case "CERRADO":
      return "border-l-green-500";
    case "ABIERTO":
      return "border-l-orange-500";
    default:
      return "border-l-blue-500";
  }
}

function kindChip(kind: Ticket["kind"]) {
  if (kind === TicketKind.Z15)
    return "bg-green-100 text-green-700 border-green-200";
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
};

export default function TicketCard({ ticket }: Props) {
  return (
    <article
      className={[
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
        "border-l-4",
        leftBorderByStatus(ticket.status),
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-lg font-extrabold text-slate-900">
          {formatTimeAR(ticket.date)} HS
          {ticket.status === TicketStatus.CERRADO &&
            ticket.audit.closedBy &&
            ticket.audit.closedAt &&
            ` - ${formatTimeAR(ticket.audit.closedAt)} HS`}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={[
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
              kindChip(ticket.kind),
            ].join(" ")}
          >
            {ticket.kind}
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

          <span
            className={[
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold",
              ticket.status === TicketStatus.CERRADO
                ? "bg-green-100 text-green-700"
                : "bg-slate-100 text-slate-700",
            ].join(" ")}
          >
            {ticket.status}
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm font-extrabold text-blue-700">
        {ticket.title}
      </p>

      {ticket.details ? (
        <p className="mt-2 text-sm text-slate-700">{ticket.details}</p>
      ) : null}

      <div className="mt-4 space-y-1 text-sm text-slate-500">
        <div>
          Cargado por:{" "}
          <span className="font-semibold text-slate-700">
            {ticket.audit.createBy.name}
          </span>
        </div>

        {ticket.status === TicketStatus.CERRADO &&
        ticket.audit.closedBy &&
        ticket.audit.closedAt ? (
          <div>
            Cerrado por:{" "}
            <span className="font-semibold text-slate-700">
              {ticket.audit.closedBy.name}
            </span>
          </div>
        ) : null}
      </div>
    </article>
  );
}
