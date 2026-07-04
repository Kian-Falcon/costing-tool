"use client";

import { Bot, Calculator, Database, Download, FileSpreadsheet, Library, LogOut, Save, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

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
  const [user, setUser] = useState<{ email: string; role: string; organization?: { name: string } } | null>(null);

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { user: typeof user }) => setUser(body.user))
      .catch(() => setUser(null));
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-cloud text-ink">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white/95 px-3 py-5 shadow-sm backdrop-blur lg:block">
        <Link href="/dashboard" className="mb-7 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-sm font-bold text-white">KF</div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-copper">Kian Falcon</div>
            <div className="text-xs text-slate-500">Costing intelligence</div>
          </div>
        </Link>
        <nav className="space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${active ? "nav-item-active" : ""}`}>
                <item.icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        {user && (
          <div className="absolute bottom-5 left-3 right-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="truncate text-sm font-semibold text-ink">{user.organization?.name ?? "Workspace"}</div>
            <div className="mt-1 truncate text-xs text-slate-500">{user.email}</div>
            <div className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{user.role}</div>
          </div>
        )}
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-cloud/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/dashboard" className="btn-primary">
                <FileSpreadsheet size={16} />
                New BOQ
              </Link>
              <button onClick={signOut} className="btn-secondary">
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto border-t border-slate-200 px-4 py-2 sm:px-6 lg:hidden">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${active ? "bg-ink text-white" : "bg-white text-slate-700"}`}
                >
                  <item.icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
          {children}
        </div>
      </div>
    </main>
  );
}
