import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tagSchema } from "@/lib/validation";
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

    const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ success: true, data: tags });
  } catch (error) {
    console.error("List tags failed", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Tags konnten nicht geladen werden" } }, { status: 500 });
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
    const parsed = tagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Ungültige Eingabe", details: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) } }, { status: 400 });
    }

    const tag = await prisma.tag.create({ data: { name: parsed.data.name } });
    return NextResponse.json({ success: true, data: tag }, { status: 201 });
  } catch (error) {
    console.error("Create tag failed", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Tag konnte nicht erstellt werden" } }, { status: 500 });
  }
}
