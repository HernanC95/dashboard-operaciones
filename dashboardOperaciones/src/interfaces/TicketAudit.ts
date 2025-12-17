import type { ActorRef } from "./ActorRef";

export interface TicketAudit {
  createdAt: Date;
  createBy: ActorRef;

  closedAt?: Date;
  closedBy?: ActorRef;

  updatedAt?: Date;
  updatedBy?: ActorRef;
}
