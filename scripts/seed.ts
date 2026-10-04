import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!admin) {
    await prisma.user.create({
      data: {
        username: "admin",
        passwordHash: await bcrypt.hash("admin123", 10),
        role: "ADMIN",
      },
    });
  }

  const tags = ["Natur", "Kultur", "Food", "Familie", "Weekend"];
  for (const name of tags) {
    await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const demoUser = await prisma.user.findUnique({ where: { username: "demo" } });
  if (!demoUser) {
    await prisma.user.create({
      data: {
        username: "demo",
        passwordHash: await bcrypt.hash("demo123", 10),
        role: "USER",
      },
    });
  }

  const user = await prisma.user.findUnique({ where: { username: "demo" } });
  if (user) {
    const existing = await prisma.destination.findFirst({ where: { name: "Bergwanderung", createdBy: user.id } });
    if (!existing) {
      await prisma.destination.create({
        data: {
          name: "Bergwanderung",
          address: "Bergstraße 12, 8000 Zürich",
          description: "Schöner Tagesausflug mit Aussichtspunkt.",
          rating: 5,
          favorite: true,
          visited: false,
          createdBy: user.id,
          tags: {
            create: [
              { tag: { connect: { name: "Natur" } } },
              { tag: { connect: { name: "Weekend" } } },
            ],
          },
        },
      });
    }
  }

  console.log("Seed completed");
}

main().finally(async () => {
  await prisma.$disconnect();
});
