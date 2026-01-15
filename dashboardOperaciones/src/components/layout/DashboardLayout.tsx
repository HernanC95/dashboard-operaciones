import React from "react";

type Props = {
  left: React.ReactNode;
  right: React.ReactNode;
};

export default function DashboardLayout({ left, right }: Props) {
  return (
    // ✅ Alto fijo + sin scroll del body
    <div className="h-screen overflow-hidden bg-[#f5f7fb]">
      {/* ✅ El contenedor también debe ocupar toda la altura */}
      <div className="mx-auto h-full max-w-[1600px] px-6 py-6">
        {/* ✅ Grilla a altura completa + min-h-0 para permitir overflow */}
        <div className="grid h-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-[1fr_460px] xl:grid-cols-[1fr_560px]">
          {" "}
          {/* ✅ Columna izquierda scrolleable */}
          <main className="min-w-0 min-h-0 overflow-y-auto pr-2">{left}</main>
          {/* ✅ Columna derecha scrolleable */}
          <aside className="min-w-0 min-h-0 overflow-y-auto pr-2">
            {right}
          </aside>
        </div>
      </div>
    </div>
  );
}
