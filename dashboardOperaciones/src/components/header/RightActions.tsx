type Props = {
  dateLabel: string;
  onNew: () => void;
};

export default function RightActions({ dateLabel, onNew }: Props) {
  return (
    <div className="flex items-center gap-3">
      <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50">
        <span className="inline-block h-4 w-4 rounded-md border border-slate-300" />
        {dateLabel}
      </button>

      <button
        onClick={onNew}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
      >
        <span className="text-lg leading-none">＋</span>
        Nuevo Registro
      </button>
    </div>
  );
}
