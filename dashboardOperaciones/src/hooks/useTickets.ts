import { useCallback, useMemo, useState } from "react";
import type {
  Ticket,
  TicketIngreso,
  TicketNoIngreso,
} from "../interfaces/Ticket";
import type { ActorRef } from "../interfaces/ActorRef";
import { TicketKind, TicketStatus, TicketTag } from "../interfaces/enums";

export type CreateTicketInput = {
  ticketKind: TicketKind;
  operator: ActorRef;
  message: string;
  siteId?: string;
  siteLabel?: string;
  isReminder: boolean;
  createdAt?: Date;
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
  const matches = text.match(/@([a-zA-Z0-9_]+)/g) ?? [];
  const names = matches.map((m) => m.slice(1)).filter(Boolean);
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
      const createdAt = input.createdAt ?? new Date();

      const mentions = extractMentions(input.message);

      const tags: TicketTag[] = [];
      if (input.isReminder) tags.push(TicketTag.RECORDATORIO);
      if (mentions.length > 0) tags.push(TicketTag.MENCIONES);

      const createBy: ActorRef = actor ?? input.operator;

      const common = {
        id: uid(),
        date: createdAt,
        ticketKind: input.ticketKind,
        operatorLabel: input.operator.name,
        details: input.message.trim(),
        status: TicketStatus.ABIERTO,
        tags: tags.length ? tags : [],
        mentions,
        audit: {
          createdAt,
          createBy,
        },
      };

      const ticket: Ticket =
        input.ticketKind === TicketKind.INGRESO
          ? ({
              ...common,
              ticketKind: TicketKind.INGRESO,
              siteId: input.siteId ?? "",
              siteLabel: input.siteLabel ?? "",
            } satisfies TicketIngreso)
          : ({
              ...common,
              ticketKind: input.ticketKind as Exclude<
                TicketKind,
                typeof TicketKind.INGRESO
              >,
            } satisfies TicketNoIngreso);

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
          tags: (t.tags ?? []).filter((tag) => tag !== TicketTag.RECORDATORIO),
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
