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
      orderBy: { amount: 'desc' },
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

  async create(createBidDto: CreateBidDto) {
    const { userId, auctionId, coffeeLotId, amount } = createBidDto;

    // 1️⃣ Validaciones existentes
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        auctionDetails: {
          where: { coffeeLotId },
          include: { coffeeLot: true },
        },
      },
    });

    if (!auction) throw new NotFoundException('Subasta no encontrada');
    if (auction.status !== AuctionStatus.ACTIVE)
      throw new BadRequestException('La subasta no está activa');

    const coffeeLotInAuction = auction.auctionDetails[0];
    if (!coffeeLotInAuction)
      throw new BadRequestException('El lote no está incluido en esta subasta');

    const highestBid = await this.findHighestBidForCoffeeLot(auctionId, coffeeLotId);
    const minBidAmount = highestBid
      ? highestBid.amount + auction.minIncrement
      : coffeeLotInAuction.startingPrice;

    if (amount < minBidAmount)
      throw new BadRequestException(`El monto debe ser al menos ${minBidAmount}`);

    // 2️⃣ Validación de duplicado: mismo usuario, mismo lote, mismo monto y última puja en pocos segundos
    if (highestBid) {
      const diffSeconds = (new Date().getTime() - new Date(highestBid.createdAt).getTime()) / 1000;

      if (
        highestBid.userId === userId &&
        highestBid.coffeeLotId === coffeeLotId &&
        highestBid.amount === amount &&
        diffSeconds < 5 // ajustar intervalo según necesidad
      ) {
        throw new BadRequestException('Puja duplicada detectada. Espera unos segundos.');
      }
    }

    // 3️⃣ Crear puja
    const bid = await this.prisma.bid.create({
      data: {
        amount,
        auction: { connect: { id: auctionId } },
        user: { connect: { id: userId } },
        coffeeLot: { connect: { id: coffeeLotId } },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        auction: true,
        coffeeLot: true,
      },
    });

    // 4️⃣ Actualizar precio del lote
    await this.prisma.auctionCoffeeLot.update({
      where: { id: coffeeLotInAuction.id },
      data: { currentPrice: amount },
    });

    // 5️⃣ Retornar la puja creada
    return bid;
  }

  // Nuevo método para obtener la puja más alta por lote
  async findHighestBidForCoffeeLot(auctionId: string, coffeeLotId: string) {
    const bids = await this.prisma.bid.findMany({
      where: { 
        auctionId,
        coffeeLotId 
      },
      orderBy: { amount: 'desc' },
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
      if (!seenAmounts.has(currentBid.amount)) {
        filteredBids.push(currentBid);
        seenAmounts.add(currentBid.amount);
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
      return highestBid.amount;
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

    return auctionDetail?.startingPrice || 0;
  }

  async createWithOptimisticLock(createBidDto: CreateBidDto): Promise<any> {
    const TRANSACTION_TIMEOUT = 15000;
    return this.prisma.$transaction(async (tx) => { 
      // 0. Validar que la subasta siga activa y no haya pasado su fecha de fin
      const auction = await tx.auction.findUnique({
        where: { id: createBidDto.auctionId },
        select: { status: true, endDate: true }
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
      }).then(res => res?.amount || 0);

      if (currentPrice === 0) {
        const auctionDetail = await tx.auctionCoffeeLot.findFirst({
          where: {
            auctionId: createBidDto.auctionId,
            coffeeLotId: createBidDto.coffeeLotId,
          },
          select: { startingPrice: true },
        });
        if (auctionDetail?.startingPrice && createBidDto.amount < auctionDetail.startingPrice) {
          throw new Error(`El monto inicial debe ser al menos de $${auctionDetail.startingPrice}`);
        }
      }

      // 2. Validar que el monto sea mayor
      if (currentPrice > 0 && createBidDto.amount <= currentPrice) {
        throw new Error(`El monto debe ser mayor al precio actual ($${currentPrice})`);
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
      orderBy: {
        amount: 'desc',
      },
      select: {
        id: true,
      },
    });

    return highestBid?.id === bidId;
  }
}