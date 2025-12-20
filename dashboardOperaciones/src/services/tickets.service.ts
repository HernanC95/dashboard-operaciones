// src/services/tickets.service.ts
import type { TicketKind } from "../interfaces/enums";
import { api } from "./api";

export type TicketStatus = "ABIERTO" | "CERRADO";

export type Ticket = {
  id: string;
  ticketKind: TicketKind;
  status: TicketStatus;
  message: string;
  siteId: string | null;
  siteLabel: string | null;
  isReminder: boolean;
  operatorName: string;
  createdAt: string; // ISO
  updatedAt: string | null; // ISO
  closedAt: string | null; // ISO
};

export type ListTicketsResponse = {
  items: Ticket[];
  page: number;
  pageSize: number;
  total: number;
};

// ✅ DTO del BACK para crear
export type CreateTicketPayload = {
  ticketKind: TicketKind;
  operatorName: string;
  message: string;
  isReminder: boolean;
  siteId?: string | null;
  siteLabel?: string | null;
};

export type UpdateTicketPayload = Partial<
  Pick<
    Ticket,
    | "message"
    | "status"
    | "siteId"
    | "siteLabel"
    | "isReminder"
    | "ticketKind"
    | "operatorName"
  >
>;

export type CloseTicketPayload = {
  closedAt?: string; // ISO opcional
};

export type ListTicketsParams = {
  page?: number;
  pageSize?: number;
  status?: TicketStatus;
  ticketKind?: TicketKind;
  isReminder?: boolean;
  q?: string;
};

function toQuery(params: ListTicketsParams) {
  const sp = new URLSearchParams();

  if (params.page != null) sp.set("page", String(params.page));
  if (params.pageSize != null) sp.set("pageSize", String(params.pageSize));
  if (params.status) sp.set("status", params.status);
  if (params.ticketKind) sp.set("ticketKind", params.ticketKind);
  if (params.isReminder !== undefined)
    sp.set("isReminder", String(params.isReminder));
  if (params.q) sp.set("q", params.q);

  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

function normalizeUpdatePatch(patch: UpdateTicketPayload): UpdateTicketPayload {
  // si mandás undefined, mejor ni incluirlo (pero si viene null, lo respetamos)
  const cleaned: UpdateTicketPayload = { ...patch };

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

  return cleaned;
}

export const ticketsService = {
  list: (params: ListTicketsParams = {}) =>
    api.get<ListTicketsResponse>(`/tickets${toQuery(params)}`),

  getById: (id: string) => api.get<Ticket>(`/tickets/${id}`),

  // ✅ acepta CreateTicketPayload y lo normaliza antes de mandar
  create: (payload: CreateTicketPayload) =>
    api.post<Ticket>(`/tickets`, payload),

  // ✅ limpia undefined para no mandar campos “raros”
  update: (id: string, patch: UpdateTicketPayload) =>
    api.patch<Ticket>(`/tickets/${id}`, normalizeUpdatePatch(patch)),

  close: (id: string, payload: CloseTicketPayload = {}) =>
    api.patch<Ticket>(`/tickets/${id}/close`, payload),
};
