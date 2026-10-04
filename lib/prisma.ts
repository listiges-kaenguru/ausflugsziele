import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const databasePath = url.startsWith("file:") ? url.replace("file:", "") : url;
  const resolvedPath = resolve(process.cwd(), databasePath.replace(/^\//, ""));
  mkdirSync(dirname(resolvedPath), { recursive: true });

  const db = new Database(resolvedPath, { fileMustExist: false });
  db.close();

  const adapter = new PrismaBetterSqlite3({ url: resolvedPath }, {});

  return new PrismaClient({ adapter, log: [] });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
