import React from "react";

type Props = {
  left: React.ReactNode;
  right: React.ReactNode;
};

export default function DashboardLayout({ left, right }: Props) {
  return (
    // Alto fijo + sin scroll del body
    // Modo claro: fondo gris suave
    // Modo nocturno: fondo azul oscuro
    <div className="h-screen overflow-hidden bg-[#f5f7fb] transition-colors duration-200 dark:bg-slate-950">
      {/* El contenedor ocupa toda la altura */}
      <div className="mx-auto h-full max-w-[1600px] px-6 py-6">
        {/* Grilla a altura completa */}
        <div className="grid h-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-[1fr_460px] xl:grid-cols-[1fr_560px]">
          {/* Columna izquierda scrolleable */}
          <main className="min-h-0 min-w-0 overflow-y-auto pr-2">{left}</main>

          {/* Columna derecha scrolleable */}
          <aside className="min-h-0 min-w-0 overflow-y-auto pr-2">
            {right}
          </aside>
        </div>
      </div>
    </div>
  );
}
