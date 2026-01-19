// src/services/tickets.service.ts
import type { ActorRef } from "../interfaces/ActorRef";
import type { Lpar, TicketKind } from "../interfaces/enums";
import { api, ApiError } from "./api";
import type { ApiListTicketsResponse, ApiTicket } from "./tickets.adapters";

export type TicketStatus = "ABIERTO" | "CERRADO";
export type ListMode = "NORMAL" | "HISTORY";

export type CreateTicketPayload = {
  ticketKind: TicketKind;
  operatorName: string;
  message: string;
  isReminder: boolean;
  siteId?: string;
  siteLabel?: string;
  createdAt?: string;
  lpar?: Lpar | null;
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

export type UpdateTicketPayload = Partial<{
  message: string;
  status: TicketStatus;
  siteId: string | null;
  siteLabel: string | null;
  isReminder: boolean;
  ticketKind: TicketKind;
  operatorName: string;
  lpar?: Lpar | null;

  archived: boolean;

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

export type CloseTicketPayload = {
  closedAt?: string;
  closedBy: ActorRef;
  closeDescription?: string;
  processResult?: "OK" | "ERROR";
};

export type ListTicketsParams = {
  page?: number;
  pageSize?: number;

  status?: TicketStatus;
  ticketKind?: TicketKind;
  isReminder?: boolean;

  // ✅ búsqueda global (histórico completo en el back)
  q?: string;

  // ✅ nuevo: NORMAL (default) / HISTORY
  // - Si q tiene texto, el back ignora el mode y busca en todo el histórico.
  mode?: ListMode;

  // ✅ nuevo: por defecto el back devuelve archived=false. Esto lo permite overridear.
  archived?: boolean;

  // (compat: si tu UI los usa hoy, los dejo sin romper)
  onlyToday?: boolean;
  sort?: "createdAtDesc" | "closedAtDesc";
};

function toQuery(params: ListTicketsParams) {
  const sp = new URLSearchParams();

  sp.set("page", String(params.page ?? 1));
  sp.set("pageSize", String(params.pageSize ?? 20));

  if (params.status) sp.set("status", params.status);
  if (params.ticketKind) sp.set("ticketKind", String(params.ticketKind));

  // ✅ el backend lo parsea como string ("true"/"false")
  if (params.isReminder !== undefined) {
    sp.set("isReminder", params.isReminder ? "true" : "false");
  }

  // ✅ modo NORMAL/HISTORY (solo importa si NO hay q)
  if (params.mode) sp.set("mode", params.mode);

  // ✅ archived (si lo mandás, overridea el default del back)
  if (params.archived !== undefined) {
    sp.set("archived", params.archived ? "true" : "false");
  }

  // ✅ búsqueda global: trim
  const q = (params.q ?? "").trim();
  if (q) sp.set("q", q);

  // compat
  if (params.onlyToday) {
    sp.set("onlyToday", "true");
    const tzOffsetMinutes = -new Date().getTimezoneOffset();
    sp.set("tzOffsetMinutes", String(tzOffsetMinutes));
  }

  // compat
  if (params.sort) sp.set("sort", params.sort);

  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

function normalizeUpdatePatch(patch: UpdateTicketPayload): UpdateTicketPayload {
  const p = patch;

  return {
    ...(p.message !== undefined ? { message: p.message } : {}),
    ...(p.status !== undefined ? { status: p.status } : {}),
    ...(p.siteId !== undefined ? { siteId: p.siteId } : {}),
    ...(p.siteLabel !== undefined ? { siteLabel: p.siteLabel } : {}),
    ...(p.isReminder !== undefined ? { isReminder: p.isReminder } : {}),
    ...(p.ticketKind !== undefined ? { ticketKind: p.ticketKind } : {}),
    ...(p.operatorName !== undefined ? { operatorName: p.operatorName } : {}),
    ...(p.lpar !== undefined ? { lpar: p.lpar } : {}),

    ...(p.archived !== undefined ? { archived: p.archived } : {}),
    ...(p.process !== undefined ? { process: p.process } : {}),
  };
}

function normalizeClosePayload(
  payload: CloseTicketPayload,
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

function throwNormalizedApiError(e: unknown): never {
  if (e instanceof ApiError) {
    // si el backend mandó { error: "..." }
    if (
      typeof e.body === "object" &&
      e.body !== null &&
      "error" in e.body &&
      typeof (e.body as { error?: unknown }).error === "string"
    ) {
      const err = new Error((e.body as { error: string }).error) as Error & {
        status?: number;
      };
      err.status = e.status;
      throw err;
    }

    // fallback: el mensaje del ApiError (ej: statusText o .message)
    const err = new Error(e.message) as Error & { status?: number };
    err.status = e.status;
    throw err;
  }

  if (e instanceof Error) throw e;
  throw new Error("REQUEST_FAILED");
}

export const ticketsService = {
  list: (params: ListTicketsParams = {}) =>
    api.get<ApiListTicketsResponse>(`/tickets${toQuery(params)}`),

  getById: (id: string) => api.get<ApiTicket>(`/tickets/${id}`),

  create: async (payload: CreateTicketPayload) => {
    try {
      return await api.post<ApiTicket>(`/tickets`, payload);
    } catch (e: unknown) {
      throwNormalizedApiError(e);
    }
  },

  update: async (id: string, patch: UpdateTicketPayload) => {
    try {
      return await api.patch<ApiTicket>(
        `/tickets/${id}`,
        normalizeUpdatePatch(patch),
      );
    } catch (e: unknown) {
      throwNormalizedApiError(e);
    }
  },

  close: async (id: string, payload: CloseTicketPayload) => {
    try {
      return await api.patch<ApiTicket>(
        `/tickets/${id}/close`,
        normalizeClosePayload(payload),
      );
    } catch (e: unknown) {
      throwNormalizedApiError(e);
    }
  },
};
