// src/components/TicketsList/TicketsList.tsx
import { useEffect, useRef } from "react";
import type { Ticket } from "../../interfaces/Ticket";
import TicketCard from "../TicketCard/TicketCard";

type Props = {
  tickets: Ticket[];
  searchQuery?: string;

  // ✅ ARCHIVE (opcional)
  onArchive?: (ticketId: string) => void;

  // ✅ INFINITE SCROLL
  hasMore?: boolean;
  isLoading?: boolean;
  onLoadMore?: () => void;

  // ✅ opcional: contenido extra debajo (botones, etc.)
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
        // hace que cargue un poquito antes de llegar al final
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

      {/* sentinel para infinite scroll */}
      <div ref={sentinelRef} />

      {/* loader */}
      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Cargando...
        </div>
      ) : null}

      {/* footer opcional */}
      {footer ? <div className="pt-2">{footer}</div> : null}

      {/* mensaje fin */}
      {!isLoading && tickets.length > 0 && !hasMore ? (
        <div className="text-center text-xs text-slate-500 py-2">
          No hay más tickets para mostrar.
        </div>
      ) : null}
    </section>
  );
}
