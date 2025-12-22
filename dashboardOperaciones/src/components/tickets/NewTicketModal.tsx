import { useMemo, useState } from "react";
import Modal from "../modal/Modal";
import { PEOPLE } from "../../constants/people";
import type { ActorRef } from "../../interfaces/ActorRef";
import { Lpar, TicketKind } from "../../interfaces/enums";
import type { Localidad } from "../../interfaces/Localidad";
import LocalidadSelect from "../select/LocalidadSelect";
import type { ProcessZ15, Z15ProcessCode } from "../../interfaces/ProcessZ15";

function toLocalDateTimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate?: (payload: NewTicketPayload) => void;
};

export type NewTicketPayload = {
  ticketKind: TicketKind;
  operator: ActorRef;
  message: string;
  siteId?: string;
  siteLabel?: string;
  isReminder: boolean;
  createdAt?: Date;

  // 🆕 Z15
  process?: ProcessZ15;

  // 🆕 LPAR (solo aplica a Z15 en el back)
  lpar?: Lpar | null;
};

type Z15TemplateKey =
  | "OPBSIST_DIARIO"
  | "OPBRESTO_DIARIO"
  | "OPBRENT_DIARIO"
  | "OPBPERS1_DIARIO"
  | "OPBPERS2_DIARIO"
  | "OPBSIST_SEMANAL"
  | "OPBRESTO_SEMANAL"
  | "OPBRENT_SEMANAL"
  | "OPBPERS1_SEMANAL"
  | "OPBPERS2_SEMANAL"
  | "OPBSIST_MENSUAL"
  | "OPBRESTO_MENSUAL"
  | "OPBRENT_MENSUAL"
  | "OPBPERS1_MENSUAL"
  | "OPBPERS2_MENSUAL"
  | "IMS_BACUPSEM_SEMANAL"
  | "IMS_IMSDASD_SEMANAL"
  | "IMS_BACUPSEM_MENSUAL"
  | "IMS_IMSDASD_MENSUAL"
  | "IMS_IPL"
  | "OPDELETE"
  | "MAN_INVERSION"
  | "RECDAY"
  | "SYSLOG"
  | "LOGINS"
  | "JSFMTSO"
  | "CONSUMOS"
  | "FINDEMES";

type Z15Template = {
  key: Z15TemplateKey;
  label: string;
  code: Z15ProcessCode;
  type: ProcessZ15["type"];
  frequency: ProcessZ15["frequency"];
  needsResult: boolean;

  needsSyslogCuts?: boolean;

  // ✅ IMS_IPL: SOLO checkpoint DOWN (sin hora)
  needsImsDownCheckpoint?: boolean;

  defaultMessage: (p: {
    result?: "OK" | "ERROR";
    syslogCutStart?: string;
    syslogCutEnd?: string;
    imsDownCheckpoint?: string;
  }) => string;
};

// -------------------------
// Helpers templates
// -------------------------
const makeOpb = (args: {
  key: Z15TemplateKey;
  label: string;
  code: Z15ProcessCode;
  frequency: ProcessZ15["frequency"];
}): Z15Template => ({
  key: args.key,
  label: args.label,
  code: args.code,
  type: "EJECUCION_LARGA",
  frequency: args.frequency,
  needsResult: true,
  defaultMessage: ({ result }) =>
    result === "ERROR"
      ? `${args.code}(${args.frequency.toLowerCase()}): - ERROR AL INICIAR.`
      : `${args.code}(${args.frequency.toLowerCase()}): - EN EJECUCIÓN.`,
});

const makeImsJob = (args: {
  key: Z15TemplateKey;
  label: string;
  code: Z15ProcessCode; // "BACUPSEM" | "IMSDASD"
  frequency: ProcessZ15["frequency"];
}): Z15Template => ({
  key: args.key,
  label: args.label,
  code: args.code,
  type: "EJECUCION_LARGA",
  frequency: args.frequency,
  needsResult: true,
  defaultMessage: ({ result }) =>
    result === "ERROR"
      ? `${
          args.code
        }: Backup IMS (${args.frequency.toLowerCase()}) - ERROR AL INICIAR.`
      : `${
          args.code
        }: Backup IMS (${args.frequency.toLowerCase()}) - EN EJECUCIÓN.`,
});

