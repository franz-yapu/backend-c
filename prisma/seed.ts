import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Password único y simple para TODOS los usuarios de prueba.
const TEST_PASSWORD = 'sample';

const ROLES = [
  { name: 'ADMIN', id: '0a973799-b889-489a-84ac-3d4e5c8af31a' },
  { name: 'BUYER', id: 'd36ad33e-64ab-43df-8b17-49d0f2f328cd' },
  { name: 'SELLER', id: '58005159-2d57-4db9-aa4a-34bf3f5b20ff' }, // solo puede revisar
  { name: 'GUEST', id: 'a1bf9fdb-dfd7-4075-9811-33119b9ab80e' }, // invitado
];

// Usuarios de prueba. Todos van con isVerified: true para poder iniciar sesión
// (el login rechaza cuentas no verificadas). Password de todos: TEST_PASSWORD.
const TEST_USERS = [
  {
    email: 'admin@cafe.test',
    firstName: 'Admin',
    lastName: 'Cáritas',
    companyName: 'Cáritas Bolivia',
    role: 'ADMIN',
    phone: '70000001',
    city: 'La Paz',
    country: 'Bolivia',
  },
  {
    email: 'cliente@cafe.test',
    firstName: 'Carlos',
    lastName: 'Comprador',
    companyName: 'Importadora Andina',
    role: 'BUYER',
    phone: '70000002',
    city: 'Santa Cruz',
    country: 'Bolivia',
  },
  {
    email: 'maria@cafe.test',
    firstName: 'María',
    lastName: 'Quispe',
    companyName: 'Specialty Coffee Co.',
    role: 'BUYER',
    phone: '70000003',
    city: 'Cochabamba',
    country: 'Bolivia',
  },
  {
    email: 'john@buyer.test',
    firstName: 'John',
    lastName: 'Roaster',
    companyName: 'Portland Roasters',
    role: 'BUYER',
    phone: '70000004',
    city: 'Portland',
    country: 'USA',
  },
  {
    email: 'productor@cafe.test',
    firstName: 'Pedro',
    lastName: 'Productor',
    companyName: 'Finca El Cafetal',
    role: 'SELLER',
    phone: '70000005',
    city: 'Caranavi',
    country: 'Bolivia',
  },
  {
    email: 'invitado@cafe.test',
    firstName: 'Invitado',
    lastName: 'Guest',
    companyName: null,
    role: 'GUEST',
    phone: '70000006',
    city: 'La Paz',
    country: 'Bolivia',
  },
  // Usuarios con buzón real (yopmail.com, lectura pública) para PROBAR los
  // correos (verificación y reset de contraseña): admin dispara el reset y juan
  // lo recibe en https://yopmail.com/?juan
  {
    email: 'admin@yopmail.com',
    firstName: 'Admin',
    lastName: 'Yopmail',
    companyName: 'Cáritas Bolivia',
    role: 'ADMIN',
    phone: '70000007',
    city: 'La Paz',
    country: 'Bolivia',
  },
  {
    email: 'juan@yopmail.com',
    firstName: 'Juan',
    lastName: 'Pérez',
    companyName: null,
    role: 'BUYER',
    phone: '70000008',
    city: 'La Paz',
    country: 'Bolivia',
  },
];

async function main() {
  // 1) Roles (idempotente: upsert por id).
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: { name: role.name },
      create: role,
    });
  }
  console.log(`Roles asegurados: ${ROLES.map((r) => r.name).join(', ')}`);

  // 2) Usuarios de prueba (idempotente: upsert por email).
  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
  const rolesByName = Object.fromEntries(ROLES.map((r) => [r.name, r.id]));

  for (const u of TEST_USERS) {
    const roleId = rolesByName[u.role];
    await prisma.user.upsert({
      where: { email: u.email },
      // En update NO tocamos el password para no pisar cambios manuales;
      // sí garantizamos que la cuenta quede verificada y con el rol correcto.
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        companyName: u.companyName,
        phone: u.phone,
        city: u.city,
        country: u.country,
        isVerified: true,
        roleId,
      },
      create: {
        email: u.email,
        password: hashedPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        companyName: u.companyName,
        phone: u.phone,
        city: u.city,
        country: u.country,
        isVerified: true,
        roleId,
      },
    });
  }

  console.log(`\nUsuarios de prueba sembrados (password de todos: "${TEST_PASSWORD}"):`);
  for (const u of TEST_USERS) {
    console.log(`  [${u.role.padEnd(6)}] ${u.email}`);
  }

  // 3) Subasta ACTIVA en curso con 12 lotes.
  await seedActiveAuction();
}

