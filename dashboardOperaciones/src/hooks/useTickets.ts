import { useCallback, useMemo, useState } from "react";
import type { Ticket } from "../interfaces/Ticket";
import type { ActorRef } from "../interfaces/ActorRef";
import { TicketKind, TicketStatus, TicketTag } from "../interfaces/enums";

export type CreateTicketInput = {
  ticketKind: string;
  operator: ActorRef;
  message: string;
  site?: string;
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
  createTicket: (input: CreateTicketInput, actor?: ActorRef) => void;
  closeTicket: (input: CloseTicketInput) => void;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function extractMentions(text: string): string[] {
  // soporte simple: @usuario
  const matches = text.match(/@([a-zA-Z0-9_]+)/g) ?? [];
  const names = matches.map((m) => m.slice(1)).filter(Boolean);
  // únicos
  return Array.from(new Set(names));
}

export default function useTickets(
  initialTickets: Ticket[] = []
): UseTicketsResult {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);

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
    (input: CreateTicketInput, actor?: ActorRef) => {
      const now = new Date();

      const mentions = extractMentions(input.message);

      const tags: TicketTag[] = [];
      if (input.isReminder) tags.push(TicketTag.RECORDATORIO);
      if (mentions.length > 0) tags.push(TicketTag.MENCIONES);

      const createBy: ActorRef = actor ?? input.operator;

      const base: Ticket = {
        id: uid(),
        date: now,
        kind: input.ticketKind,
        operatorLabel: input.operator.name, //
        title: input.message.trim(),
        details: "",
        status: TicketStatus.ABIERTO,
        tags: tags.length ? tags : [],
        mentions,
        audit: {
          createdAt: now,
          createBy,
        },
      } as Ticket;
      // sitio solo cuando kind = INGRESO
      const ticket: Ticket =
        input.ticketKind === TicketKind.INGRESO
          ? ({
              ...base,
              site: (input.site ?? "").trim(),
            } as Ticket)
          : base;

      setTickets((prev) => [ticket, ...prev]);
    },
    []
  );

  const closeTicket = useCallback((input: CloseTicketInput) => {
    const now = new Date();
    const closedAt = input.closedAt ?? now;

    const closedBy: ActorRef = input.closedBy;

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== input.ticketId) return t;

        return {
          ...t,
          status: TicketStatus.CERRADO,
          details: input.closeDescription.trim()
            ? input.closeDescription.trim()
            : t.details,
          audit: {
            ...t.audit,
            closedAt,
            closedBy,
            updatedAt: now,
            updatedBy: closedBy,
          },
        };
      })
    );
  }, []);

  return { tickets, counts, createTicket, closeTicket };
}
