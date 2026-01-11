// src/services/reports.service.ts
import { api } from "./api";

export type RunDailyReportResponse = {
  ok: boolean;
  report?: unknown;
  message?: string;
};

export async function runDailyReport(force = false) {
  return api.post("/reports/run", force ? { force: true } : {});
}
