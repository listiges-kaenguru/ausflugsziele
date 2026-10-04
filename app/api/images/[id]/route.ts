import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { unlink } from "fs/promises";
import path from "path";

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
    const image = await prisma.destinationImage.findUnique({ where: { id } });
    if (!image) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Bild nicht gefunden" } }, { status: 404 });
    }

    const destination = await prisma.destination.findFirst({ where: { id: image.destinationId, createdBy: userId } });
    if (!destination) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Zugriff verweigert" } }, { status: 403 });
    }

    await prisma.destinationImage.delete({ where: { id } });
    await unlink(path.join(process.cwd(), "public", "uploads", image.filename)).catch(() => undefined);
    return NextResponse.json({ success: true, data: { ok: true } });
  } catch (error) {
    console.error("Delete image failed", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Bild konnte nicht gelöscht werden" } }, { status: 500 });
  }
}
