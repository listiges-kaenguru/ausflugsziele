import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DestinationForm } from "@/components/destination-form";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

async function getTags() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) {
    redirect("/login");
  }

  const userId = await verifySessionToken(token);
  if (!userId) {
    redirect("/login");
  }

  return prisma.tag.findMany({ orderBy: { name: "asc" } });
}

export default async function NewDestinationPage() {
  const tags = await getTags();

  return (
    <AppShell>
      <main className="flex-1 px-4 py-6">
        <div className="mb-4">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Neu hinzufügen</p>
          <h1 className="text-2xl font-semibold">Neues Ausflugsziel</h1>
        </div>
        <DestinationForm tags={tags} />
      </main>
    </AppShell>
  );
}
