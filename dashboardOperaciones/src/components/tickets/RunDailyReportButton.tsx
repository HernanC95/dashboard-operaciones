import { useState } from "react";
import Modal from "../modal/Modal";
import { ApiError } from "../../services/api";
import { runDailyReport } from "../../services/reports.service";

type Props = {
  className?: string;
};

export default function RunDailyReportButton({ className }: Props) {
  const [loading, setLoading] = useState(false);

  // Estado del modal
  const [open, setOpen] = useState(false);
  const [ok, setOk] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("");

  const onClick = async () => {
    setLoading(true);

    try {
      await runDailyReport(true); // Fuerza regeneración del PDF

      setOk(true);
      setMessage("PDF del día generado correctamente.");
      setOpen(true);
    } catch (e: unknown) {
      setOk(false);

      if (e instanceof ApiError) {
        setMessage(`${e.message} (HTTP ${e.status})`);
      } else if (e instanceof Error) {
        setMessage(e.message);
      } else {
        setMessage("Error generando el PDF.");
      }

      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón de generación del reporte */}
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={className}
      >
        {loading ? "Generando..." : "Generar PDF (día)"}
      </button>

      {/* Modal de resultado */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="w-full max-w-md space-y-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">{ok ? "✅" : "❌"}</span>

            <div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {ok ? "Reporte generado" : "Error"}
              </div>

              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {message}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
