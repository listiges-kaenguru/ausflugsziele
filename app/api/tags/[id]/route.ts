import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tagSchema } from "@/lib/validation";
import { verifySessionToken } from "@/lib/auth";

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
    const parsed = tagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Ungültige Eingabe", details: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) } }, { status: 400 });
    }

    const tag = await prisma.tag.update({ where: { id }, data: { name: parsed.data.name } });
    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    console.error("Update tag failed", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Tag konnte nicht aktualisiert werden" } }, { status: 500 });
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
    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { ok: true } });
  } catch (error) {
    console.error("Delete tag failed", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Tag konnte nicht gelöscht werden" } }, { status: 500 });
  }
}
