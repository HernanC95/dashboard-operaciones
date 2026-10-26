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
      {/* Fondo detrás del modal */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/70"
        onMouseDown={onClose}
      />

      {/* Panel principal */}
      <div
        className={[
          "relative w-full",
          maxWidthClassName,
          "rounded-2xl bg-white shadow-xl",
          "border border-slate-200",
          "dark:border-slate-700 dark:bg-slate-800",
          "transition-colors duration-200",
          "max-h-[92vh] flex flex-col overflow-hidden",
        ].join(" ")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Encabezado fijo */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-6 sm:pt-5 sm:pb-4">
          <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 sm:text-lg">
            {title}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            aria-label="Cerrar"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Contenido con desplazamiento independiente */}
        <div
          className={[
            "flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5",
            "text-slate-900 dark:text-slate-200",
            "[scrollbar-width:thin]",
            "[scrollbar-color:#94a3b8_#f1f5f9]",
            "dark:[scrollbar-color:#475569_#1e293b]",
          ].join(" ")}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
