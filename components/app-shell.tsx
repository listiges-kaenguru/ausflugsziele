"use client";

import Link from "next/link";
import { Compass, PlusCircle, Search, UserCircle } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col pb-24">{children}</div>
      <nav className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-around px-4 py-3">
          <Link href="/" className="flex flex-col items-center gap-1 text-sm text-zinc-400">
            <Compass size={20} />
            Dashboard
          </Link>
          <Link href="/new" className="flex flex-col items-center gap-1 text-sm text-zinc-400">
            <PlusCircle size={20} />
            Hinzufügen
          </Link>
          <Link href="/search" className="flex flex-col items-center gap-1 text-sm text-zinc-400">
            <Search size={20} />
            Suche
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 text-sm text-zinc-400">
            <UserCircle size={20} />
            Profil
          </Link>
        </div>
      </nav>
    </div>
  );
}
