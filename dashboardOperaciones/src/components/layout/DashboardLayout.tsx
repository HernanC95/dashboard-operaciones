import React from "react";

type Props = {
  left: React.ReactNode;
  right: React.ReactNode;
};

export default function DashboardLayout({ left, right }: Props) {
  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          <main className="min-w-0">{left}</main>

          <aside className="min-w-0">
            {/* Sidebar sticky como panel derecho */}
            <div className="sticky top-6 space-y-4">{right}</div>
          </aside>
        </div>
      </div>
    </div>
  );
}
