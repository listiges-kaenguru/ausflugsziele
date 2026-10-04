import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DestinationForm } from "@/components/destination-form";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

async function getData(id: string) {
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

  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });

  if (!destination) {
    notFound();
  }

  return {
    destination: {
      id: destination.id,
      name: destination.name,
      address: destination.address ?? undefined,
      googleMapsLink: destination.googleMapsLink ?? undefined,
      description: destination.description ?? undefined,
      rating: destination.rating ?? null,
      favorite: destination.favorite,
      visited: destination.visited,
      privateNotes: destination.privateNotes ?? undefined,
      tagIds: destination.tags.map((entry) => entry.tag.id),
    },
    tags,
  };
}

export default async function EditDestinationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { destination, tags } = await getData(id);

  return (
    <AppShell>
      <main className="flex-1 px-4 py-6">
        <div className="mb-4">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Bearbeiten</p>
          <h1 className="text-2xl font-semibold">Ausflugsziel anpassen</h1>
        </div>
        <DestinationForm initialValues={destination} tags={tags} />
      </main>
    </AppShell>
  );
}
