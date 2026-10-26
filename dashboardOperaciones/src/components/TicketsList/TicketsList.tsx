// src/components/TicketsList/TicketsList.tsx
import { useEffect, useRef } from "react";
import type { Ticket } from "../../interfaces/Ticket";
import TicketCard from "../TicketCard/TicketCard";

type Props = {
  tickets: Ticket[];
  searchQuery?: string;

  // ARCHIVE (opcional)
  onArchive?: (ticketId: string) => void;

  // INFINITE SCROLL
  hasMore?: boolean;
  isLoading?: boolean;
  onLoadMore?: () => void;

  // Contenido extra debajo
  footer?: React.ReactNode;
};

export default function TicketsList({
  tickets,
  searchQuery,
  onArchive,

  hasMore = false,
  isLoading = false,
  onLoadMore,

  footer,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!onLoadMore) return;
    if (!hasMore) return;

    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (isLoading) return;
        onLoadMore();
      },
      {
        // Carga un poco antes de llegar al final
        root: null,
        rootMargin: "300px",
        threshold: 0,
      },
    );

    obs.observe(el);

    return () => {
      obs.disconnect();
    };
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <section className="space-y-3">
      <div className="space-y-5">
        {tickets.map((t) => (
          <TicketCard
            key={t.id}
            ticket={t}
            searchQuery={searchQuery}
            onArchive={onArchive}
          />
        ))}
      </div>

      {/* Sentinel para infinite scroll */}
      <div ref={sentinelRef} />

      {/* Indicador de carga */}
      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 transition-colors duration-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Cargando...
        </div>
      ) : null}

      {/* Footer opcional */}
      {footer ? <div className="pt-2">{footer}</div> : null}

      {/* Mensaje de fin */}
      {!isLoading && tickets.length > 0 && !hasMore ? (
        <div className="py-2 text-center text-xs text-slate-500 dark:text-slate-400">
          No hay más tickets para mostrar.
        </div>
      ) : null}
    </section>
  );
}
