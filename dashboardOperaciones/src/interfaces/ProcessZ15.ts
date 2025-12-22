// src/interfaces/ProcessZ15.ts

export type ProcessGroup = "PROCESOS_Z15";

export type ProcessType =
  | "EJECUCION_LARGA"
  | "EJECUCION_CORTA"
  | "CONTROL_OPERATIVO";

export type ProcessFrequency = "DIARIO" | "SEMANAL" | "MENSUAL";

export type ProcessResult = "OK" | "ERROR";

export type Z15ProcessCode =
  | "OPBSIST"
  | "OPBRESTO"
  | "OPBRENT"
  | "OPBPERS1"
  | "OPBPERS2"
  | "BACUPSEM"
  | "IMSDASD"
  | "IMS_IPL"
  | "OPDELETE"
  | "MAN_INVERSION"
  | "RECDAY"
  | "SYSLOG"
  | "LOGINS"
  | "JSFMTSO"
  | "CONSUMOS"
  | "FINDEMES";

export interface ProcessCheckpoint {
  label: string; // "IMS DOWN", "IMS UP"
  at: Date;
}

export interface ProcessZ15 {
  group: ProcessGroup;
  code: Z15ProcessCode;
  type: ProcessType;
  frequency: ProcessFrequency;
  result?: ProcessResult;

  meta?: Record<string, unknown>;
  checkpoints?: ProcessCheckpoint[];
}