const makeImsIpl = (): Z15Template => ({
  key: "IMS_IPL",
  label: "Bajada / Subida IMS (Checkpoint)",
  code: "IMS_IPL" as unknown as Z15ProcessCode,
  type: "EJECUCION_LARGA",
  frequency: "SEMANAL", // interno / DTO
  needsResult: true,

  // ✅ SOLO checkpoint
  needsImsDownCheckpoint: true,

  defaultMessage: ({ result, imsDownCheckpoint }) =>
    result === "ERROR"
      ? `Bajada/Subida IMS - ERROR AL INICIAR.`
      : `Bajada/Subida IMS - Checkpoint DOWN=${
          imsDownCheckpoint?.trim() ? imsDownCheckpoint.trim() : "N/A"
        }.`,
});

const Z15_TEMPLATES: Z15Template[] = [
  // DIARIO
  makeOpb({
    key: "OPBSIST_DIARIO",
    label: "OPBSIST (Diario)",
    code: "OPBSIST",
    frequency: "DIARIO",
  }),
  makeOpb({
    key: "OPBRESTO_DIARIO",
    label: "OPBRESTO (Diario)",
    code: "OPBRESTO",
    frequency: "DIARIO",
  }),
  makeOpb({
    key: "OPBRENT_DIARIO",
    label: "OPBRENT (Diario)",
    code: "OPBRENT",
    frequency: "DIARIO",
  }),
  makeOpb({
    key: "OPBPERS1_DIARIO",
    label: "OPBPERS1 (Diario)",
    code: "OPBPERS1",
    frequency: "DIARIO",
  }),
  makeOpb({
    key: "OPBPERS2_DIARIO",
    label: "OPBPERS2 (Diario)",
    code: "OPBPERS2",
    frequency: "DIARIO",
  }),

  // SEMANAL
  makeOpb({
    key: "OPBSIST_SEMANAL",
    label: "OPBSIST (Semanal)",
    code: "OPBSIST",
    frequency: "SEMANAL",
  }),
  makeOpb({
    key: "OPBRESTO_SEMANAL",
    label: "OPBRESTO (Semanal)",
    code: "OPBRESTO",
    frequency: "SEMANAL",
  }),
  makeOpb({
    key: "OPBRENT_SEMANAL",
    label: "OPBRENT (Semanal)",
    code: "OPBRENT",
    frequency: "SEMANAL",
  }),
  makeOpb({
    key: "OPBPERS1_SEMANAL",
    label: "OPBPERS1 (Semanal)",
    code: "OPBPERS1",
    frequency: "SEMANAL",
  }),
  makeOpb({
    key: "OPBPERS2_SEMANAL",
    label: "OPBPERS2 (Semanal)",
    code: "OPBPERS2",
    frequency: "SEMANAL",
  }),

  // MENSUAL
  makeOpb({
    key: "OPBSIST_MENSUAL",
    label: "OPBSIST (Mensual)",
    code: "OPBSIST",
    frequency: "MENSUAL",
  }),
  makeOpb({
    key: "OPBRESTO_MENSUAL",
    label: "OPBRESTO (Mensual)",
    code: "OPBRESTO",
    frequency: "MENSUAL",
  }),
  makeOpb({
    key: "OPBRENT_MENSUAL",
    label: "OPBRENT (Mensual)",
    code: "OPBRENT",
    frequency: "MENSUAL",
  }),
  makeOpb({
    key: "OPBPERS1_MENSUAL",
    label: "OPBPERS1 (Mensual)",
    code: "OPBPERS1",
    frequency: "MENSUAL",
  }),
  makeOpb({
    key: "OPBPERS2_MENSUAL",
    label: "OPBPERS2 (Mensual)",
    code: "OPBPERS2",
    frequency: "MENSUAL",
  }),

  // IMS JOBS
  makeImsJob({
    key: "IMS_BACUPSEM_SEMANAL",
    label: "Backup IMS Bacupsem (Semanal)",
    code: "BACUPSEM" as unknown as Z15ProcessCode,
    frequency: "SEMANAL",
  }),
  makeImsJob({
    key: "IMS_IMSDASD_SEMANAL",
    label: "Backup IMS Imsdasd (Semanal)",
    code: "IMSDASD" as unknown as Z15ProcessCode,
    frequency: "SEMANAL",
  }),
  makeImsJob({
    key: "IMS_BACUPSEM_MENSUAL",
    label: "Backup IMS Bacupsem (Mensual)",
    code: "BACUPSEM" as unknown as Z15ProcessCode,
    frequency: "MENSUAL",
  }),
  makeImsJob({
    key: "IMS_IMSDASD_MENSUAL",
    label: "Backup IMS Imsdasd (Mensual)",
    code: "IMSDASD" as unknown as Z15ProcessCode,
    frequency: "MENSUAL",
  }),

  // ✅ IMS_IPL (solo checkpoint DOWN al crear)
  makeImsIpl(),

  // Cortos / Control / Mensuales
  {
    key: "OPDELETE",
    label: "OPDELETE (Limpieza TSOWK1 - Diario)",
    code: "OPDELETE",
    type: "EJECUCION_CORTA",
    frequency: "DIARIO",
    needsResult: true,
    defaultMessage: ({ result }) =>
      `OPDELETE: Limpieza del disco TSOWK1. Resultado: ${result ?? "N/A"}.`,
  },
  {
    key: "MAN_INVERSION",
    label: "Inversión de MAN",
    code: "MAN_INVERSION",
    type: "EJECUCION_CORTA",
    frequency: "DIARIO",
    needsResult: true,
    defaultMessage: ({ result }) =>
      `MAN_INVERSION: Inversión de MAN. Resultado: ${result ?? "N/A"}.`,
  },
  {
    key: "RECDAY",
    label: "RECDAY",
    code: "RECDAY",
    type: "EJECUCION_CORTA",
    frequency: "DIARIO",
    needsResult: true,
    defaultMessage: ({ result }) => `RECDAY. Resultado: ${result ?? "N/A"}.`,
  },
  {
    key: "SYSLOG",
    label: "SYSLOG (cortes)",
    code: "SYSLOG",
    type: "EJECUCION_CORTA",
    frequency: "DIARIO",
    needsResult: true,
    needsSyslogCuts: true,
    defaultMessage: ({ result, syslogCutStart, syslogCutEnd }) =>
      `SYSLOG. Corte inicial=${syslogCutStart ?? "N/A"} | Corte final=${
        syslogCutEnd ?? "N/A"
      }. Resultado: ${result ?? "N/A"}.`,
  },
  {
    key: "LOGINS",
    label: "LOGINS (Resguardo semanal)",
    code: "LOGINS",
    type: "EJECUCION_CORTA",
    frequency: "SEMANAL",
    needsResult: true,
    defaultMessage: ({ result }) =>
      `LOGINS: Resguardo semanal. Resultado: ${result ?? "N/A"}.`,
  },
  {
    key: "JSFMTSO",
    label: "JSFMTSO (Mensual)",
    code: "JSFMTSO",
    type: "EJECUCION_CORTA",
    frequency: "MENSUAL",
    needsResult: true,
    defaultMessage: ({ result }) =>
      `JSFMTSO mensual. Resultado: ${result ?? "N/A"}.`,
  },
  {
    key: "CONSUMOS",
    label: "CONSUMOS (Mensual)",
    code: "CONSUMOS",
    type: "EJECUCION_CORTA",
    frequency: "MENSUAL",
    needsResult: true,
    defaultMessage: ({ result }) =>
      `CONSUMOS mensual. Resultado: ${result ?? "N/A"}.`,
  },
  {
    key: "FINDEMES",
    label: "FINDEMES (Mensual)",
    code: "FINDEMES",
    type: "EJECUCION_CORTA",
    frequency: "MENSUAL",
    needsResult: true,
    defaultMessage: ({ result }) =>
      `FINDEMES mensual. Resultado: ${result ?? "N/A"}.`,
  },
];

