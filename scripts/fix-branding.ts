import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ACTIVE_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('Cleaning duplicate active branding records...');
  
  // 1. Deactivate all
  await prisma.branding.updateMany({
    data: { isActive: false }
  });

  // 2. Activate only ACTIVE_ID
  const config = await prisma.branding.upsert({
    where: { id: ACTIVE_ID },
    update: { isActive: true },
    create: {
      id: ACTIVE_ID,
      primaryColor: '#CA3636',
      secondaryColor: '#FF9A24',
      isActive: true,
      themeMode: 'light',
      fontFamily: 'Inter',
      borderRadius: '4px',
    }
  });

  console.log('Main branding config activated:', config);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