// ── Datos base de 12 lotes de café especial boliviano ───────────────────────
const LOT_SEED = [
  { variety: 'Geisha',        region: 'Caranavi',  community: 'La Esperanza',  process: 'Lavado', cup: 89.5, alt: 1750, start: 18 },
  { variety: 'Java',          region: 'Caranavi',  community: 'San Ignacio',   process: 'Natural', cup: 87.2, alt: 1680, start: 15 },
  { variety: 'Catuai Rojo',   region: 'Yungas',    community: 'Coroico',       process: 'Honey',  cup: 86.0, alt: 1600, start: 13 },
  { variety: 'Caturra',       region: 'Caranavi',  community: 'Taypiplaya',    process: 'Lavado', cup: 85.5, alt: 1550, start: 12 },
  { variety: 'Typica',        region: 'Yungas',    community: 'Chulumani',     process: 'Natural', cup: 88.1, alt: 1720, start: 16 },
  { variety: 'Bourbon',       region: 'Caranavi',  community: 'Villa Rosario', process: 'Lavado', cup: 86.7, alt: 1640, start: 14 },
  { variety: 'SL28',          region: 'Larecaja',  community: 'Sorata',        process: 'Honey',  cup: 87.9, alt: 1800, start: 17 },
  { variety: 'Castillo',      region: 'Caranavi',  community: 'Carrasco',      process: 'Lavado', cup: 84.8, alt: 1500, start: 11 },
  { variety: 'Geisha',        region: 'Yungas',    community: 'Coripata',      process: 'Natural', cup: 90.2, alt: 1850, start: 20 },
  { variety: 'Catuai Amarillo', region: 'Caranavi', community: 'Santa Fe',     process: 'Honey',  cup: 85.9, alt: 1620, start: 13 },
  { variety: 'Pacamara',      region: 'Larecaja',  community: 'Consata',       process: 'Lavado', cup: 88.6, alt: 1780, start: 17 },
  { variety: 'Mundo Novo',    region: 'Yungas',    community: 'Irupana',       process: 'Natural', cup: 85.2, alt: 1560, start: 12 },
];

const AUCTION_ID = '11111111-1111-1111-1111-111111111111';

async function seedActiveAuction() {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@cafe.test' } });
  const seller = await prisma.user.findUnique({ where: { email: 'productor@cafe.test' } });
  if (!admin || !seller) {
    console.log('⚠️  No se encontraron admin/seller; se omite la subasta de prueba.');
    return;
  }

  // Fechas frescas: empezó hace 1h, termina en 3 días → subasta EN CURSO.
  const now = new Date();
  const startDate = new Date(now.getTime() - 60 * 60 * 1000);
  const endDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Solo puede haber UNA subasta activa (índice parcial en BD): desactivar otras.
  await prisma.auction.updateMany({
    where: { isActive: true, id: { not: AUCTION_ID } },
    data: { isActive: false, status: 'CLOSED' },
  });

  await prisma.auction.upsert({
    where: { id: AUCTION_ID },
    update: { startDate, endDate, status: 'ACTIVE', isActive: true, originalEndDate: endDate },
    create: {
      id: AUCTION_ID,
      title: 'Subasta de Cafés Especiales — Cáritas Bolivia 2026',
      description: 'Lotes de microproductores de los Yungas y Caranavi. Puja en vivo.',
      startDate,
      endDate,
      originalEndDate: endDate,
      minIncrement: 0.25,
      status: 'ACTIVE',
      isActive: true,
      adminId: admin.id,
      sellerId: seller.id,
    },
  });

  for (let i = 0; i < LOT_SEED.length; i++) {
    const d = LOT_SEED[i];
    const position = i + 1;
    const lotId = `22222222-0000-0000-0000-${String(position).padStart(12, '0')}`;
    const quantityLbs = 350 + i * 12;

    await prisma.coffeeLot.upsert({
      where: { id: lotId },
      update: { auctionId: AUCTION_ID, isInAuction: true, status: 'IN_AUCTION', position },
      create: {
        id: lotId,
        name: `Lote ${position} — ${d.variety} (${d.community})`,
        description: `Café ${d.variety} de ${d.community}, ${d.region}. Proceso ${d.process}.`,
        producerName: `Productor ${position}`,
        isSpecialty: true,
        cupScore: d.cup,
        variety: d.variety,
        process: d.process,
        dryingSystem: 'Mesa africana',
        quantityLbs,
        quantity: +(quantityLbs * 0.4536).toFixed(2),
        position,
        harvestYear: 2025,
        country: 'Bolivia',
        region: d.region,
        province: 'Caranavi',
        community: d.community,
        altitude: d.alt,
        productionSystem: 'Ecológico',
        fragranceAroma: 'sultana, avellanas y chocolate',
        acidity: 'cítrica',
        flavor: 'caramelo, nuez, miel; cuerpo sedoso',
        status: 'IN_AUCTION',
        isInAuction: true,
        seller: seller.id,
        auctionId: AUCTION_ID,
      },
    });

    await prisma.auctionCoffeeLot.upsert({
      where: { auctionId_coffeeLotId: { auctionId: AUCTION_ID, coffeeLotId: lotId } },
      // Reseteamos también currentPrice a la base: seedBids() lo sube luego solo
      // en los lotes con puja, evitando precios "fantasma" de reseeds anteriores.
      update: { startingPrice: d.start, reservePrice: d.start + 2, currentPrice: d.start },
      create: {
        auctionId: AUCTION_ID,
        coffeeLotId: lotId,
        startingPrice: d.start,
        reservePrice: d.start + 2,
        currentPrice: d.start,
      },
    });
  }

  console.log(`\nSubasta ACTIVA sembrada: "${AUCTION_ID}" con ${LOT_SEED.length} lotes (termina ${endDate.toISOString()}).`);

  // 4) Pujas de prueba en algunos lotes (para probar historial, "vas ganando",
  //    precio actual, etc. sin tener que pujar a mano).
  await seedBids();
}