const SYSLOG_CUT_RE = /^\d{5}\/\d{6}$/; // YYDDD/HHMMSS
const isValidSyslogCut = (v: string) => SYSLOG_CUT_RE.test(v.trim());

export default function NewTicketModal({ open, onClose, onCreate }: Props) {
  const [ticketKind, setTicketKind] = useState<TicketKind>(TicketKind.Z15);
  const [operator, setOperator] = useState<ActorRef>(PEOPLE[0]);
  const [message, setMessage] = useState("");
  const [isReminder, setIsReminder] = useState(false);

  const [localidad, setLocalidad] = useState<Localidad | null>(null);

  // ✅ fecha/hora creación (manual opcional)
  const [useManualDate, setUseManualDate] = useState(false);
  const [createdAtValue, setCreatedAtValue] = useState(() =>
    toLocalDateTimeValue(new Date())
  );

  // ✅ LPAR (solo Z15)
  const [lpar, setLpar] = useState<Lpar>(Lpar.PROD);

  // Z15
  const [z15TemplateKey, setZ15TemplateKey] =
    useState<Z15TemplateKey>("OPDELETE");

  const z15Template = useMemo(
    () => Z15_TEMPLATES.find((t) => t.key === z15TemplateKey)!,
    [z15TemplateKey]
  );

  const [z15Result, setZ15Result] = useState<"OK" | "ERROR">("OK");

  // SYSLOG cuts (checkpoint YYDDD/HHMMSS)
  const [syslogCutStart, setSyslogCutStart] = useState("");
  const [syslogCutEnd, setSyslogCutEnd] = useState("");

  // ✅ IMS_IPL: solo checkpoint DOWN
  const [imsDownCheckpoint, setImsDownCheckpoint] = useState("");

  const showSite = useMemo(
    () => ticketKind === TicketKind.INGRESO,
    [ticketKind]
  );

  const isZ15 = ticketKind === TicketKind.Z15;

  const z15AutoMessage = useMemo(() => {
    return z15Template.defaultMessage({
      result: z15Result,
      syslogCutStart: z15Template.needsSyslogCuts ? syslogCutStart : undefined,
      syslogCutEnd: z15Template.needsSyslogCuts ? syslogCutEnd : undefined,
      imsDownCheckpoint: z15Template.needsImsDownCheckpoint
        ? imsDownCheckpoint
        : undefined,
    });
  }, [z15Template, z15Result, syslogCutStart, syslogCutEnd, imsDownCheckpoint]);

  // ✅ Mensaje editable (Z15) SIN useEffect
  const [z15MessageDraft, setZ15MessageDraft] = useState("");
  const [z15MessageTouched, setZ15MessageTouched] = useState(false);

  const z15MessageValue = z15MessageTouched ? z15MessageDraft : z15AutoMessage;

  const effectiveMessage = isZ15 ? z15MessageValue : message;

  const canSubmit = useMemo(() => {
    if (ticketKind === TicketKind.INGRESO) {
      return effectiveMessage.trim().length > 0 && localidad !== null;
    }

    if (ticketKind === TicketKind.Z15) {
      if (z15Template.needsSyslogCuts) {
        if (
          !isValidSyslogCut(syslogCutStart) ||
          !isValidSyslogCut(syslogCutEnd)
        )
          return false;
      }

      // ✅ IMS_IPL: solo checkpoint
      if (z15Template.needsImsDownCheckpoint) {
        if (!imsDownCheckpoint.trim()) return false;
      }

      // ✅ LPAR requerido para Z15
      if (!lpar) return false;

      return effectiveMessage.trim().length > 0;
    }

    return effectiveMessage.trim().length > 0;
  }, [
    ticketKind,
    effectiveMessage,
    localidad,
    z15Template,
    syslogCutStart,
    syslogCutEnd,
    imsDownCheckpoint,
    lpar,
  ]);

  function buildZ15Process(): ProcessZ15 {
    const base: ProcessZ15 = {
      group: "PROCESOS_Z15",
      code: z15Template.code,
      type: z15Template.type,
      frequency: z15Template.frequency,
      // en creación: "inició ok" vs "error al iniciar"
      result: z15Result,
    };

    if (z15Template.needsSyslogCuts) {
      base.meta = {
        ...(base.meta ?? {}),
        cutStart: syslogCutStart.trim(),
        cutEnd: syslogCutEnd.trim(),
      };
    }

    // ✅ IMS_IPL: guardamos solo checkpoint en meta
    if (z15Template.needsImsDownCheckpoint) {
      base.meta = {
        ...(base.meta ?? {}),
        imsDownCheckpoint: imsDownCheckpoint.trim(),
      };
    }

    return base;
  }

  const handleSubmit = () => {
    if (!canSubmit) return;

    const payload: NewTicketPayload = {
      ticketKind,
      operator,
      message: effectiveMessage.trim(),
      siteId: showSite ? localidad?.id : undefined,
      siteLabel: showSite ? localidad?.nombre : undefined,
      isReminder,
      createdAt: useManualDate ? new Date(createdAtValue) : undefined,
      process: isZ15 ? buildZ15Process() : undefined,

      // ✅ LPAR solo para Z15
      lpar: isZ15 ? lpar : undefined,
    };

    onCreate?.(payload);
    onClose();

    // limpiar
    setMessage("");
    setIsReminder(false);
    setTicketKind(TicketKind.INGRESO);
    setLocalidad(null);

    // reset fecha/hora
    setUseManualDate(false);
    setCreatedAtValue(toLocalDateTimeValue(new Date()));

    // reset Z15
    setZ15TemplateKey("OPDELETE");
    setZ15Result("OK");
    setSyslogCutStart("");
    setSyslogCutEnd("");
    setImsDownCheckpoint("");
    setLpar(Lpar.PROD);

    // reset draft
    setZ15MessageDraft("");
    setZ15MessageTouched(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo Registro / Ticket"
      maxWidthClassName="max-w-[780px]"
    >
      <div className="space-y-4">
        {/* TicketKind */}
        <div>
          <label className="text-sm font-bold text-slate-700">Tipo</label>
          <div className="mt-2">
            <select
              value={ticketKind}
              onChange={(e) => {
                const next = e.target.value as TicketKind;
                setTicketKind(next);

                if (next !== TicketKind.INGRESO) setLocalidad(null);
                if (next === TicketKind.Z15) setMessage("");

                // ✅ si cambia a Z15, default lpar
                if (next === TicketKind.Z15) setLpar(Lpar.PROD);
              }}
              className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
            >
              {Object.values(TicketKind).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Z15 Plantillas */}
        {isZ15 ? (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                Plantilla PROCESOS_Z15
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Seleccioná el proceso y completá lo mínimo. El mensaje se genera
                solo (y podés editarlo).
              </div>
            </div>

            {/* ✅ LPAR */}
            <div>
              <label className="text-sm font-bold text-slate-700">LPAR</label>
              <select
                value={lpar}
                onChange={(e) => setLpar(e.target.value as Lpar)}
                className="mt-2 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
              >
                <option value="PROD">PROD</option>
                <option value="TEST">TEST</option>
                <option value="CAPA">CAPA</option>
                <option value="INFRA">INFRA</option>
              </select>
              <div className="mt-2 text-xs text-slate-500">
                Seleccioná en qué LPAR se ejecuta el proceso.
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Proceso
              </label>
              <select
                value={z15TemplateKey}
                onChange={(e) =>
                  setZ15TemplateKey(e.target.value as Z15TemplateKey)
                }
                className="mt-2 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
              >
                {Z15_TEMPLATES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Inicio del proceso */}
            <div>
              <label className="text-sm font-bold text-slate-700">
                Inicio del proceso
              </label>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setZ15Result("OK")}
                  className={[
                    "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold ring-1",
                    z15Result === "OK"
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  Inició OK
                </button>

                <button
                  type="button"
                  onClick={() => setZ15Result("ERROR")}
                  className={[
                    "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold ring-1",
                    z15Result === "ERROR"
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  Error al iniciar
                </button>
              </div>

              <div className="mt-2 text-xs text-slate-500">
                Para procesos largos, esto indica si pudo <b>iniciar</b>. El
                resultado final se informa al cerrar el ticket.
              </div>
            </div>

            {/* SYSLOG cuts */}
            {z15Template.needsSyslogCuts ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    SYSLOG - Corte inicial (YYDDD/HHMMSS)
                  </label>
                  <input
                    type="text"
                    value={syslogCutStart}
                    onChange={(e) => setSyslogCutStart(e.target.value)}
                    placeholder="25356/002101"
                    className="mt-2 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Ejemplo: <b>25356/002101</b>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    SYSLOG - Corte final (YYDDD/HHMMSS)
                  </label>
                  <input
                    type="text"
                    value={syslogCutEnd}
                    onChange={(e) => setSyslogCutEnd(e.target.value)}
                    placeholder="25356/002159"
                    className="mt-2 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Ejemplo: <b>25356/002159</b>
                  </div>
                </div>
              </div>
            ) : null}

            {/* ✅ IMS IPL: SOLO checkpoint DOWN */}
            {z15Template.needsImsDownCheckpoint ? (
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Checkpoint IMS DOWN (YYDDD/HHMMSS)
                </label>
                <input
                  value={imsDownCheckpoint}
                  onChange={(e) => setImsDownCheckpoint(e.target.value)}
                  placeholder="25355/105232"
                  className="mt-2 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
                />
                <div className="mt-2 text-xs text-slate-500">
                  Ejemplo: <b>25355/105232</b>
                </div>
              </div>
            ) : null}

            {/* ✅ Mensaje editable */}
            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-bold text-slate-700">
                  Mensaje generado
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setZ15MessageTouched(false);
                    setZ15MessageDraft("");
                  }}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900"
                  title="Restablecer al mensaje generado"
                >
                  Reset
                </button>
              </div>

              <textarea
                value={z15MessageValue}
                onChange={(e) => {
                  setZ15MessageTouched(true);
                  setZ15MessageDraft(e.target.value);
                }}
                rows={3}
                className="mt-2 w-full resize-none rounded-xl bg-white px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-slate-300"
              />

              <div className="mt-2 text-xs text-slate-500">
                Podés editar el mensaje antes de crear el ticket.
              </div>
            </div>
          </div>
        ) : null}

        {/* Operador */}
        <div>
          <label className="text-sm font-bold text-slate-700">Operador</label>
          <select
            value={operator.id}
            onChange={(e) => {
              const selected = PEOPLE.find((p) => p.id === e.target.value);
              if (selected) setOperator(selected);
            }}
            className="mt-2 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
          >
            {PEOPLE.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Mensaje (solo no-Z15) */}
        {!isZ15 ? (
          <div>
            <label className="text-sm font-bold text-slate-700">
              Mensaje / Descripción
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descripción detallada del registro..."
              rows={4}
              className="mt-2 w-full resize-none rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
            />
          </div>
        ) : null}

        {/* Localidad (solo INGRESO) */}
        {showSite ? (
          <div>
            <label className="text-sm font-bold text-slate-700">
              Localidad (mín. 3 letras)
            </label>
            <div className="mt-2">
              <LocalidadSelect value={localidad} onChange={setLocalidad} />
            </div>
            {!localidad ? (
              <div className="mt-2 text-xs text-slate-500">
                Tip: escribí “san”, “ros”, “rec”, etc.
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Fecha/hora creación */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                Definir fecha y hora manualmente
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Si está desactivado, se usa la hora actual.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setUseManualDate((v) => !v)}
              className={[
                "relative h-7 w-12 rounded-full transition",
                useManualDate ? "bg-slate-900" : "bg-slate-300",
              ].join(" ")}
              aria-pressed={useManualDate}
              aria-label="Toggle fecha/hora manual"
            >
              <span
                className={[
                  "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                  useManualDate ? "left-6" : "left-0.5",
                ].join(" ")}
              />
            </button>
          </div>

          {useManualDate ? (
            <div className="mt-4">
              <input
                type="datetime-local"
                value={createdAtValue}
                onChange={(e) => setCreatedAtValue(e.target.value)}
                className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300"
              />
            </div>
          ) : null}
        </div>

        {/* Recordatorio */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                Mantener como Recordatorio
              </div>
              <div className="mt-1 text-sm text-slate-500">
                El registro permanecerá visible en el dashboard durante varios
                días
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsReminder((v) => !v)}
              className={[
                "relative h-7 w-12 rounded-full transition",
                isReminder ? "bg-slate-900" : "bg-slate-300",
              ].join(" ")}
              aria-pressed={isReminder}
              aria-label="Toggle recordatorio"
            >
              <span
                className={[
                  "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                  isReminder ? "left-6" : "left-0.5",
                ].join(" ")}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={[
              "rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow",
              canSubmit
                ? "bg-slate-900 hover:bg-slate-800"
                : "bg-slate-400 cursor-not-allowed",
            ].join(" ")}
          >
            Crear Registro
          </button>
        </div>
      </div>
    </Modal>
  );
}
