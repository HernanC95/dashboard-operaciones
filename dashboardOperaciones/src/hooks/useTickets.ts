// src/hooks/useTickets.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  closedBy: ActorRef;
  closeDescription: string;
  closedAt?: Date;

  processResult?: "OK" | "ERROR";
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

  // ✅ NUEVO
  archiveTicket: (ticketId: string) => Promise<void>;

  // 🆕 Editar descripción
  updateTicketMessage: (ticketId: string, message: string) => Promise<void>;
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

function extractErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;

  // por si ticketsService lanza algo tipo { error: "..." }
  if (typeof e === "object" && e !== null && "error" in e) {
    const v = (e as { error?: unknown }).error;
    if (typeof v === "string") return v;
  }

  return "Error inesperado.";
}

export default function useTickets(): UseTicketsResult {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const POLL_MS = 10_000;

  const isFetchingRef = useRef(false);
  const pollTimerRef = useRef<number | null>(null);

  const fetchTickets = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const res = await ticketsService.list({
        page: 1,
        pageSize: 1000,
        onlyToday: true,
      });

      const items = Array.isArray(res?.items) ? res.items : [];
      const mapped = items.map(apiTicketToTicket);

      mapped.sort(sortTicketsByMostRecentActivityDesc);
      setTickets(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchTickets();

    pollTimerRef.current = window.setInterval(() => {
      fetchTickets();
    }, POLL_MS);

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [fetchTickets]);

  useEffect(() => {
    const onFocus = () => fetchTickets();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchTickets]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchTickets();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchTickets]);

  const counts = useMemo(() => {
    const total = tickets.length;
    const cerrados = tickets.filter(
      (t) => t.status === TicketStatus.CERRADO,
    ).length;
    const abiertos = tickets.filter(
      (t) => t.status === TicketStatus.ABIERTO,
    ).length;
    const recordatorios = tickets.filter((t) =>
      t.tags?.includes(TicketTag.RECORDATORIO),
    ).length;
    return { total, abiertos, cerrados, recordatorios };
  }, [tickets]);

  const createTicket = useCallback(
    async (input: CreateTicketInput) => {
      const body = createTicketInputToApiBody(input);
      await ticketsService.create(body);
      await fetchTickets();
    },
    [fetchTickets],
  );

  const closeTicket = useCallback(
    async (input: CloseTicketInput) => {
      if (!input.closedBy)
        throw new Error("closeTicket: 'closedBy' es requerido.");

      const closeDescTrim = (input.closeDescription ?? "").trim();

      const hasMetaPatch =
        input.processMetaPatch &&
        Object.keys(input.processMetaPatch).length > 0;

      const hasCheckpointsPatch = Boolean(
        input.processCheckpointsPatch?.length,
      );

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
    [fetchTickets],
  );

  const archiveTicket = useCallback(
    async (ticketId: string) => {
      const t = tickets.find((x) => x.id === ticketId);
      if (t?.archived) return;

      await ticketsService.update(ticketId, { archived: true });
      await fetchTickets();
    },
    [fetchTickets, tickets],
  );

  const updateTicketMessage = useCallback(
    async (ticketId: string, message: string) => {
      const next = (message ?? "").trim();
      if (!next) throw new Error("La descripción no puede estar vacía.");

      // ✅ optimista: actualizamos UI al instante
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, details: next } : t)),
      );

      try {
        await ticketsService.update(ticketId, { message: next });
      } catch (e: unknown) {
        // rollback básico: volvemos a pedir al back
        await fetchTickets();

        const msg = extractErrorMessage(e);

        // Si el back respondió 409 con "TICKET_CLOSED_NO_MESSAGE_EDIT"
        // mostramos algo entendible
        if (msg === "TICKET_CLOSED_NO_MESSAGE_EDIT") {
          throw new Error(
            "No se puede editar la descripción de un ticket cerrado.",
          );
        }

        throw new Error(msg);
      }

      // ✅ nos aseguramos de quedar consistentes con lo que devuelve el back
      await fetchTickets();
    },
    [fetchTickets],
  );

  return {
    tickets,
    counts,
    createTicket,
    closeTicket,
    archiveTicket,
    updateTicketMessage,
  };
}
