import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DestinationCard, type DestinationListItem } from "@/components/destination-card";
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

  const mappedDestinations: DestinationListItem[] = destinations.map((destination) => ({
    id: destination.id,
    name: destination.name,
    address: destination.address,
    rating: destination.rating,
    favorite: destination.favorite,
    visited: destination.visited,
    createdAt: destination.createdAt.toISOString(),
    tags: destination.tags.map((entry) => ({ tag: { name: entry.tag.name } })),
  }));

  return { destinations: mappedDestinations };
}

export default async function HomePage() {
  const { destinations } = await getData();

  return (
    <AppShell>
      <main className="flex-1 px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Dashboard</p>
            <h1 className="text-2xl font-semibold">Deine Ausflugsziele</h1>
          </div>
          <Link href="/new" className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950">
            Neu hinzufügen
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {destinations.map((destination) => (
            <DestinationCard key={destination.id} destination={destination} />
          ))}
          {destinations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/70 p-8 text-center text-zinc-400 md:col-span-2 xl:col-span-3">
              Noch keine Ziele gespeichert. Lege dein erstes Ziel an.
            </div>
          ) : null}
        </div>
      </main>
    </AppShell>
  );
}
