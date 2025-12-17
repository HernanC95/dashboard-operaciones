import DashboardLayout from "../../components/layout/DashboardLayout";
import RightActions from "../../components/header/RightActions";
import PendingPanel from "../../components/PendingPanel/PendingPanel";
import TicketsList from "../../components/TicketsList/TicketsList";
import { mockTickets } from "./mocktickets";
import { TicketStatus } from "../../interfaces/enums";
import { formatDayHeaderAR, formatYearDay } from "../../utils/date";
import useModal from "../../hooks/useModal";
import NewTicketModal from "../../components/tickets/NewTicketModal";

export default function DashboardPage() {
  const tickets = mockTickets;
  const newTicketModal = useModal(false);

  const total = tickets.length;
  const abiertos = tickets.filter(
    (t) => t.status !== TicketStatus.CERRADO
  ).length;
  const cerrados = tickets.filter(
    (t) => t.status === TicketStatus.CERRADO
  ).length;

  const now = new Date("2025-12-17T12:00:00");
  const yearDay = formatYearDay(now).replace("/", ""); // 2025351

  return (
    <DashboardLayout
      left={
        <div className="space-y-5">
          {/* TITULO + SUBTITULO (izquierda) */}
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900">
              DEPARTAMENTO OPERACIONES
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Sistema de Registro Diario
            </p>
          </div>

          {/* BARRA DE FECHA (izquierda) */}
          <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="text-sm font-bold uppercase tracking-wide text-blue-700">
              {formatDayHeaderAR(now)}
            </div>
            <div className="text-sm font-bold uppercase tracking-wide text-blue-700">
              AÑO/DÍA: {yearDay}
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-blue-500">
              <div className="text-sm font-semibold text-slate-500">
                Total Registros
              </div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">
                {total}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-orange-500">
              <div className="text-sm font-semibold text-slate-500">
                Abiertos Hoy
              </div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">
                {abiertos}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-green-500">
              <div className="text-sm font-semibold text-slate-500">
                Cerrados Hoy
              </div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">
                {cerrados}
              </div>
            </div>
          </div>

          {/* FILTROS (igual a tu captura) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
              <span className="inline-block h-5 w-5 rounded-md border border-slate-300" />
              Búsqueda y Filtros
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_220px]">
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-3">
                <span className="h-4 w-4 rounded-md border border-slate-300" />
                <input
                  className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-500 outline-none"
                  placeholder="Buscar por operador, mensaje, sitio, menciones..."
                />
              </div>

              <select className="rounded-xl bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-700 outline-none">
                <option>Todas las categorías</option>
              </select>

              <select className="rounded-xl bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-700 outline-none">
                <option>Todos</option>
              </select>
            </div>
          </div>

          {/* LISTA DE TICKETS */}
          <TicketsList tickets={tickets} />
        </div>
      }
      right={
        <div className="space-y-4">
          {/* ACCIONES ARRIBA A LA DERECHA */}
          <RightActions dateLabel="17/12/2025" onNew={newTicketModal.open} />

          <NewTicketModal
            open={newTicketModal.isOpen}
            onClose={newTicketModal.close}
            onCreate={(payload) => {
              console.log("Crear ticket:", payload);
              // después lo conectamos al store/services para agregarlo al listado real
            }}
          />

          {/* PANEL DE PENDIENTES */}
          <PendingPanel tickets={tickets} />
        </div>
      }
    />
  );
}
