import { useCallback, useEffect, useMemo, useState } from "react";
import type { Ticket } from "../interfaces/Ticket";
import type { ActorRef } from "../interfaces/ActorRef";
import { TicketKind, TicketStatus, TicketTag } from "../interfaces/enums";
import { ticketsService } from "../services/tickets.service";

import {
  apiTicketToTicket,
  createTicketInputToApiBody,
  closeTicketInputToApiBody,
} from "../services/tickets.adapters";

export type CreateTicketInput = {
  ticketKind: TicketKind;
  operator: ActorRef;
  message: string;
  siteId?: string;
  siteLabel?: string;
  isReminder: boolean;
};

export type CloseTicketInput = {
  ticketId: string;
  closedBy: ActorRef;
  closeDescription: string;
  closedAt?: Date;
};

type UseTicketsResult = {
  tickets: Ticket[];
  counts: {
    total: number;
    abiertos: number;
    cerrados: number;
    recordatorios: number;
  };
  createTicket: (input: CreateTicketInput) => Promise<void>;
  closeTicket: (input: CloseTicketInput) => Promise<void>;
};

export default function useTickets(): UseTicketsResult {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const fetchTickets = useCallback(async () => {
    const res = await ticketsService.list({ page: 1, pageSize: 100 });

    const mapped = res.items.map(apiTicketToTicket);
    setTickets(mapped);
  }, []);

  // ✅ FIX warning effect
  useEffect(() => {
    (async () => {
      try {
        await fetchTickets();
      } catch (e) {
        console.error(e);
      }
    })();
  }, [fetchTickets]);

  const counts = useMemo(() => {
    const total = tickets.length;
    const cerrados = tickets.filter(
      (t) => t.status === TicketStatus.CERRADO
    ).length;
    const abiertos = tickets.filter(
      (t) => t.status === TicketStatus.ABIERTO
    ).length;
    const recordatorios = tickets.filter((t) =>
      t.tags?.includes(TicketTag.RECORDATORIO)
    ).length;

    return { total, abiertos, cerrados, recordatorios };
  }, [tickets]);

  const createTicket = useCallback(
    async (input: CreateTicketInput) => {
      const body = createTicketInputToApiBody(input);
      console.log("POST /tickets payload =>", JSON.stringify(body));
      await ticketsService.create(body);
      await fetchTickets();
    },
    [fetchTickets]
  );

  const closeTicket = useCallback(
    async (input: CloseTicketInput) => {
      const body = closeTicketInputToApiBody({ closedAt: input.closedAt });
      await ticketsService.close(input.ticketId, body);

      await fetchTickets();
    },
    [fetchTickets]
  );

  return { tickets, counts, createTicket, closeTicket };
}
