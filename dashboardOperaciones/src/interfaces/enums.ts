export const TicketStatus = {
  ABIERTO: "ABIERTO",
  CERRADO: "CERRADO",
  PENDIENTE: "PENDIENTE",
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketKind = {
  NOTICIA: "NOTICIA",
  INGRESO: "INGRESO",
  PROCESO_Z15: "PROCESO_Z15",
} as const;

export type TicketKind = (typeof TicketKind)[keyof typeof TicketKind];

export const TicketTag = {
  RECORDATORIO: "RECORDATORIO",
  MENCIONES: "MENCIONES",
  IMPORTANTE: "IMPORTANTE",
} as const;

export type TicketTag = (typeof TicketTag)[keyof typeof TicketTag];
