import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const brandings = await prisma.branding.findMany({
    orderBy: { updatedAt: 'desc' }
  });
  console.log('--- BRANDING RECORDS ---');
  console.log(JSON.stringify(brandings, null, 2));
  process.exit(0);
}

main();
