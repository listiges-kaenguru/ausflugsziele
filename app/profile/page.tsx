import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

async function getProfile() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) {
    redirect("/login");
  }

  const userId = await verifySessionToken(token);
  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, role: true } });
  return user;
}

export default async function ProfilePage() {
  const user = await getProfile();

  return (
    <AppShell>
      <main className="flex-1 px-4 py-6">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Profil</p>
          <h1 className="mt-2 text-2xl font-semibold">{user?.username}</h1>
          <p className="mt-3 text-zinc-400">Rolle: {user?.role}</p>
        </div>
      </main>
    </AppShell>
  );
}
