import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, role: true, createdAt: true } });
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Nicht angemeldet" } }, { status: 401 });
    }

    return NextResponse.json({ success: true, data: { user } });
  } catch (error) {
    console.error("Me failed", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Profil konnte nicht geladen werden" } }, { status: 500 });
  }
}
