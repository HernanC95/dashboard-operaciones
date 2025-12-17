import React, { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidthClassName?: string; // ej: "max-w-[720px]"
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidthClassName = "max-w-[720px]",
}: Props) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
    >
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40" onMouseDown={onClose} />

      {/* panel */}
      <div
        className={[
          "relative w-full",
          maxWidthClassName,
          "rounded-2xl bg-white shadow-xl",
          "border border-slate-200",
        ].join(" ")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="text-lg font-extrabold text-slate-900">{title}</div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pb-6 pt-4">{children}</div>
      </div>
    </div>
  );
}
