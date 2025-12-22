// src/services/tickets.adapters.ts
import type {
  Ticket,
  TicketIngreso,
  TicketNoIngreso,
} from "../interfaces/Ticket";
import type { TicketAudit } from "../interfaces/TicketAudit";
import type { ActorRef } from "../interfaces/ActorRef";
import { Lpar, TicketKind, TicketStatus, TicketTag } from "../interfaces/enums";
import type { ProcessZ15 } from "../interfaces/ProcessZ15";

// -------------------------
// DTOs (lo que viene del back)
// -------------------------
export type ApiTicketKind = "INGRESO" | "Z15" | "NOTICIA" | (string & {});
export type ApiTicketStatus = "ABIERTO" | "CERRADO" | (string & {});

export type ApiProcessGroup = "PROCESOS_Z15" | (string & {});
export type ApiProcessType =
  | "EJECUCION_LARGA"
  | "EJECUCION_CORTA"
  | "CONTROL_OPERATIVO"
  | (string & {});
export type ApiProcessFrequency =
  | "DIARIO"
  | "SEMANAL"
  | "MENSUAL"
  | (string & {});
export type ApiProcessResult = "OK" | "ERROR" | (string & {});

export type ApiTicketCheckpoint = {
  label: string;
  at: string; // ISO
};

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

  closedById: string | null;
  closedByName: string | null;

  // 🆕 PROCESOS_Z15 (opcionales)
  processGroup?: ApiProcessGroup | null;
  processCode?: string | null;
  processType?: ApiProcessType | null;
  frequency?: ApiProcessFrequency | null;
  result?: ApiProcessResult | null;
  meta?: Record<string, unknown> | null;
  checkpoints?: ApiTicketCheckpoint[] | null;

  // ✅ NUEVO: LPAR
  lpar: Lpar | null;
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
  return { id: "unknown", name: n } as ActorRef;
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_]+)/g) ?? [];
  const names = matches.map((m) => m.slice(1)).filter(Boolean);
  return Array.from(new Set(names));
}

function mapApiKindToUiKind(apiKind: ApiTicketKind): TicketKind {
  if (apiKind === "INGRESO") return TicketKind.INGRESO;
  if (apiKind === "Z15") return TicketKind.Z15;
  if (apiKind === "NOTICIA") return TicketKind.NOTICIA;
  return TicketKind.NOTICIA;
}

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

function mapApiProcessToProcessZ15(api: ApiTicket): ProcessZ15 | undefined {
  if (
    !api.processGroup ||
    !api.processCode ||
    !api.processType ||
    !api.frequency
  ) {
    return undefined;
  }

  if (api.processGroup !== "PROCESOS_Z15") return undefined;

  const checkpoints =
    api.checkpoints?.map((c) => ({
      label: c.label,
      at: toDate(c.at) ?? new Date(c.at),
    })) ?? undefined;

  return {
    group: "PROCESOS_Z15",
    code: api.processCode as ProcessZ15["code"],
    type: api.processType as ProcessZ15["type"],
    frequency: api.frequency as ProcessZ15["frequency"],
    result: (api.result ?? undefined) as ProcessZ15["result"] | undefined,
    meta: api.meta ?? undefined,
    checkpoints,
  };
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
  const details = api.message;
  const { tags, mentions } = buildTags(details, api.isReminder);

  const audit: TicketAudit = {
    createdAt,
    createBy: actorFromName(api.operatorName),

    updatedAt,
    updatedBy: undefined,

    closedAt,
    closedBy:
      api.closedById || api.closedByName
        ? {
            id: api.closedById ?? "unknown",
            name: api.closedByName ?? "Desconocido",
          }
        : undefined,
  };

  const common = {
    id: api.id,
    date: createdAt,
    ticketKind,
    operatorLabel: api.operatorName,
    details,
    status,
    tags,
    mentions,
    audit,

    // ✅ meta root
    meta: (api.meta ?? undefined) as Record<string, unknown> | undefined,

    // 🆕 PROCESOS_Z15
    process: mapApiProcessToProcessZ15(api),

    // ✅ LPAR
    lpar: api.lpar ?? null,
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
  siteId?: string;
  siteLabel?: string;
  createdAt?: string;

  // ✅ NUNCA null (Zod enum no lo acepta)
  lpar?: Lpar;

  // 🆕 PROCESOS_Z15
  process?: {
    group: "PROCESOS_Z15";
    code: string;
    type: "EJECUCION_LARGA" | "EJECUCION_CORTA" | "CONTROL_OPERATIVO";
    frequency: "DIARIO" | "SEMANAL" | "MENSUAL";
    result?: "OK" | "ERROR";
    meta?: Record<string, unknown>;
    checkpoints?: { label: string; at: string }[];
  };
};

export function createTicketInputToApiBody(input: {
  ticketKind: TicketKind;
  operator: ActorRef;
  message: string;
  isReminder: boolean;
  siteId?: string;
  siteLabel?: string;
  createdAt?: Date;

  // 🆕 Z15
  process?: ProcessZ15;
  lpar?: Lpar | null;
}): CreateTicketBody {
  const body: CreateTicketBody = {
    ticketKind: input.ticketKind,
    operatorName: input.operator.name,
    message: input.message,
    isReminder: input.isReminder,
  };

  // INGRESO
  if (input.ticketKind === TicketKind.INGRESO) {
    body.siteId = input.siteId ?? "";
    body.siteLabel = input.siteLabel ?? "";
  }

  // Fecha manual
  if (input.createdAt) {
    body.createdAt = input.createdAt.toISOString();
  }

  // ✅ Z15
  if (input.ticketKind === TicketKind.Z15) {
    // 🔥 FIX: no mandar null (Zod enum lo rechaza)
    if (input.lpar != null) {
      body.lpar = input.lpar;
    }

    if (input.process) {
      body.process = {
        group: input.process.group,
        code: input.process.code,
        type: input.process.type,
        frequency: input.process.frequency,
        result: input.process.result,
        meta: input.process.meta,
        checkpoints: input.process.checkpoints?.map((c) => ({
          label: c.label,
          at: c.at.toISOString(),
        })),
      };
    }
  }

  return body;
}

// -------------------------
// Adapter para CLOSE (front -> back)
// -------------------------
export type CloseTicketBody = {
  closedAt?: string; // ISO
  closedBy: ActorRef;
};

export function closeTicketInputToApiBody(input: {
  closedAt?: Date;
  closedBy: ActorRef;
}): CloseTicketBody {
  return {
    closedAt: input.closedAt ? input.closedAt.toISOString() : undefined,
    closedBy: input.closedBy,
  };
}
