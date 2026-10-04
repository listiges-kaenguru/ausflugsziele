"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok || !result.success) {
      setError(result.error?.message ?? "Login fehlgeschlagen");
      return;
    }

    router.refresh();
    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Anmeldung</p>
        <h2 className="mt-2 text-2xl font-semibold">Willkommen zurück</h2>
      </div>
      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        Benutzername
        <input value={username} onChange={(event) => setUsername(event.target.value)} className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        Passwort
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3" />
      </label>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <button disabled={loading} className="rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-zinc-950 disabled:opacity-60">
        {loading ? "Anmeldung..." : "Anmelden"}
      </button>
    </form>
  );
}
