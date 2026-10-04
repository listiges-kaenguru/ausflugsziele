import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

async function getDestination(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) {
    redirect("/login");
  }

  const userId = await verifySessionToken(token);
  if (!userId) {
    redirect("/login");
  }

  const destination = await prisma.destination.findFirst({
    where: { id, createdBy: userId, deletedAt: null },
    include: { tags: { include: { tag: true } }, images: true },
  });

  if (!destination) {
    notFound();
  }

  return destination;
}

export default async function DestinationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const destination = await getDestination(id);

  return (
    <AppShell>
      <main className="flex-1 px-4 py-6">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
          <h1 className="text-2xl font-semibold">{destination.name}</h1>
          {destination.address ? <p className="mt-2 text-zinc-400">{destination.address}</p> : null}
          {destination.description ? <p className="mt-4 text-zinc-300">{destination.description}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {destination.tags.map((entry) => (
              <span key={entry.tag.id} className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300">#{entry.tag.name}</span>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            {destination.googleMapsLink ? (
              <a href={destination.googleMapsLink} target="_blank" rel="noreferrer" className="rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-zinc-950">
                In Google Maps öffnen
              </a>
            ) : null}
            <a href={`/destinations/${destination.id}/edit`} className="rounded-2xl border border-zinc-700 px-4 py-3 font-semibold text-zinc-100">
              Bearbeiten
            </a>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
