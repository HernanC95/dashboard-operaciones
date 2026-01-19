import { useState } from "react";
import Modal from "../modal/Modal";
import { ApiError } from "../../services/api";
import { runDailyReport } from "../../services/reports.service";
type Props = {
  className?: string;
};
export default function RunDailyReportButton({ className }: Props) {
  const [loading, setLoading] = useState(false);

  // Modal state
  const [open, setOpen] = useState(false);
  const [ok, setOk] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("");

  const onClick = async () => {
    setLoading(true);
    try {
      await runDailyReport(true); // fuerza regeneración (como venías haciendo)
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
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={className}
      >
        {loading ? "Generando..." : "Generar PDF (día)"}
      </button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="w-full max-w-md space-y-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">{ok ? "✅" : "❌"}</span>

            <div>
              <div className="text-base font-semibold">
                {ok ? "Reporte generado" : "Error"}
              </div>
              <div className="text-sm text-slate-600">{message}</div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
