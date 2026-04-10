import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBranding() {
  const configs = await prisma.branding.findMany({
    orderBy: { updatedAt: 'desc' },
  });
  console.log('Branding Configs in DB:', JSON.stringify(configs, null, 2));
  await prisma.$disconnect();
}

checkBranding();
