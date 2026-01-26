// src/utils/isoWeek.ts
export function getISOWeeksInYear(year: number) {
  // La última semana ISO es la que contiene el 28 de diciembre
  const d = new Date(Date.UTC(year, 11, 28));
  return getISOWeek(d).week; // 52 o 53
}

export function getISOWeek(date: Date) {
  // Algoritmo ISO basado en UTC para estabilidad
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7; // 1..7 (Mon..Sun)

  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Jueves de la semana actual
  const isoYear = d.getUTCFullYear();

  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );

  return { year: isoYear, week: weekNo };
}

export function getISOWeekStartEnd(year: number, week: number) {
  // Semana 1 = semana que contiene el 4 de enero
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // 1..7
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));

  const start = new Date(mondayWeek1);
  start.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return {
    from: toYYYYMMDD(start),
    to: toYYYYMMDD(end),
  };
}

function toYYYYMMDD(dUtc: Date) {
  const y = dUtc.getUTCFullYear();
  const m = String(dUtc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dUtc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
