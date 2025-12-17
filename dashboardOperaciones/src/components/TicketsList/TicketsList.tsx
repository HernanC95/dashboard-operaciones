import type { Ticket } from "../../interfaces/Ticket";
import TicketCard from "../TicketCard/TicketCard";

type Props = {
  tickets: Ticket[];
};

export default function TicketsList({ tickets }: Props) {
  return (
    <section className="space-y-5">
      {tickets.map((t) => (
        <TicketCard key={t.id} ticket={t} />
      ))}
    </section>
  );
}
