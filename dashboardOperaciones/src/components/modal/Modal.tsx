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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
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
          // ✅ clave: limitar alto, flex layout y evitar que el footer “se vaya”
          "max-h-[92vh] flex flex-col overflow-hidden",
        ].join(" ")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* header (no scrollea) */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 sm:pt-5 sm:pb-4">
          <div className="text-base sm:text-lg font-extrabold text-slate-900">
            {title}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* body (scrollea) */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
