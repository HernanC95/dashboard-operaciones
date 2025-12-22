// src/services/tickets.service.ts
import type { ActorRef } from "../interfaces/ActorRef";
import type { Lpar, TicketKind } from "../interfaces/enums";
import { api } from "./api";
import type { ApiListTicketsResponse, ApiTicket } from "./tickets.adapters";

export type TicketStatus = "ABIERTO" | "CERRADO";

// ✅ DTO del BACK para crear (lo que tu API espera)
export type CreateTicketPayload = {
  ticketKind: TicketKind;
  operatorName: string;
  message: string;
  isReminder: boolean;
  siteId?: string;
  siteLabel?: string;
  createdAt?: string;
  lpar?: Lpar | null;
  // 🆕 PROCESOS_Z15 (si el front lo manda)
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

// ✅ PATCH /tickets/:id (tu backend UpdateTicketDto)
export type UpdateTicketPayload = Partial<{
  message: string;
  status: TicketStatus;
  siteId: string | null;
  siteLabel: string | null;
  isReminder: boolean;
  ticketKind: TicketKind;
  operatorName: string;
  lpar?: Lpar | null;
  // 🆕 PROCESOS_Z15
  process: Partial<{
    group: "PROCESOS_Z15";
    code: string;
    type: "EJECUCION_LARGA" | "EJECUCION_CORTA" | "CONTROL_OPERATIVO";
    frequency: "DIARIO" | "SEMANAL" | "MENSUAL";
    result: "OK" | "ERROR";
    meta: Record<string, unknown>;
    checkpoints: { label: string; at: string }[];
  }>;
}>;

// ✅ /tickets/:id/close (tu backend CloseTicketDto)
// OJO: en tu Zod CloseTicketDto, closedBy es REQUERIDO
export type CloseTicketPayload = {
  closedAt?: string; // ISO opcional
  closedBy: ActorRef; // {id, name}

  // 🆕 (según tu CloseTicketDto actual)
  closeDescription?: string;
  processResult?: "OK" | "ERROR";
};

export type ListTicketsParams = {
  page?: number;
  pageSize?: number;
  status?: TicketStatus;
  ticketKind?: TicketKind;
  isReminder?: boolean;
  q?: string;

  // 🆕
  onlyToday?: boolean;
  sort?: "createdAtDesc" | "closedAtDesc";
};

function toQuery(params: ListTicketsParams) {
  const sp = new URLSearchParams();

  sp.set("page", String(params.page ?? 1));
  sp.set("pageSize", String(params.pageSize ?? 20));

  if (params.status) sp.set("status", params.status);
  if (params.ticketKind) sp.set("ticketKind", String(params.ticketKind));
  if (params.isReminder !== undefined)
    sp.set("isReminder", String(params.isReminder));
  if (params.q) sp.set("q", params.q);

  // 🆕 filtro "solo hoy" (el back lo interpreta con tzOffsetMinutes)
  if (params.onlyToday) {
    sp.set("onlyToday", "true");
    const tzOffsetMinutes = -new Date().getTimezoneOffset(); // AR ≈ -180
    sp.set("tzOffsetMinutes", String(tzOffsetMinutes));
  }

  // 🆕 orden
  if (params.sort) sp.set("sort", params.sort);

  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

function normalizeUpdatePatch(patch: UpdateTicketPayload): UpdateTicketPayload {
  const cleaned: UpdateTicketPayload = { ...patch };

  // si es undefined, mejor no mandarlo
  if ("siteId" in cleaned && cleaned.siteId === undefined)
    delete cleaned.siteId;
  if ("siteLabel" in cleaned && cleaned.siteLabel === undefined)
    delete cleaned.siteLabel;
  if ("message" in cleaned && cleaned.message === undefined)
    delete cleaned.message;
  if ("status" in cleaned && cleaned.status === undefined)
    delete cleaned.status;
  if ("ticketKind" in cleaned && cleaned.ticketKind === undefined)
    delete cleaned.ticketKind;
  if ("operatorName" in cleaned && cleaned.operatorName === undefined)
    delete cleaned.operatorName;
  if ("isReminder" in cleaned && cleaned.isReminder === undefined)
    delete cleaned.isReminder;

  // process: si viene undefined, no mandarlo
  if ("process" in cleaned && cleaned.process === undefined)
    delete cleaned.process;

  return cleaned;
}

function normalizeClosePayload(
  payload: CloseTicketPayload
): CloseTicketPayload {
  const cleaned: CloseTicketPayload = { ...payload };

  if ("closedAt" in cleaned && cleaned.closedAt === undefined)
    delete cleaned.closedAt;
  if ("closeDescription" in cleaned && cleaned.closeDescription === undefined)
    delete cleaned.closeDescription;
  if ("processResult" in cleaned && cleaned.processResult === undefined)
    delete cleaned.processResult;

  return cleaned;
}

export const ticketsService = {
  // ✅ LIST devuelve DTO del back (ApiTicket[])
  list: (params: ListTicketsParams = {}) =>
    api.get<ApiListTicketsResponse>(`/tickets${toQuery(params)}`),

  // ✅ GET devuelve DTO del back
  getById: (id: string) => api.get<ApiTicket>(`/tickets/${id}`),

  // ✅ POST /tickets (CreateTicketDto)
  create: (payload: CreateTicketPayload) =>
    api.post<ApiTicket>(`/tickets`, payload),

  // ✅ PATCH /tickets/:id (UpdateTicketDto)
  update: (id: string, patch: UpdateTicketPayload) =>
    api.patch<ApiTicket>(`/tickets/${id}`, normalizeUpdatePatch(patch)),

  // ✅ PATCH /tickets/:id/close (CloseTicketDto)
  close: (id: string, payload: CloseTicketPayload) =>
    api.patch<ApiTicket>(
      `/tickets/${id}/close`,
      normalizeClosePayload(payload)
    ),
};
