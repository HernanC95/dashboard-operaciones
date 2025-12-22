import type { Ticket } from "../../interfaces/Ticket";
import TicketCard from "../TicketCard/TicketCard";

type Props = {
  tickets: Ticket[];
  searchQuery?: string;
};

export default function TicketsList({ tickets, searchQuery }: Props) {
  return (
    <section className="space-y-3">
      <div className="text-sm font-extrabold text-slate-700">
        Tickets Cerrados
      </div>

      <div className="space-y-5">
        {tickets.map((t) => (
          <TicketCard key={t.id} ticket={t} searchQuery={searchQuery} />
        ))}
      </div>
    </section>
  );
}
