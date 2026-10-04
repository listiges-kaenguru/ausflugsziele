import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, verifySessionToken } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validation";

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
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Ungültige Eingabe", details: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) } }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return NextResponse.json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Aktuelles Passwort ist falsch" } }, { status: 401 });
    }

    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(parsed.data.newPassword) } });

    return NextResponse.json({ success: true, data: { ok: true } });
  } catch (error) {
    console.error("Change password failed", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Passwort konnte nicht geändert werden" } }, { status: 500 });
  }
}
