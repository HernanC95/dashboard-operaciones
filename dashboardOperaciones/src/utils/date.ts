function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function ensureDate(value: Date) {
  return value instanceof Date ? value : new Date(value);
}

export function formatTimeAR(date: Date): string {
  const d = ensureDate(date);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatDayHeaderAR(date: Date): string {
  const d = ensureDate(date);
  const days = [
    "DOMINGO",
    "LUNES",
    "MARTES",
    "MIÉRCOLES",
    "JUEVES",
    "VIERNES",
    "SÁBADO",
  ] as const;
  const months = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ] as const;

  return `FECHA: ${days[d.getDay()]} ${d.getDate()} DE ${
    months[d.getMonth()]
  } DE ${d.getFullYear()}`;
}

/** AAAA/DDD (ej: 2025/351) */
export function formatYearDay(date: Date): string {
  const d = ensureDate(date);
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const doy = Math.floor(diff / oneDay);
  const ddd = doy < 10 ? `00${doy}` : doy < 100 ? `0${doy}` : `${doy}`;
  return `${d.getFullYear()}/${ddd}`;
}
