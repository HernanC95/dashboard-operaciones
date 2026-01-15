import RunDailyReportButton from "../tickets/RunDailyReportButton";

type Props = {
  onNew: () => void;
};

const baseBtn =
  "inline-flex items-center justify-center gap-2 h-10 rounded-xl px-4 text-sm font-semibold transition";

export default function RightActions({ onNew }: Props) {
  return (
    <div className="flex w-full gap-3">
      {/* ➕ Nuevo registro */}
      <button
        onClick={onNew}
        className={`${baseBtn} flex-1 bg-slate-900 text-white shadow hover:bg-slate-800`}
      >
        <span className="text-lg leading-none">＋</span>
        Nuevo Registro
      </button>

      {/* 📘 OPERWIKI */}
      <a
        href="http://10.10.10.150:22023/"
        target="_blank"
        rel="noopener noreferrer"
        title="OPERWIKI · Enciclopedia operativa"
        className={`${baseBtn} flex-1 border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100`}
      >
        OPERWIKI
      </a>

      {/* 📄 Reporte diario */}
      <RunDailyReportButton
        className={`${baseBtn} flex-1 border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}
      />
    </div>
  );
}
