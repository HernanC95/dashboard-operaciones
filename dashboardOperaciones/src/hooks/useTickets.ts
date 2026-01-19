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
  // ✅ lista principal (para render de cerrados)
  tickets: Ticket[];

  // ✅ panel de pendientes (abiertos + recordatorios)
  pendingTickets: Ticket[];

  // ✅ infinite scroll
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;

  // ✅ búsqueda global (histórico completo)
  query: string;
  setQuery: (q: string) => void;
  clearQuery: () => void;

  loadMore: () => void;
  refresh: () => void;

  counts: {
    total: number;
    abiertos: number;
    cerrados: number;
    recordatorios: number;
  };

  createTicket: (input: CreateTicketInput) => Promise<void>;
  closeTicket: (input: CloseTicketInput) => Promise<void>;
  archiveTicket: (ticketId: string) => Promise<void>;
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

  if (typeof e === "object" && e !== null && "error" in e) {
    const v = (e as { error?: unknown }).error;
    if (typeof v === "string") return v;
  }

  return "Error inesperado.";
}

function uniqByIdAppend(prev: Ticket[], next: Ticket[]) {
  const seen = new Set(prev.map((t) => t.id));
  const merged = prev.slice();
  for (const t of next) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    merged.push(t);
  }
  return merged;
}

