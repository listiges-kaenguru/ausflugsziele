"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type TagOption = { id: string; name: string };
export type DestinationFormProps = {
  initialValues?: {
    id?: string;
    name?: string;
    address?: string;
    googleMapsLink?: string;
    description?: string;
    rating?: number | null;
    favorite?: boolean;
    visited?: boolean;
    privateNotes?: string;
    tagIds?: string[];
  };
  tags: TagOption[];
};

export function DestinationForm({ initialValues, tags }: DestinationFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [address, setAddress] = useState(initialValues?.address ?? "");
  const [googleMapsLink, setGoogleMapsLink] = useState(initialValues?.googleMapsLink ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [rating, setRating] = useState(initialValues?.rating?.toString() ?? "");
  const [favorite, setFavorite] = useState(initialValues?.favorite ?? false);
  const [visited, setVisited] = useState(initialValues?.visited ?? false);
  const [privateNotes, setPrivateNotes] = useState(initialValues?.privateNotes ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(initialValues?.tagIds ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialValues?.name ?? "");
    setAddress(initialValues?.address ?? "");
    setGoogleMapsLink(initialValues?.googleMapsLink ?? "");
    setDescription(initialValues?.description ?? "");
    setRating(initialValues?.rating?.toString() ?? "");
    setFavorite(initialValues?.favorite ?? false);
    setVisited(initialValues?.visited ?? false);
    setPrivateNotes(initialValues?.privateNotes ?? "");
    setSelectedTags(initialValues?.tagIds ?? []);
  }, [initialValues]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      name,
      address,
      googleMapsLink,
      description,
      rating: rating ? Number(rating) : null,
      favorite,
      visited,
      privateNotes,
      tagIds: selectedTags,
    };

    const method = initialValues?.id ? "PUT" : "POST";
    const response = await fetch(initialValues?.id ? `/api/destinations/${initialValues.id}` : "/api/destinations", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (!response.ok) {
      const result = await response.json();
      setError(result.error?.message ?? "Speichern fehlgeschlagen");
      return;
    }

    router.refresh();
    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3" required />
      </label>
      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        Adresse
        <input value={address} onChange={(event) => setAddress(event.target.value)} className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        Google Maps Link
        <input value={googleMapsLink} onChange={(event) => setGoogleMapsLink(event.target.value)} className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        Beschreibung
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-28 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        Bewertung (1-5)
        <input type="number" min="1" max="5" value={rating} onChange={(event) => setRating(event.target.value)} className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3" />
      </label>
      <div className="flex gap-4 text-sm text-zinc-300">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} />
          Favorit
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={visited} onChange={(event) => setVisited(event.target.checked)} />
          Besucht
        </label>
      </div>
      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        Notizen
        <textarea value={privateNotes} onChange={(event) => setPrivateNotes(event.target.value)} className="min-h-24 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3" />
      </label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <label key={tag.id} className="rounded-full border border-zinc-700 px-3 py-2 text-sm text-zinc-300">
            <input type="checkbox" checked={selectedTags.includes(tag.id)} onChange={() => setSelectedTags((current) => current.includes(tag.id) ? current.filter((item) => item !== tag.id) : [...current, tag.id])} className="mr-2" />
            {tag.name}
          </label>
        ))}
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <button type="submit" disabled={loading} className="rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-zinc-950 disabled:opacity-60">
        {loading ? "Speichere..." : "Speichern"}
      </button>
    </form>
  );
}
