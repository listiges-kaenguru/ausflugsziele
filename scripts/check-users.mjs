import { prisma } from '../lib/prisma.js';

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, username: true, role: true } });
  console.log('Users:', users);
}

main().finally(async () => {
  await prisma.$disconnect();
});
