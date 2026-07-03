"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [organizationName, setOrganizationName] = useState("Kian Falcon");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mode === "register" ? { name, organizationName, email, password } : { email, password })
    });
    const body = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(body.error ?? "Authentication failed.");
      return;
    }
    const nextPath = new URLSearchParams(window.location.search).get("next") || "/dashboard";
    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-cloud px-6 py-12">
      <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-copper">Kian Falcon</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">{mode === "register" ? "Create owner account" : "Sign in"}</h1>
        <p className="mt-2 text-sm text-slate-600">{mode === "register" ? "First account becomes the organization owner." : "Use your workspace account to continue."}</p>
        <div className="mt-6 grid gap-3">
          {mode === "register" && (
            <>
              <Input label="Name" value={name} onChange={setName} />
              <Input label="Organization" value={organizationName} onChange={setOrganizationName} />
            </>
          )}
          <Input label="Email" value={email} onChange={setEmail} type="email" />
          <Input label="Password" value={password} onChange={setPassword} type="password" />
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <button disabled={busy || !email || !password} onClick={submit} className="flex items-center justify-center gap-2 rounded-md bg-moss px-4 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300">
            {busy && <Loader2 className="animate-spin" size={16} />}
            {mode === "register" ? "Create account" : "Sign in"}
          </button>
          <div className="text-center text-sm text-slate-600">
            {mode === "register" ? (
              <>
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-moss">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                First time setup?{" "}
                <Link href="/register" className="font-semibold text-moss">
                  Create owner account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-600">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-ink" />
    </label>
  );
}
