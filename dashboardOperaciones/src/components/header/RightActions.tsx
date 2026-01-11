import RunDailyReportButton from "../tickets/RunDailyReportButton";

type Props = {
  onNew: () => void;
};

export default function RightActions({ onNew }: Props) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onNew}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
      >
        <span className="text-lg leading-none">＋</span>
        Nuevo Registro
      </button>
      <div className="flex items-center justify-between">
  <h1 className="text-xl font-semibold"></h1>
  <RunDailyReportButton />
      </div>
    </div>
  );
}