// Siembra pujas en los primeros lotes: varios compradores pujando en escalera.
// Idempotente: borra las pujas previas de esta subasta antes de recrearlas y
// deja `currentPrice` del lote igual al monto de la puja ganadora.
async function seedBids() {
  const buyers = await prisma.user.findMany({
    where: {
      email: {
        in: [
          'cliente@cafe.test',
          'maria@cafe.test',
          'john@buyer.test',
          'juan@yopmail.com',
        ],
      },
    },
  });
  if (buyers.length === 0) {
    console.log('⚠️  No hay compradores; se omiten las pujas de prueba.');
    return;
  }

  // Idempotencia: limpia las pujas anteriores de la subasta de prueba.
  await prisma.bid.deleteMany({ where: { auctionId: AUCTION_ID } });

  // Sembramos pujas solo en los primeros N lotes; el resto queda "sin pujas".
  const LOTS_WITH_BIDS = 7;
  const now = Date.now();
  let totalBids = 0;

  for (let i = 0; i < LOTS_WITH_BIDS; i++) {
    const position = i + 1;
    const lotId = `22222222-0000-0000-0000-${String(position).padStart(12, '0')}`;
    const startingPrice = LOT_SEED[i].start;

    const nBids = 2 + (i % 3); // entre 2 y 4 pujas por lote
    let amount = startingPrice;
    let winning = startingPrice;

    for (let b = 0; b < nBids; b++) {
      // Sube por encima del incremento mínimo (0.25) de forma creciente.
      amount = +(amount + 0.25 * (b + 1)).toFixed(2);
      winning = amount;
      // Rota compradores para que el "ganador" varíe entre lotes.
      const buyer = buyers[(i + b) % buyers.length];
      // Pujas escalonadas en el tiempo (la última, la más reciente).
      const createdAt = new Date(now - (nBids - b) * 5 * 60 * 1000);

      await prisma.bid.create({
        data: {
          amount,
          auctionId: AUCTION_ID,
          coffeeLotId: lotId,
          userId: buyer.id,
          createdAt,
        },
      });
      totalBids++;
    }

    // El precio actual del lote = monto de la puja ganadora.
    await prisma.auctionCoffeeLot.update({
      where: {
        auctionId_coffeeLotId: { auctionId: AUCTION_ID, coffeeLotId: lotId },
      },
      data: { currentPrice: winning },
    });
  }

  console.log(
    `Pujas de prueba sembradas: ${totalBids} pujas en ${LOTS_WITH_BIDS} lotes (los otros ${LOT_SEED.length - LOTS_WITH_BIDS} quedan sin pujas).`,
  );
}

main()
  .catch((e) => {
    console.error('Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
