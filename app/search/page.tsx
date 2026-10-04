import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

async function getData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) {
    redirect("/login");
  }

  const userId = await verifySessionToken(token);
  if (!userId) {
    redirect("/login");
  }

  const destinations = await prisma.destination.findMany({
    where: { createdBy: userId, deletedAt: null },
    include: { tags: { include: { tag: true } } },
    orderBy: { createdAt: "desc" },
  });

  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });

  return { destinations, tags };
}

export default async function SearchPage() {
  const { destinations, tags } = await getData();

  return (
    <AppShell>
      <main className="flex-1 px-4 py-6">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
          <h1 className="text-2xl font-semibold">Suche und Filter</h1>
          <p className="mt-2 text-zinc-400">Die Such- und Filterlogik wird in der nächsten Iteration mit einer echten Suchoberfläche erweitert.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag.id} className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300">#{tag.name}</span>
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
