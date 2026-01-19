import { useEffect, useRef } from "react";

type Options = {
  hour: number; // 0-23
  minute?: number; // 0-59
  second?: number; // 0-59
  enabled?: boolean;
  key?: string; // clave localStorage
  toleranceMs?: number; // ventana para disparar (por default 30s)
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function todayKey(now: Date) {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/**
 * Ejecuta `run()` 1 vez por día cuando se llega a la hora indicada.
 * Usa localStorage para evitar ejecuciones duplicadas.
 */
export default function useDailyAt(
  run: () => void | Promise<void>,
  opts: Options,
) {
  const {
    hour,
    minute = 0,
    second = 0,
    enabled = true,
    key = "daily_job",
    toleranceMs = 30_000,
  } = opts;

  const runningRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const tick = async () => {
      const now = new Date();

      // si ya corrió hoy, no hacer nada
      const ran = localStorage.getItem(`${key}:ranAtDay`);
      const today = todayKey(now);
      if (ran === today) return;

      const target = new Date(now);
      target.setHours(hour, minute, second, 0);

      const diff = now.getTime() - target.getTime();

      // Disparar en ventana: [0, toleranceMs]
      if (diff >= 0 && diff <= toleranceMs) {
        if (runningRef.current) return;
        runningRef.current = true;

        try {
          await run();
          localStorage.setItem(`${key}:ranAtDay`, today);
        } finally {
          runningRef.current = false;
        }
      }
    };

    // primer check + interval
    tick();
    const id = window.setInterval(tick, 1000);

    return () => window.clearInterval(id);
  }, [run, enabled, hour, minute, second, key, toleranceMs]);
}
