"use client";

import Link from "next/link";
import { MapPin, Star, Heart, CheckCircle2 } from "lucide-react";

export type DestinationListItem = {
  id: string;
  name: string;
  address?: string | null;
  rating?: number | null;
  favorite: boolean;
  visited: boolean;
  createdAt: string;
  tags?: Array<{ tag: { name: string } }>;
};

export function DestinationCard({ destination }: { destination: DestinationListItem }) {
  return (
    <Link href={`/destinations/${destination.id}`} className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{destination.name}</h3>
          {destination.address ? (
            <p className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
              <MapPin size={14} /> {destination.address}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2 text-zinc-400">
          {destination.favorite ? <Heart size={16} className="text-rose-400" /> : <Heart size={16} />}
          {destination.visited ? <CheckCircle2 size={16} className="text-emerald-400" /> : null}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
        <Star size={14} className="text-amber-400" />
        <span>{destination.rating ?? "–"} / 5</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {destination.tags?.slice(0, 3).map((entry) => (
          <span key={entry.tag.name} className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
            #{entry.tag.name}
          </span>
        ))}
      </div>
    </Link>
  );
}
