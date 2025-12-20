// src/services/tickets.adapters.ts
import type {
  Ticket,
  TicketIngreso,
  TicketNoIngreso,
} from "../interfaces/Ticket";
import type { TicketAudit } from "../interfaces/TicketAudit";
import type { ActorRef } from "../interfaces/ActorRef";
import { TicketKind, TicketStatus, TicketTag } from "../interfaces/enums";

// -------------------------
// DTOs (lo que viene del back)
// -------------------------
// OJO: ticketKind/back NO coincide con TicketKind/front
export type ApiTicketKind = "INGRESO" | "NO_INGRESO" | (string & {});
export type ApiTicketStatus = "ABIERTO" | "CERRADO" | (string & {});

export type ApiTicket = {
  id: string;
  ticketKind: ApiTicketKind;
  status: ApiTicketStatus;
  message: string;

  siteId: string | null;
  siteLabel: string | null;

  isReminder: boolean;
  operatorName: string;

  createdAt: string; // ISO
  updatedAt: string | null;
  closedAt: string | null;
};

export type ApiListTicketsResponse = {
  items: ApiTicket[];
  page: number;
  pageSize: number;
  total: number;
};

// -------------------------
// Helpers
// -------------------------
function toDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function actorFromName(name: string | null | undefined): ActorRef {
  const n = (name ?? "Desconocido").trim();
  // Ajustá si tu ActorRef requiere más campos
  return { id: "unknown", name: n } as ActorRef;
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_]+)/g) ?? [];
  const names = matches.map((m) => m.slice(1)).filter(Boolean);
  return Array.from(new Set(names));
}

// Back -> Front (kind)
function mapApiKindToUiKind(apiKind: ApiTicketKind): TicketKind {
  // Back real: INGRESO | NO_INGRESO
  if (apiKind === "INGRESO") return TicketKind.INGRESO;

  if (apiKind === "NO_INGRESO") {
    // Elegí default de UI para "no ingreso"
    return TicketKind.NOTICIA;
  }

  // Si en el futuro el back agrega algo, no rompas:
  if (apiKind === "Z15") return TicketKind.Z15;
  if (apiKind === "NOTICIA") return TicketKind.NOTICIA;

  return TicketKind.NOTICIA;
}

// Back -> Front (status)
function mapStatus(apiStatus: ApiTicketStatus): TicketStatus {
  return apiStatus === "CERRADO" ? TicketStatus.CERRADO : TicketStatus.ABIERTO;
}

function buildTags(
  message: string,
  isReminder: boolean
): { tags: TicketTag[]; mentions: string[] } {
  const mentions = extractMentions(message);

  const tags: TicketTag[] = [];
  if (isReminder) tags.push(TicketTag.RECORDATORIO);
  if (mentions.length) tags.push(TicketTag.MENCIONES);

  return { tags, mentions };
}

// -------------------------
// Adapter principal: ApiTicket -> Ticket (Front)
// -------------------------
export function apiTicketToTicket(api: ApiTicket): Ticket {
  const createdAt = toDate(api.createdAt) ?? new Date();
  const updatedAt = toDate(api.updatedAt);
  const closedAt = toDate(api.closedAt);

  const ticketKind = mapApiKindToUiKind(api.ticketKind);
  const status = mapStatus(api.status);

  const { tags, mentions } = buildTags(api.message, api.isReminder);

  const audit: TicketAudit = {
    createdAt,
    createBy: actorFromName(api.operatorName),
    updatedAt,
    updatedBy: updatedAt ? actorFromName(api.operatorName) : undefined,
    closedAt,
    closedBy: undefined,
  };

  const common = {
    id: api.id,
    date: createdAt,
    ticketKind,
    operatorLabel: api.operatorName,
    details: api.message,
    status,
    tags,
    mentions,
    audit,
  };

  if (ticketKind === TicketKind.INGRESO) {
    return {
      ...common,
      ticketKind: TicketKind.INGRESO,
      siteId: api.siteId ?? "",
      siteLabel: api.siteLabel ?? "",
    } satisfies TicketIngreso;
  }

  return {
    ...common,
    ticketKind: ticketKind as Exclude<TicketKind, typeof TicketKind.INGRESO>,
  } satisfies TicketNoIngreso;
}

// -------------------------
// Adapter inverso: Front -> Back (POST)
// -------------------------
export type CreateTicketBody = {
  ticketKind: TicketKind;
  operatorName: string;
  message: string;
  isReminder: boolean;
  siteId?: string | null;
  siteLabel?: string | null;
};

export function createTicketInputToApiBody(input: {
  ticketKind: TicketKind;
  operator: ActorRef;
  message: string;
  isReminder: boolean;
  siteId?: string;
  siteLabel?: string;
}) {
  const body: CreateTicketBody = {
    ticketKind: input.ticketKind,
    operatorName: input.operator.name,
    message: input.message,
    isReminder: input.isReminder,
  };

  if (input.ticketKind === TicketKind.INGRESO) {
    body.siteId = input.siteId ?? "";
    body.siteLabel = input.siteLabel ?? "";
  }

  return body;
}

// -------------------------
// Adapter para CLOSE (front -> back)
// -------------------------
export type CloseTicketBody = {
  closedAt?: string; // ISO
};

export function closeTicketInputToApiBody(input: {
  closedAt?: Date;
}): CloseTicketBody {
  return {
    closedAt: input.closedAt ? input.closedAt.toISOString() : undefined,
  };
}