export default function useTickets(): UseTicketsResult {
  // ✅ lista principal: cerrados (paginados)
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // ✅ pendientes: abiertos + recordatorios (no paginados)
  const [pendingTickets, setPendingTickets] = useState<Ticket[]>([]);

  // ✅ búsqueda global
  const [query, setQueryState] = useState("");

  // ✅ paginado
  const [page, setPage] = useState(1);
  const [pageSize] = useState(30);
  const [total, setTotal] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMore = tickets.length < total;

  const fetchSeqRef = useRef(0);

  const POLL_MS = 10_000;
  const pollTimerRef = useRef<number | null>(null);

  /**
   * Fetch paginado para la lista principal:
   * - Si hay query => búsqueda global histórica.
   * - Si no hay query => NORMAL (últimos 7 días + failsafe de ABIERTO)
   *
   * IMPORTANTÍSIMO:
   * Para que en la izquierda no se “cuelen” abiertos al scrollear,
   * pedimos SOLO status=CERRADO acá.
   */
  const fetchClosedPage = useCallback(
    async (opts?: { reset?: boolean; nextPage?: number }) => {
      const reset = Boolean(opts?.reset);
      const nextPage = opts?.nextPage ?? (reset ? 1 : page);

      const seq = ++fetchSeqRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const qTrim = query.trim();
        const isSearch = qTrim.length > 0;

        const res = await ticketsService.list({
          page: nextPage,
          pageSize,

          // ✅ lista principal: solo cerrados (evita “abiertos que aparecen al scrollear”)
          status: "CERRADO",

          q: isSearch ? qTrim : undefined,
          // si no hay búsqueda, el back aplica NORMAL por default (últimos 7 + failsafe)
        });

        if (seq !== fetchSeqRef.current) return;

        const items = Array.isArray(res?.items) ? res.items : [];
        const mapped = items.map(apiTicketToTicket);
        mapped.sort(sortTicketsByMostRecentActivityDesc);

        setTotal(typeof res?.total === "number" ? res.total : mapped.length);
        setPage(typeof res?.page === "number" ? res.page : nextPage);

        setTickets((prev) => {
          if (reset) return mapped;
          return uniqByIdAppend(prev, mapped).sort(
            sortTicketsByMostRecentActivityDesc,
          );
        });
      } catch (e) {
        if (seq !== fetchSeqRef.current) return;
        console.error(e);
        setError(extractErrorMessage(e));
      } finally {
        if (seq === fetchSeqRef.current) setIsLoading(false);
      }
    },
    [page, pageSize, query],
  );

  /**
   * Fetch liviano para PendingPanel:
   * - Siempre trae pocos
   * - Siempre incluye ABIERTO + RECORDATORIOS (sin depender del scroll de cerrados)
   */
  const fetchPending = useCallback(async () => {
    try {
      // Traemos:
      // - abiertos (cualquier fecha)
      // - recordatorios (cualquier fecha)
      //
      // Como el back no soporta OR combinando status+isReminder desde query params,
      // hacemos 2 requests y unimos (son pocas).
      const [openRes, remRes] = await Promise.all([
        ticketsService.list({
          page: 1,
          pageSize: 200,
          status: "ABIERTO",
        }),
        ticketsService.list({
          page: 1,
          pageSize: 200,
          isReminder: true,
        }),
      ]);

      const openItems = Array.isArray(openRes?.items) ? openRes.items : [];
      const remItems = Array.isArray(remRes?.items) ? remRes.items : [];

      const mergedApi = [...openItems, ...remItems];

      const seen = new Set<string>();
      const merged: Ticket[] = [];
      for (const it of mergedApi) {
        if (!it?.id) continue;
        if (seen.has(it.id)) continue;
        seen.add(it.id);
        merged.push(apiTicketToTicket(it));
      }

      merged.sort(sortTicketsByMostRecentActivityDesc);
      setPendingTickets(merged);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // ✅ cuando cambia query => reset a page 1
  useEffect(() => {
    fetchClosedPage({ reset: true, nextPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, pageSize]);

  // ✅ pending siempre se refresca
  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // ✅ Poll: solo cuando NO hay búsqueda (vista normal)
  useEffect(() => {
    const qTrim = query.trim();
    const shouldPoll = qTrim.length === 0;

    if (!shouldPoll) {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    pollTimerRef.current = window.setInterval(() => {
      fetchClosedPage({ reset: true, nextPage: 1 });
      fetchPending();
    }, POLL_MS);

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [fetchClosedPage, fetchPending, query]);

  const counts = useMemo(() => {
    const totalLocal = pendingTickets.length + tickets.length;

    const abiertos = pendingTickets.filter(
      (t) => t.status === TicketStatus.ABIERTO,
    ).length;

    const recordatorios = pendingTickets.filter((t) =>
      t.tags?.includes(TicketTag.RECORDATORIO),
    ).length;

    const cerrados = tickets.filter(
      (t) => t.status === TicketStatus.CERRADO,
    ).length;

    return {
      total: totalLocal,
      abiertos,
      cerrados,
      recordatorios,
    };
  }, [pendingTickets, tickets]);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
  }, []);

  const clearQuery = useCallback(() => {
    setQueryState("");
  }, []);

  const loadMore = useCallback(() => {
    if (isLoading) return;
    if (!hasMore) return;

    const next = page + 1;
    fetchClosedPage({ reset: false, nextPage: next });
  }, [fetchClosedPage, hasMore, isLoading, page]);

  const refresh = useCallback(() => {
    fetchClosedPage({ reset: true, nextPage: 1 });
    fetchPending();
  }, [fetchClosedPage, fetchPending]);

  // -------------------------
  // Acciones (CRUD)
  // -------------------------
  const createTicket = useCallback(
    async (input: CreateTicketInput) => {
      const body = createTicketInputToApiBody(input);
      await ticketsService.create(body);
      await refresh();
    },
    [refresh],
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

      await refresh();
    },
    [refresh],
  );

  const archiveTicket = useCallback(
    async (ticketId: string) => {
      await ticketsService.update(ticketId, { archived: true });
      await refresh();
    },
    [refresh],
  );

  const updateTicketMessage = useCallback(
    async (ticketId: string, message: string) => {
      const next = (message ?? "").trim();
      if (!next) throw new Error("La descripción no puede estar vacía.");

      // optimista (solo en cerrados list)
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, details: next } : t)),
      );

      try {
        await ticketsService.update(ticketId, { message: next });
      } catch (e: unknown) {
        await refresh();

        const msg = extractErrorMessage(e);
        if (msg === "TICKET_CLOSED_NO_MESSAGE_EDIT") {
          throw new Error(
            "No se puede editar la descripción de un ticket cerrado.",
          );
        }
        throw new Error(msg);
      }

      await refresh();
    },
    [refresh],
  );

  return {
    tickets,
    pendingTickets,

    page,
    pageSize,
    total,
    hasMore,
    isLoading,
    error,

    query,
    setQuery,
    clearQuery,

    loadMore,
    refresh,

    counts,

    createTicket,
    closeTicket,
    archiveTicket,
    updateTicketMessage,
  };
}
