import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const destinationId = formData.get("destinationId") as string | null;
    if (!file || !destinationId) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Datei oder Ziel fehlt" } }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const filePath = path.join(uploadsDir, filename);
    await writeFile(filePath, buffer);

    const image = await prisma.destinationImage.create({
      data: {
        destinationId,
        filename,
        mimeType: file.type || "application/octet-stream",
        filesize: buffer.length,
      },
    });

    return NextResponse.json({ success: true, data: image }, { status: 201 });
  } catch (error) {
    console.error("Upload image failed", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Bild konnte nicht hochgeladen werden" } }, { status: 500 });
  }
}
