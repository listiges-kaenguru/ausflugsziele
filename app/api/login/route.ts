import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { getClientIp, isRateLimited } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`login:${ip}`)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "RATE_LIMITED", message: "Zu viele Anmeldeversuche. Bitte später erneut versuchen." },
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Ungültige Eingabe",
            details: parsed.error.issues.map((issue) => ({
              field: issue.path.join(".") || "unknown",
              message: issue.message,
            })),
          },
        },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Benutzername oder Passwort ist falsch",
          },
        },
        { status: 401 }
      );
    }

    const token = await createSessionToken(user.id);
    const response = NextResponse.json({ success: true, data: { user: { id: user.id, username: user.username, role: user.role } } });

    response.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Login fehlgeschlagen" },
      },
      { status: 500 }
    );
  }
}
