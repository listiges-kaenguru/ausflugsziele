import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { destinationSchema } from "@/lib/validation";
import { verifySessionToken } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Nicht angemeldet" } }, { status: 401 });
    }

    const userId = await verifySessionToken(token);
    if (!userId) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Nicht angemeldet" } }, { status: 401 });
    }

    const { id } = await params;
    const destination = await prisma.destination.findFirst({
      where: { id, createdBy: userId, deletedAt: null },
      include: { tags: { include: { tag: true } }, images: true },
    });

    if (!destination) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Ziel nicht gefunden" } }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: destination });
  } catch (error) {
    console.error("Get destination failed", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Ziel konnte nicht geladen werden" } }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Nicht angemeldet" } }, { status: 401 });
    }

    const userId = await verifySessionToken(token);
    if (!userId) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Nicht angemeldet" } }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = destinationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Ungültige Eingabe", details: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) } }, { status: 400 });
    }

    const existing = await prisma.destination.findFirst({ where: { id, createdBy: userId, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Ziel nicht gefunden" } }, { status: 404 });
    }

    const { tagIds, ...data } = parsed.data;
    const destination = await prisma.destination.update({
      where: { id },
      data: {
        ...data,
        tags: tagIds ? { set: [] } : undefined,
      },
      include: { tags: { include: { tag: true } }, images: true },
    });

    if (tagIds) {
      await prisma.destinationTag.deleteMany({ where: { destinationId: id } });
      if (tagIds.length > 0) {
        await prisma.destinationTag.createMany({ data: tagIds.map((tagId) => ({ destinationId: id, tagId })) });
      }
    }

    const refreshed = await prisma.destination.findUnique({ where: { id }, include: { tags: { include: { tag: true } }, images: true } });
    return NextResponse.json({ success: true, data: refreshed });
  } catch (error) {
    console.error("Update destination failed", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Ziel konnte nicht aktualisiert werden" } }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Nicht angemeldet" } }, { status: 401 });
    }

    const userId = await verifySessionToken(token);
    if (!userId) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Nicht angemeldet" } }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.destination.findFirst({ where: { id, createdBy: userId, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Ziel nicht gefunden" } }, { status: 404 });
    }

    await prisma.destination.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true, data: { ok: true } });
  } catch (error) {
    console.error("Delete destination failed", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Ziel konnte nicht gelöscht werden" } }, { status: 500 });
  }
}
