import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Verificar si ya existen roles para no duplicar
  const existingRoles = await prisma.role.findMany();
  
  if (existingRoles.length === 0) {
    await prisma.role.createMany({
      data: [
        { 
          name: 'ADMIN', 
          id:'0a973799-b889-489a-84ac-3d4e5c8af31a'
          // Opcional: puedes omitir los IDs y dejar que Prisma genere los UUIDs
        },
        { 
          name: 'BUYER' ,
          id:'d36ad33e-64ab-43df-8b17-49d0f2f328cd'
        },
        { 
          name: 'SELLER', //  solo puede revisar 
          id:'58005159-2d57-4db9-aa4a-34bf3f5b20ff'
        },
        { 
          name: 'GUEST',  // invitado 
          id:'a1bf9fdb-dfd7-4075-9811-33119b9ab80e'
        },
      ],
      skipDuplicates: true,
    });
    
    console.log('Roles creados exitosamente');
  } else {
    console.log('Los roles ya existen en la base de datos');
  }
}

main()
  .catch((e) => {
    console.error('Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });