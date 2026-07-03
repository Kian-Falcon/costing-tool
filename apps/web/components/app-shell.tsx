"use client";

import { BarChart3, Bot, Calculator, Database, Download, FileSpreadsheet, Library, Save, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const nav = [
  { label: "Dashboard", href: "/dashboard", icon: FileSpreadsheet },
  { label: "Projects", href: "/projects", icon: Save },
  { label: "Rates", href: "/rates", icon: Library },
  { label: "Vendors", href: "/vendors", icon: Users },
  { label: "Training", href: "/training", icon: Database },
  { label: "Models", href: "/models", icon: Calculator },
  { label: "Exports", href: "/exports", icon: Download },
  { label: "AI Logs", href: "/ai-logs", icon: Bot }
];

export function AppShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-cloud">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-ink">{title}</h1>
            <p className="text-sm text-slate-600">{description}</p>
          </div>
          <Link href="/dashboard" className="rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white">
            New BOQ
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-2">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium ${active ? "bg-moss text-white" : "text-slate-700 hover:bg-slate-100"}`}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            );
          })}
          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <BarChart3 size={14} />
              Legacy parity
            </div>
          </div>
        </aside>
        {children}
      </div>
    </main>
  );
}
