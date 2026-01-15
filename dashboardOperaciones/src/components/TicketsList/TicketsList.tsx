import type { Ticket } from "../../interfaces/Ticket";
import TicketCard from "../TicketCard/TicketCard";

type Props = {
  tickets: Ticket[];
  searchQuery?: string;

  // ✅ NUEVO
  onArchive?: (ticketId: string) => void;
};

export default function TicketsList({
  tickets,
  searchQuery,
  onArchive,
}: Props) {
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
    </section>
  );
}
