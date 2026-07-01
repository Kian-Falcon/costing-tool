import { ArrowRight, Database, FileSpreadsheet, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const stats = [
  { label: "Seed workbooks", value: "2" },
  { label: "Core packages", value: "3" },
  { label: "Server-only AI routes", value: "4" }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-cloud">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-copper">Kian Falcon</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold text-ink md:text-5xl">Costing Intelligence</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              A production-oriented rebuild for BOQ upload, furniture classification, rate libraries, vendor data, server-side AI costing, and reproducible exports.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-md bg-moss px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#264c42]"
              >
                Open workspace <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-2xl font-semibold text-ink">{stat.value}</div>
                <div className="mt-1 text-sm text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-8 md:grid-cols-3">
        <Feature icon={<FileSpreadsheet size={20} />} title="Import-first data model" text="Master Costing and RM rate rows normalize into typed corpus, rate, and vendor records." />
        <Feature icon={<Database size={20} />} title="Persistent workspace" text="Projects, BOQs, corrections, files, rates, and AI audits are modeled for PostgreSQL." />
        <Feature icon={<ShieldCheck size={20} />} title="Server-side providers" text="AI extraction and costing routes are backend-only and read provider keys from environment variables." />
      </section>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#e8f0ed] text-moss">{icon}</div>
      <h2 className="mt-4 text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </article>
  );
}
