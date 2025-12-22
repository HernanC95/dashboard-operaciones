// src/hooks/useTickets.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Ticket } from "../interfaces/Ticket";
import type { ActorRef } from "../interfaces/ActorRef";
import { Lpar, TicketKind, TicketStatus, TicketTag } from "../interfaces/enums";
import { ticketsService } from "../services/tickets.service";

import {
  apiTicketToTicket,
  createTicketInputToApiBody,
} from "../services/tickets.adapters";
import type { ProcessZ15 } from "../interfaces/ProcessZ15";

export type CreateTicketInput = {
  ticketKind: TicketKind;
  operator: ActorRef;
  message: string;
  siteId?: string;
  siteLabel?: string;
  isReminder: boolean;
  createdAt?: Date;
  process?: ProcessZ15;
  lpar?: Lpar | null;
};

export type CloseTicketInput = {
  ticketId: string;

  // ✅ REQUIRED
  closedBy: ActorRef;

  closeDescription: string;
  closedAt?: Date;

  // ✅ Z15: resultado FINAL (solo para procesos largos/control, y cuando aplique)
  processResult?: "OK" | "ERROR";

  // ✅ patch previo al cierre (PATCH /tickets/:id)
  processMetaPatch?: Record<string, unknown>;
  processCheckpointsPatch?: Array<{ label: string; at: string }>;
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

function sortTicketsByMostRecentActivityDesc(a: Ticket, b: Ticket) {
  const aDate =
    a.status === TicketStatus.CERRADO && a.audit.closedAt
      ? a.audit.closedAt
      : a.audit.createdAt;

  const bDate =
    b.status === TicketStatus.CERRADO && b.audit.closedAt
      ? b.audit.closedAt
      : b.audit.createdAt;

  return bDate.getTime() - aDate.getTime();
}

export default function useTickets(): UseTicketsResult {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const fetchTickets = useCallback(async () => {
    // ✅ SOLO HOY (creación o cierre) – lo filtra el BACK
    const res = await ticketsService.list({
      page: 1,
      pageSize: 1000,
      onlyToday: true,
      // sort: "activityDesc", // si lo implementaste en el back, perfecto dejarlo.
    });

    const mapped = res.items.map(apiTicketToTicket);

    // ✅ Seguridad extra: ordenamos en front por "actividad más reciente"
    // (cerrado => closedAt, sino createdAt)
    mapped.sort(sortTicketsByMostRecentActivityDesc);

    setTickets(mapped);
  }, []);

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
      await ticketsService.create(body);
      await fetchTickets();
    },
    [fetchTickets]
  );

  const closeTicket = useCallback(
    async (input: CloseTicketInput) => {
      if (!input.closedBy) {
        throw new Error("closeTicket: 'closedBy' es requerido.");
      }

      const closeDescTrim = (input.closeDescription ?? "").trim();

      const hasMetaPatch =
        input.processMetaPatch &&
        Object.keys(input.processMetaPatch).length > 0;

      const hasCheckpointsPatch = Boolean(
        input.processCheckpointsPatch?.length
      );

      // ✅ 1) PATCH /tickets/:id SOLO para cosas del proceso (meta/checkpoints/result)
      // OJO: closeDescription NO lo guardamos acá, porque NOTICIA/INGRESO lo necesitan
      // y eso va en /close (root).
      const needsProcessPatch =
        hasMetaPatch ||
        hasCheckpointsPatch ||
        input.processResult !== undefined;

      if (needsProcessPatch) {
        await ticketsService.update(input.ticketId, {
          process: {
            ...(input.processResult !== undefined
              ? { result: input.processResult }
              : {}),
            ...(hasCheckpointsPatch
              ? { checkpoints: input.processCheckpointsPatch }
              : {}),
            ...(hasMetaPatch ? { meta: input.processMetaPatch! } : {}),
          },
        });
      }

      // ✅ 2) PATCH /tickets/:id/close con lo que corresponde al cierre (root)
      await ticketsService.close(input.ticketId, {
        closedAt: input.closedAt ? input.closedAt.toISOString() : undefined,
        closedBy: input.closedBy,
        ...(closeDescTrim ? { closeDescription: closeDescTrim } : {}),
        ...(input.processResult !== undefined
          ? { processResult: input.processResult }
          : {}),
      });

      await fetchTickets();
    },
    [fetchTickets]
  );

  return { tickets, counts, createTicket, closeTicket };
}
