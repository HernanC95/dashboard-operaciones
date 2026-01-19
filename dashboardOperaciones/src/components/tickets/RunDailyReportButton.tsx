import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "../modal/Modal";
import { ApiError } from "../../services/api";
import { runDailyReport } from "../../services/reports.service";

type Props = {
  className?: string;

  // 🆕 Configurable (por si después querés moverlo desde UI/env)
  autoHour?: number; // 0-23
  autoMinute?: number; // 0-59
  autoEnabled?: boolean;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function todayKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function RunDailyReportButton({
  className,
  autoHour = 6,
  autoMinute = 5,
  autoEnabled = true,
}: Props) {
  const [loading, setLoading] = useState(false);

  // Modal state
  const [open, setOpen] = useState(false);
  const [ok, setOk] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("");

  // evita doble ejecución si el interval cae varias veces en la ventana
  const autoRunningRef = useRef(false);

  const run = useCallback(async (origin: "manual" | "auto") => {
    setLoading(true);

    try {
      await runDailyReport(true); // fuerza regeneración

      // ✅ Para auto: no mostramos modal para no molestar
      if (origin === "manual") {
        setOk(true);
        setMessage("PDF del día generado correctamente.");
        setOpen(true);
      }

      if (origin === "auto") {
        // ✅ marcar que ya corrió hoy
        localStorage.setItem(
          "dailyReport:lastAutoRunDay",
          todayKey(new Date()),
        );
      }
    } catch (e: unknown) {
      // ✅ En manual mostramos error modal
      if (origin === "manual") {
        setOk(false);

        if (e instanceof ApiError) {
          setMessage(`${e.message} (HTTP ${e.status})`);
        } else if (e instanceof Error) {
          setMessage(e.message);
        } else {
          setMessage("Error generando el PDF.");
        }

        setOpen(true);
      } else {
        // ✅ En auto: no modal, solo log (si querés luego lo mandamos a un toast silencioso)
        console.error("Auto daily report failed:", e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Manual
  const onClick = () => run("manual");

  // ✅ Auto (solo si la app está abierta)
  useEffect(() => {
    if (!autoEnabled) return;

    const toleranceMs = 30_000; // ventana de 30s para disparar (por si cae justo)
    const tick = async () => {
      // si ya está corriendo, no repetir
      if (autoRunningRef.current) return;

      const now = new Date();
      const alreadyRanDay = localStorage.getItem("dailyReport:lastAutoRunDay");
      const today = todayKey(now);

      // ya corrió hoy
      if (alreadyRanDay === today) return;

      const target = new Date(now);
      target.setHours(autoHour, autoMinute, 0, 0);

      const diff = now.getTime() - target.getTime();

      // disparamos si estamos dentro de [0, toleranceMs]
      if (diff >= 0 && diff <= toleranceMs) {
        autoRunningRef.current = true;
        try {
          await run("auto");
        } finally {
          autoRunningRef.current = false;
        }
      }
    };

    // primer check + interval
    tick();
    const id = window.setInterval(tick, 1000);

    return () => window.clearInterval(id);
  }, [autoEnabled, autoHour, autoMinute, run]);

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
