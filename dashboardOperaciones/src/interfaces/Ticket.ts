import type { TicketAudit } from "./TicketAudit";
import type { TicketKind, TicketStatus, TicketTag } from "./enums";
import { TicketKind as TicketKindValues } from "./enums";

type TicketBase = {
  id: string;
  date: Date;

  kind: TicketKind;
  operatorLabel: string;

  title: string;
  details?: string;

  status: TicketStatus;

  tags?: TicketTag[];
  mentions?: string[];

  audit: TicketAudit;
};

export type TicketIngreso = TicketBase & {
  kind: typeof TicketKindValues.INGRESO;
  site: string;
};

export type TicketNoIngreso = TicketBase & {
  kind: Exclude<TicketKind, typeof TicketKindValues.INGRESO>;
  site?: never;
};

export type Ticket = TicketIngreso | TicketNoIngreso;
