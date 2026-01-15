import type { ProcessZ15 } from "./ProcessZ15";
import type { TicketAudit } from "./TicketAudit";
import type { Lpar, TicketKind, TicketStatus, TicketTag } from "./enums";
import { TicketKind as TicketKindValues } from "./enums";

type TicketBase = {
  id: string;

  // ✅ id numérico para referencia humana
  publicId: number;

  date: Date;
  ticketKind: TicketKind;
  operatorLabel: string;
  details: string;
  status: TicketStatus;
  tags?: TicketTag[];
  mentions?: string[];
  audit: TicketAudit;
  process?: ProcessZ15;
  meta?: TicketMeta;
  lpar?: Lpar | null;

  // ✅ archivado
  archived: boolean;
  archivedAt?: Date | null;
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

export type TicketMeta = {
  closeDescription?: string;
  [k: string]: unknown;
};
