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

export type TicketsListMode = "NORMAL" | "HISTORY";

type UseTicketsResult = {
  // ✅ lista actual renderizable (depende de mode/q + paginado)
  tickets: Ticket[];

  // ✅ info para infinite scroll
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;

  // ✅ control de vista
  mode: TicketsListMode;
  query: string;

  enableHistory: () => void;
  resetToNormal: () => void;

  setQuery: (q: string) => void;
  clearQuery: () => void;

  loadMore: () => void;
  refresh: () => void;

  // ✅ contadores de lo que está cargado (no del histórico total)
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

  // por si ticketsService lanza algo tipo { error: "..." }
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
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // ✅ modo/listado
  const [mode, setMode] = useState<TicketsListMode>("NORMAL");

  // ✅ búsqueda global (histórico completo en backend cuando hay q)
  const [query, setQueryState] = useState("");

  // ✅ paginado para infinite scroll
  const [page, setPage] = useState(1);
  const [pageSize] = useState(30); // ajustable (20/30/50). 30 suele ir bien.
  const [total, setTotal] = useState(0);

  // ✅ estado request
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMore = tickets.length < total;

  // control anti-race / anti doble fetch
  const fetchSeqRef = useRef(0);

  const POLL_MS = 10_000;
  const pollTimerRef = useRef<number | null>(null);

  const fetchTicketsPage = useCallback(
    async (opts?: { reset?: boolean; nextPage?: number }) => {
      const reset = Boolean(opts?.reset);
      const nextPage = opts?.nextPage ?? (reset ? 1 : page);

      // anti race: secuencia incremental
      const seq = ++fetchSeqRef.current;

      setIsLoading(true);
      setError(null);

      try {
        const qTrim = query.trim();
        const isSearch = qTrim.length > 0;

        const res = await ticketsService.list({
          page: nextPage,
          pageSize,
          // si hay búsqueda => histórico completo; el backend ignora mode en ese caso
          q: isSearch ? qTrim : undefined,
          // si no hay búsqueda, controlamos NORMAL/HISTORY
          mode: isSearch ? undefined : mode,
        });

        // si entró una request más nueva, ignoramos esta respuesta
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
    [mode, page, pageSize, query],
  );

  // ✅ reset & fetch cuando cambia mode o query
  useEffect(() => {
    // cada vez que cambie la “vista”, reseteamos a página 1
    fetchTicketsPage({ reset: true, nextPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, query, pageSize]);

  // ✅ Poll solo en vista “liviana”: NORMAL + sin búsqueda
  useEffect(() => {
    const qTrim = query.trim();
    const shouldPoll = mode === "NORMAL" && qTrim.length === 0;

    if (!shouldPoll) {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    // Poll: refresca solo la primera página (sin acumular histórico)
    pollTimerRef.current = window.setInterval(() => {
      fetchTicketsPage({ reset: true, nextPage: 1 });
    }, POLL_MS);

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [fetchTicketsPage, mode, query]);

  useEffect(() => {
    const onFocus = () => {
      // mismo criterio que poll: refrescar solo la primera página
      const qTrim = query.trim();
      if (mode === "NORMAL" && qTrim.length === 0) {
        fetchTicketsPage({ reset: true, nextPage: 1 });
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchTicketsPage, mode, query]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const qTrim = query.trim();
      if (mode === "NORMAL" && qTrim.length === 0) {
        fetchTicketsPage({ reset: true, nextPage: 1 });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchTicketsPage, mode, query]);

  const counts = useMemo(() => {
    const totalLocal = tickets.length;
    const cerrados = tickets.filter(
      (t) => t.status === TicketStatus.CERRADO,
    ).length;
    const abiertos = tickets.filter(
      (t) => t.status === TicketStatus.ABIERTO,
    ).length;
    const recordatorios = tickets.filter((t) =>
      t.tags?.includes(TicketTag.RECORDATORIO),
    ).length;
    return {
      total: totalLocal,
      abiertos,
      cerrados,
      recordatorios,
    };
  }, [tickets]);

  // -------------------------
  // Controles de vista
  // -------------------------
  const enableHistory = useCallback(() => {
    setMode("HISTORY");
    // no hace falta tocar page: el effect de mode resetea y pide page 1
  }, []);

  const resetToNormal = useCallback(() => {
    setMode("NORMAL");
    setQueryState("");
  }, []);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
  }, []);

  const clearQuery = useCallback(() => {
    setQueryState("");
    // al limpiar búsqueda, volvemos a NORMAL (últimos 7 días)
    setMode("NORMAL");
  }, []);

  const loadMore = useCallback(() => {
    if (isLoading) return;
    if (!hasMore) return;

    const next = page + 1;
    fetchTicketsPage({ reset: false, nextPage: next });
  }, [fetchTicketsPage, hasMore, isLoading, page]);

  const refresh = useCallback(() => {
    fetchTicketsPage({ reset: true, nextPage: 1 });
  }, [fetchTicketsPage]);

  // -------------------------
  // Acciones (CRUD)
  // - Después de cada acción refrescamos la vista actual (page 1)
  // -------------------------
  const createTicket = useCallback(
    async (input: CreateTicketInput) => {
      const body = createTicketInputToApiBody(input);
      await ticketsService.create(body);
      await fetchTicketsPage({ reset: true, nextPage: 1 });
    },
    [fetchTicketsPage],
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

      await fetchTicketsPage({ reset: true, nextPage: 1 });
    },
    [fetchTicketsPage],
  );

  const archiveTicket = useCallback(
    async (ticketId: string) => {
      const t = tickets.find((x) => x.id === ticketId);
      if (t?.archived) return;

      await ticketsService.update(ticketId, { archived: true });
      await fetchTicketsPage({ reset: true, nextPage: 1 });
    },
    [fetchTicketsPage, tickets],
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
        // rollback: refrescamos
        await fetchTicketsPage({ reset: true, nextPage: 1 });

        const msg = extractErrorMessage(e);

        if (msg === "TICKET_CLOSED_NO_MESSAGE_EDIT") {
          throw new Error(
            "No se puede editar la descripción de un ticket cerrado.",
          );
        }

        throw new Error(msg);
      }

      // ✅ consistencia final
      await fetchTicketsPage({ reset: true, nextPage: 1 });
    },
    [fetchTicketsPage],
  );

  return {
    tickets,

    page,
    pageSize,
    total,
    hasMore,
    isLoading,
    error,

    mode,
    query,

    enableHistory,
    resetToNormal,

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
