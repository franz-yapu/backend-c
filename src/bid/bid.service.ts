import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  forwardRef,
  Inject
} from '@nestjs/common';
import { CreateBidDto } from './dto/create-bid.dto';
import { AuctionStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { BidsGateway } from './bids.gateway';

@Injectable()
export class BidsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async findAllForAuction(auctionId: string) {
    return this.prisma.bid.findMany({
      where: { auctionId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
        coffeeLot: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        amount: 'desc',
      },
    });
  }

  async findHighestBid(auctionId: string) {
    const bids = await this.prisma.bid.findMany({
      where: { auctionId },
      orderBy: [
        { amount: 'desc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      take: 1,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
      },
    });

    return bids[0] || null;
  }

  async getUserBids(userId: string) {
    return this.prisma.bid.findMany({
      where: { userId },
      include: {
        auction: true,
        coffeeLot: {
          select: {
            id: true,
            name: true,
            country: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getBidsByCoffeeLot(auctionId: string, coffeeLotId: string) {
    return this.prisma.bid.findMany({
      where: { 
        auctionId,
        coffeeLotId 
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        amount: 'desc',
      },
    });
  }

  // NOTA: el antiguo create() REST (sin advisory lock y con userId del body) se
  // eliminó por ser una puerta paralela insegura. POST /bids ahora usa
  // createWithOptimisticLock con el userId del JWT (ver BidsController).

  // Nuevo método para obtener la puja más alta por lote
  async findHighestBidForCoffeeLot(auctionId: string, coffeeLotId: string) {
    const bids = await this.prisma.bid.findMany({
      where: {
        auctionId,
        coffeeLotId
      },
      orderBy: [
        { amount: 'desc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      take: 1,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
      },
    });

    return bids[0] || null;
  }

  async findLastBids(auctionId: string, coffeeLotId: string, limit = 5) {
    // Traemos las pujas más recientes
    const bids = await this.prisma.bid.findMany({
      where: { auctionId, coffeeLotId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true , companyName: true },
        },
      },
    });

    // Filtramos montos duplicados
    const seenAmounts = new Set<number>();
    const filteredBids: typeof bids = []; // explicitamos tipo

    for (let i = 0; i < bids.length; i++) {
      const currentBid = bids[i]; // usamos currentBid en vez de bid
      const amountNum = Number(currentBid.amount);
      if (!seenAmounts.has(amountNum)) {
        filteredBids.push(currentBid);
        seenAmounts.add(amountNum);
      }
      if (filteredBids.length >= limit) break;
    }

    return filteredBids;
  }

  async findLastBidByUserAndLot(userId: string, coffeeLotId: string) {
    return this.prisma.bid.findFirst({
      where: { userId, coffeeLotId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAuction(auctionId: string) {
    return this.prisma.auction.findUnique({
      where: { id: auctionId }
    });
  }

  // ✅ NUEVOS MÉTODOS PARA EXTENSIÓN INMEDIATA
  async findRecentBids(auctionId: string, thresholdTime: Date) {
    return this.prisma.bid.findMany({
      where: {
        auctionId,
        createdAt: {
          gte: thresholdTime
        }
      }
    });
  }

  async extendAuction(auctionId: string, newEndDate: Date) {
    return this.prisma.auction.update({
      where: { id: auctionId },
      data: { endDate: newEndDate }
    });
  }

   async getCurrentPrice(auctionId: string, coffeeLotId: string): Promise<number> {
    const highestBid = await this.prisma.bid.findFirst({
      where: {
        auctionId,
        coffeeLotId,
      },
      orderBy: {
        amount: 'desc',
      },
      select: {
        amount: true,
      },
    });

    if (highestBid) {
      return Number(highestBid.amount);
    }

    // Si no hay pujas, obtener precio inicial del lote
    const auctionDetail = await this.prisma.auctionCoffeeLot.findFirst({
      where: {
        auctionId,
        coffeeLotId,
      },
      select: {
        startingPrice: true,
      },
    });

    return Number(auctionDetail?.startingPrice ?? 0);
  }

  async createWithOptimisticLock(createBidDto: CreateBidDto): Promise<any> {
    const TRANSACTION_TIMEOUT = 15000;
    return this.prisma.$transaction(async (tx) => {
      // 🔒 Serialización por lote a nivel de BASE DE DATOS.
      // Las pujas concurrentes al MISMO lote se procesan una a una: la cerradura
      // se mantiene hasta que esta transacción hace commit/rollback. A diferencia
      // del candado en memoria, esto es correcto incluso con varias instancias del
      // backend y evita por completo que dos pujas lean el mismo precio a la vez.
      // $executeRaw (no $queryRaw): pg_advisory_xact_lock devuelve `void` y
      // $queryRaw fallaría al intentar deserializar esa columna.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${createBidDto.coffeeLotId})::int8)`;

      // 0. Validar que la subasta siga activa y no haya pasado su fecha de fin
      const auction = await tx.auction.findUnique({
        where: { id: createBidDto.auctionId },
        select: { status: true, endDate: true, minIncrement: true }
      });
      if (!auction || auction.status !== 'ACTIVE') {
        throw new Error('La subasta no está activa');
      }
      if (new Date() > new Date(auction.endDate)) {
        throw new Error('El tiempo de la subasta ha finalizado');
      }

      // 1. Verificar precio actual dentro de la transacción
      const currentPrice = await tx.bid.findFirst({
        where: {
          auctionId: createBidDto.auctionId,
          coffeeLotId: createBidDto.coffeeLotId,
        },
        orderBy: { amount: 'desc' },
        select: { amount: true },
      }).then(res => Number(res?.amount ?? 0));

      if (currentPrice === 0) {
        const auctionDetail = await tx.auctionCoffeeLot.findFirst({
          where: {
            auctionId: createBidDto.auctionId,
            coffeeLotId: createBidDto.coffeeLotId,
          },
          select: { startingPrice: true },
        });
        const startingPrice = Number(auctionDetail?.startingPrice ?? 0);
        if (startingPrice && createBidDto.amount < startingPrice) {
          throw new Error(`El monto inicial debe ser al menos de $${startingPrice}`);
        }
      }

      // 2. Validar que el monto respete el incremento mínimo de la subasta.
      // El front ya lo exige, pero el servidor debe imponerlo también por la vía
      // socket: si no, un cliente manipulado podría pujar currentPrice + 0.01 y
      // saltarse el minIncrement, rompiendo la equidad de la puja.
      if (currentPrice > 0) {
        const minIncrement = Number(auction.minIncrement ?? 0);
        const minBidAmount = currentPrice + minIncrement;
        // Estrictamente mayor al precio actual aunque minIncrement sea 0, y
        // siempre respetando el incremento mínimo cuando lo haya.
        if (createBidDto.amount <= currentPrice || createBidDto.amount < minBidAmount) {
          throw new Error(
            `El monto debe ser al menos de $${minBidAmount} (precio actual $${currentPrice} + incremento mínimo $${minIncrement})`,
          );
        }
      }

      // 3. Crear la puja
      const bid = await tx.bid.create({
        data: {
          amount: createBidDto.amount,
          auctionId: createBidDto.auctionId,
          coffeeLotId: createBidDto.coffeeLotId,
          userId: createBidDto.userId,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
      });

      // 4. Actualizar precio actual en auctionCoffeeLot
      await tx.auctionCoffeeLot.updateMany({
        where: {
          auctionId: createBidDto.auctionId,
          coffeeLotId: createBidDto.coffeeLotId,
        },
        data: {
          currentPrice: createBidDto.amount,
        },
      });

      return bid;
    }, {
      maxWait: 5000, // Tiempo máximo de espera
       timeout: TRANSACTION_TIMEOUT, // Timeout ajustable
    });
  }

  async isWinningBid(auctionId: string, coffeeLotId: string, bidId: string): Promise<boolean> {
    const highestBid = await this.prisma.bid.findFirst({
      where: {
        auctionId,
        coffeeLotId,
      },
      // Desempate determinista IDÉNTICO al del cierre de subasta:
      // a igual monto gana el primero en el tiempo.
      orderBy: [
        { amount: 'desc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      select: {
        id: true,
      },
    });

    return highestBid?.id === bidId;
  }
}