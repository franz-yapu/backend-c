/**
 * Test de CONCURRENCIA del flujo de pujas.
 *
 * Verifica las dos garantías que protegen el dinero en las subastas:
 *   1. Advisory lock por lote: dos pujas concurrentes al mismo lote NO pueden
 *      ser aceptadas a la vez (no hay doble adjudicación).
 *   2. Desempate determinista (amount DESC, createdAt ASC, id ASC): a igual
 *      monto SIEMPRE gana el primero en el tiempo, de forma estable.
 *
 * ⚠️ Corre contra una BASE DE DATOS POSTGRES REAL (no usa mocks). Por eso está
 *    DESACTIVADO por defecto y solo se ejecuta con opt-in explícito, para que
 *    nunca toque producción por accidente:
 *
 *        RUN_CONCURRENCY_TEST=1 DATABASE_URL="postgres://...staging..." npm run test:concurrency
 *
 *    Usa SIEMPRE una base de datos de pruebas/staging, nunca la de producción.
 *    El test crea sus propios datos con un sufijo único y los borra al terminar.
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import { BidsService } from '../src/bid/bid.service';
import { CreateBidDto } from '../src/bid/dto/create-bid.dto';
import { AuctionClosureService } from '../src/auction/auction-closure.service';
import { EmailService } from '../src/email/email.service';
import { BidsGateway } from '../src/bid/bids.gateway';

const SHOULD_RUN =
  process.env.RUN_CONCURRENCY_TEST === '1' && !!process.env.DATABASE_URL;

// describe.skip si no hay opt-in: jamás corre por accidente (p. ej. en CI sin BD).
const suite = SHOULD_RUN ? describe : describe.skip;

if (!SHOULD_RUN) {
  // eslint-disable-next-line no-console
  console.warn(
    '⏭️  bids-concurrency: omitido. Actívalo con RUN_CONCURRENCY_TEST=1 y un DATABASE_URL de pruebas.',
  );
}

suite('Concurrencia de pujas (advisory lock + desempate)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let bidsService: BidsService;
  let closureService: AuctionClosureService;

  // Sufijo único para aislar los datos de esta corrida y poder limpiarlos.
  const TAG = `cctest_${Date.now()}`;
  const STARTING_PRICE = 100;

  let roleId: string;
  let adminId: string;
  let coffeeLotId: string;
  let auctionId: string;
  let auctionCoffeeLotId: string;
  const bidderIds: string[] = [];

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        BidsService,
        PrismaService,
        AuctionClosureService,
        // Mocks: el cierre no debe enviar correos reales ni necesitar el socket.
        {
          provide: EmailService,
          useValue: { sendAuctionWinNotification: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: BidsGateway,
          useValue: { notifyAuctionClosed: jest.fn(), notifyAuctionExtension: jest.fn() },
        },
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    bidsService = moduleRef.get(BidsService);
    closureService = moduleRef.get(AuctionClosureService);
    // onModuleInit conecta Y registra el middleware que convierte Decimal -> number.
    await prisma.onModuleInit();

    // --- Fixtures (respetan las FK del schema) ---
    const role = await prisma.role.create({
      data: { name: `${TAG}_ROLE` },
    });
    roleId = role.id;

    const admin = await prisma.user.create({
      data: { email: `${TAG}_admin@test.local`, password: 'x', roleId },
    });
    adminId = admin.id;

    // 12 pujadores concurrentes
    for (let i = 0; i < 12; i++) {
      const u = await prisma.user.create({
        data: { email: `${TAG}_bidder${i}@test.local`, password: 'x', roleId },
      });
      bidderIds.push(u.id);
    }

    const lot = await prisma.coffeeLot.create({
      data: { name: `${TAG}_LOT`, quantity: 100, seller: `${TAG}_seller` },
    });
    coffeeLotId = lot.id;

    const auction = await prisma.auction.create({
      data: {
        title: `${TAG}_AUCTION`,
        startDate: new Date(Date.now() - 60_000), // ya empezó
        endDate: new Date(Date.now() + 60 * 60_000), // termina en 1h
        status: 'ACTIVE',
        isActive: true,
        minIncrement: 0.5,
        adminId,
      },
    });
    auctionId = auction.id;

    const acl = await prisma.auctionCoffeeLot.create({
      data: { auctionId, coffeeLotId, startingPrice: STARTING_PRICE, currentPrice: 0 },
    });
    auctionCoffeeLotId = acl.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    // Limpieza en orden de dependencias (FK).
    await prisma.transaction.deleteMany({ where: { auctionId } });
    await prisma.bid.deleteMany({ where: { auctionId } });
    await prisma.auctionCoffeeLot.deleteMany({ where: { auctionId } });
    await prisma.auction.deleteMany({ where: { id: auctionId } });
    await prisma.coffeeLot.deleteMany({ where: { id: coffeeLotId } });
    await prisma.user.deleteMany({ where: { roleId } });
    await prisma.role.deleteMany({ where: { id: roleId } });
    await prisma.$disconnect();
    await moduleRef.close();
  });

  // Cada test arranca con el lote "limpio": sin pujas y precio en 0.
  beforeEach(async () => {
    await prisma.bid.deleteMany({ where: { auctionId, coffeeLotId } });
    await prisma.auctionCoffeeLot.update({
      where: { id: auctionCoffeeLotId },
      data: { currentPrice: 0 },
    });
  });

  it('A) ráfaga de pujas IDÉNTICAS concurrentes: solo UNA es aceptada', async () => {
    const SAME_AMOUNT = STARTING_PRICE + 5;

    // Todos los pujadores intentan exactamente el mismo monto, a la vez.
    const attempts = bidderIds.map((userId) => {
      const dto: CreateBidDto = {
        amount: SAME_AMOUNT,
        auctionId,
        coffeeLotId,
        userId,
      };
      return bidsService.createWithOptimisticLock(dto);
    });

    const results = await Promise.allSettled(attempts);
    const accepted = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Sin serialización, varias entrarían (todas leerían precio 0). Con el
    // advisory lock, la primera fija el precio y el resto falla por "monto <= actual".
    expect(accepted.length).toBe(1);
    expect(rejected.length).toBe(bidderIds.length - 1);

    // En la BD debe existir UNA sola puja a ese monto para el lote.
    const count = await prisma.bid.count({
      where: { auctionId, coffeeLotId, amount: SAME_AMOUNT },
    });
    expect(count).toBe(1);

    // El precio actual del lote quedó fijado en ese monto.
    const acl = await prisma.auctionCoffeeLot.findUnique({
      where: { id: auctionCoffeeLotId },
    });
    expect(acl?.currentPrice).toBe(SAME_AMOUNT);
  });

  it('B) empate de montos: gana el PRIMERO en el tiempo, de forma estable', async () => {
    const TIE_AMOUNT = STARTING_PRICE + 10;
    const base = Date.now();

    // Creamos 4 pujas del MISMO monto con createdAt escalonado, insertadas en
    // orden DESORDENADO para probar que el ganador no depende del orden de inserción.
    const order = [2, 0, 3, 1]; // índice = antigüedad (0 = el más antiguo)
    const idsByAge: string[] = new Array(4);
    for (const ageIdx of order) {
      const bid = await prisma.bid.create({
        data: {
          amount: TIE_AMOUNT,
          auctionId,
          coffeeLotId,
          userId: bidderIds[ageIdx],
          createdAt: new Date(base + ageIdx * 1000), // 0 es el más antiguo
        },
      });
      idsByAge[ageIdx] = bid.id;
    }

    const earliestId = idsByAge[0];
    const laterId = idsByAge[3];

    // El "más alto" devuelto debe ser el más antiguo (primero en el tiempo)...
    const highest = await bidsService.findHighestBidForCoffeeLot(auctionId, coffeeLotId);
    expect(highest?.id).toBe(earliestId);

    // ...y debe ser ESTABLE: misma respuesta en lecturas repetidas.
    for (let i = 0; i < 5; i++) {
      const again = await bidsService.findHighestBidForCoffeeLot(auctionId, coffeeLotId);
      expect(again?.id).toBe(earliestId);
    }

    // isWinningBid coincide con esa regla (misma usada en el cierre de subasta).
    expect(await bidsService.isWinningBid(auctionId, coffeeLotId, earliestId)).toBe(true);
    expect(await bidsService.isWinningBid(auctionId, coffeeLotId, laterId)).toBe(false);
  });

  it('C) ráfaga concurrente con montos MEZCLADOS: gana la puja más alta y es única', async () => {
    // Cada pujador ofrece un monto distinto (creciente), todos a la vez.
    const amounts = bidderIds.map((_, i) => STARTING_PRICE + 1 + i);
    const maxAmount = Math.max(...amounts);

    const attempts = bidderIds.map((userId, i) =>
      bidsService.createWithOptimisticLock({
        amount: amounts[i],
        auctionId,
        coffeeLotId,
        userId,
      }),
    );
    const results = await Promise.allSettled(attempts);

    // Al menos una debe entrar (la(s) que respeten "monto > actual" en su turno).
    const accepted = results.filter((r) => r.status === 'fulfilled');
    expect(accepted.length).toBeGreaterThanOrEqual(1);

    // El ganador determinista es la puja de monto máximo, y solo ella gana.
    const winner = await bidsService.findHighestBidForCoffeeLot(auctionId, coffeeLotId);
    expect(winner?.amount).toBe(maxAmount);
    expect(await bidsService.isWinningBid(auctionId, coffeeLotId, winner!.id)).toBe(true);

    // Nunca puede haber dos pujas aceptadas con el mismo monto (lock + validación).
    const grouped = await prisma.bid.groupBy({
      by: ['amount'],
      where: { auctionId, coffeeLotId },
      _count: { _all: true },
    });
    for (const g of grouped) {
      expect(g._count._all).toBe(1);
    }
  });

  it('D) el dinero se ALMACENA y SUMA de forma EXACTA (Decimal, no float)', async () => {
    // Almacenamiento exacto a 2 decimales y devuelto como number (no Prisma.Decimal).
    const bid: any = await bidsService.createWithOptimisticLock({
      amount: STARTING_PRICE + 5.55, // 105.55
      auctionId,
      coffeeLotId,
      userId: bidderIds[0],
    });
    expect(typeof bid.amount).toBe('number');
    expect(bid.amount).toBe(105.55);

    // Suma EXACTA en SQL (numeric): 0.1 + 0.2 = 0.3.
    // En float puro daría 0.30000000000000004 (ver contraste abajo).
    await prisma.transaction.create({
      data: { amount: 0.1, status: 'COMPLETED', auctionId, buyerId: bidderIds[0], sellerId: 'seller', coffeeLotId },
    });
    await prisma.transaction.create({
      data: { amount: 0.2, status: 'COMPLETED', auctionId, buyerId: bidderIds[1], sellerId: 'seller', coffeeLotId },
    });
    const agg = await prisma.transaction.aggregate({
      where: { auctionId },
      _sum: { amount: true },
    });
    expect(agg._sum.amount).toBe(0.3);
    // Contraste: la suma en float NO es exacta (justo lo que Decimal evita).
    expect(0.1 + 0.2).not.toBe(0.3);

    await prisma.transaction.deleteMany({ where: { auctionId } });
  });

  it('E) el servidor IMPONE el incremento mínimo por la vía socket', async () => {
    // El front exige minIncrement, pero el servidor debe imponerlo también:
    // un cliente manipulado no puede saltarse el incremento mínimo (0.5 aquí).

    // 1) Primera puja válida fija el precio actual en STARTING_PRICE.
    const first: any = await bidsService.createWithOptimisticLock({
      amount: STARTING_PRICE,
      auctionId,
      coffeeLotId,
      userId: bidderIds[0],
    });
    expect(first.amount).toBe(STARTING_PRICE);

    // 2) Una puja por DEBAJO del incremento mínimo (precio + 0.01 < precio + 0.5)
    //    debe ser RECHAZADA aunque sea mayor que el precio actual.
    await expect(
      bidsService.createWithOptimisticLock({
        amount: STARTING_PRICE + 0.01,
        auctionId,
        coffeeLotId,
        userId: bidderIds[1],
      }),
    ).rejects.toThrow();

    // 3) Una puja que respeta EXACTAMENTE el incremento mínimo es ACEPTADA.
    const valid: any = await bidsService.createWithOptimisticLock({
      amount: STARTING_PRICE + 0.5,
      auctionId,
      coffeeLotId,
      userId: bidderIds[2],
    });
    expect(valid.amount).toBe(STARTING_PRICE + 0.5);

    // El precio actual del lote refleja solo las pujas aceptadas (no la rechazada).
    const acl = await prisma.auctionCoffeeLot.findUnique({
      where: { id: auctionCoffeeLotId },
    });
    expect(acl?.currentPrice).toBe(STARTING_PRICE + 0.5);

    // En la BD no quedó rastro de la puja rechazada.
    const tooLow = await prisma.bid.count({
      where: { auctionId, coffeeLotId, amount: STARTING_PRICE + 0.01 },
    });
    expect(tooLow).toBe(0);
  });

  // ⚠️ DEBE ir al final: este test CIERRA la subasta (status -> CLOSED, lote -> SOLD).
  it('F) carrera cierre-vs-puja: el cierre ESPERA a la puja en vuelo y la adjudica', async () => {
    // Puja base (sería el "ganador viejo" si el cierre NO esperara).
    await bidsService.createWithOptimisticLock({
      amount: STARTING_PRICE + 1,
      auctionId,
      coffeeLotId,
      userId: bidderIds[0],
    });

    const HIGHER = STARTING_PRICE + 50;

    // Señales para orquestar el interleaving SIN depender de timings frágiles.
    let signalAcquired!: () => void;
    const acquired = new Promise<void>((res) => (signalAcquired = res));
    let releaseInFlight!: () => void;
    const gate = new Promise<void>((res) => (releaseInFlight = res));

    // "Puja en vuelo": una transacción que toma el MISMO advisory lock del lote
    // y crea una puja más alta, pero NO commitea hasta que el test la libere.
    // Reproduce a un bidder a mitad de createWithOptimisticLock.
    const inFlightDone = prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${coffeeLotId})::int8)`;
        await tx.bid.create({
          data: { amount: HIGHER, auctionId, coffeeLotId, userId: bidderIds[1] },
        });
        signalAcquired(); // ya tenemos el lock + la puja (aún sin commit)
        await gate; // mantener la transacción (y el lock) abierta
      },
      { timeout: 20000, maxWait: 20000 },
    );

    // Garantiza que la puja en vuelo tiene el lock ANTES de disparar el cierre.
    await acquired;

    // Cierre en paralelo: con el fix debe BLOQUEARSE al pedir el lock del lote.
    const closeDone = closureService.closeAuction(auctionId);

    // Mientras la puja en vuelo retiene el lock, el cierre NO debe completar.
    // (Sin el fix, el cierre no espera y resolvería como 'closed' aquí.)
    const raced = await Promise.race([
      closeDone.then(() => 'closed'),
      new Promise((r) => setTimeout(() => r('waiting'), 1000)),
    ]);
    expect(raced).toBe('waiting');

    // Liberamos la puja en vuelo (commit). El cierre continúa y adjudica.
    releaseInFlight();
    await inFlightDone;
    const winners = await closeDone;

    // El ganador adjudicado es la puja MÁS ALTA (la que estaba en vuelo),
    // no la base: el cierre esperó y vio la puja recién confirmada.
    expect(winners.length).toBe(1);
    expect(Number(winners[0].transaction.amount)).toBe(HIGHER);
    expect(winners[0].winningBid.userId).toBe(bidderIds[1]);
  });
});
