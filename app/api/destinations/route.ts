import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { destinationSchema } from "@/lib/validation";
import { verifySessionToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Nicht angemeldet" } }, { status: 401 });
    }

    const userId = await verifySessionToken(token);
    if (!userId) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Nicht angemeldet" } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const favorite = searchParams.get("favorite");
    const visited = searchParams.get("visited");
    const tag = searchParams.get("tag");

    const where: Record<string, unknown> = {
      deletedAt: null,
      createdBy: userId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (favorite === "true") {
      where.favorite = true;
    }
    if (favorite === "false") {
      where.favorite = false;
    }
    if (visited === "true") {
      where.visited = true;
    }
    if (visited === "false") {
      where.visited = false;
    }

    const destinations = await prisma.destination.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        images: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const filtered = tag
      ? destinations.filter((destination) => destination.tags.some((entry) => entry.tag.name === tag))
      : destinations;

    return NextResponse.json({ success: true, data: filtered });
  } catch (error) {
    console.error("List destinations failed", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Ziele konnten nicht geladen werden" } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Nicht angemeldet" } }, { status: 401 });
    }

    const userId = await verifySessionToken(token);
    if (!userId) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Nicht angemeldet" } }, { status: 401 });
    }

    const body = await request.json();
    const parsed = destinationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Ungültige Eingabe", details: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) } }, { status: 400 });
    }

    const { tagIds, ...data } = parsed.data;
    const destination = await prisma.destination.create({
      data: {
        ...data,
        createdBy: userId,
        tags: tagIds && tagIds.length > 0 ? { create: tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })) } : undefined,
      },
      include: { tags: { include: { tag: true } }, images: true },
    });

    return NextResponse.json({ success: true, data: destination }, { status: 201 });
  } catch (error) {
    console.error("Create destination failed", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Ziel konnte nicht erstellt werden" } }, { status: 500 });
  }
}
