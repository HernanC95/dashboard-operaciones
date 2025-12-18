import type { TicketAudit } from "./TicketAudit";
import type { TicketKind, TicketStatus, TicketTag } from "./enums";
import { TicketKind as TicketKindValues } from "./enums";

type TicketBase = {
  id: string;
  date: Date;
  ticketKind: TicketKind;
  operatorLabel: string;
  details: string;
  status: TicketStatus;
  tags?: TicketTag[];
  mentions?: string[];
  audit: TicketAudit;
};

export type TicketIngreso = TicketBase & {
  ticketKind: typeof TicketKindValues.INGRESO;
  siteId: string;
  siteLabel: string;
};

export type TicketNoIngreso = TicketBase & {
  ticketKind: Exclude<TicketKind, typeof TicketKindValues.INGRESO>;
  siteId?: never;
  siteLabel?: never;
};

export type Ticket = TicketIngreso | TicketNoIngreso;
