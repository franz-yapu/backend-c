import { 
  Injectable, 
  NotFoundException,
  BadRequestException, 
  ConflictException
} from '@nestjs/common';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { AuctionStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuctionTimerService } from './auction-timer.service';

@Injectable()
export class AuctionsService {
  constructor(private prisma: PrismaService, private auctionTimerService: AuctionTimerService) {}

  async create(createAuctionDto: CreateAuctionDto) {
    const admin = await this.prisma.user.findUnique({
      where: { id: createAuctionDto.adminId },
      include: { role: true }
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${createAuctionDto.adminId} not found`);
    }

    if (admin.role.name !== 'ADMIN') {
      throw new BadRequestException('Only admins can create auctions');
    }

    if (new Date(createAuctionDto.startDate) >= new Date(createAuctionDto.endDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    return this.prisma.auction.create({
      data: {
        title: createAuctionDto.title,
        description: createAuctionDto.description,
        startDate: createAuctionDto.startDate,
        endDate: createAuctionDto.endDate,
        minIncrement: createAuctionDto.minIncrement || 0.5,
        status: AuctionStatus.DRAFT,
        isActive: false,
        adminId: createAuctionDto.adminId,
        sellerId: createAuctionDto.sellerId
      },
      include: {
        admin: true,
        seller: true
      }
    });
  }

  async addCoffeeLotToAuction(auctionId: string, coffeeLotId: string, startingPrice: number) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId }
    });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${auctionId} not found`);
    }

    if (auction.status !== AuctionStatus.DRAFT) {
      throw new BadRequestException('Can only add lots to DRAFT auctions');
    }

    const coffeeLot = await this.prisma.coffeeLot.findUnique({
      where: { id: coffeeLotId },
      include: { auction: true }
    });

    if (!coffeeLot) {
      throw new NotFoundException(`Coffee lot with ID ${coffeeLotId} not found`);
    }

    if (coffeeLot.isInAuction) {
      throw new BadRequestException('Coffee lot is already in an auction');
    }

    return this.prisma.$transaction([
      this.prisma.auctionCoffeeLot.create({
        data: { startingPrice, auctionId, coffeeLotId },
        include: { auction: true, coffeeLot: true }
      }),
      this.prisma.coffeeLot.update({
        where: { id: coffeeLotId },
        data: { isInAuction: true, auctionId }
      })
    ]);
  }

  async findAll() {
    return this.prisma.auction.findMany({
      include: {
        admin: true,
        seller: true,
        auctionDetails: {
          include: { coffeeLot: true }
        },
        bids: {
          orderBy: { amount: 'desc' },
          take: 1,
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async findActiveAuctions() {
    return this.prisma.auction.findMany({
      // Exige ambos: status ACTIVE y isActive. Evita devolver "zombies" con
      // status ACTIVE pero isActive false. Refuerza "solo una activa".
      where: { status: 'ACTIVE', isActive: true },
      include: {
        admin: true,
        seller: true,
        auctionDetails: {
          include: { coffeeLot: true }
        },
        bids: {
          orderBy: { amount: 'desc' },
          take: 1,
        },
      },
      orderBy: { endDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id },
      include: {
        admin: true,
        seller: true,
        auctionDetails: {
          include: { coffeeLot: true }
        },
        bids: {
          orderBy: { amount: 'desc' },
          include: { user: true }
        },
        transactions: true,
      },
    });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${id} not found`);
    }

    return auction;
  }

  async update(id: string, updateAuctionDto: UpdateAuctionDto) {
    await this.findOne(id);

    // Coherencia status⟺isActive: ACTIVE ⇒ isActive true; DRAFT/CLOSED ⇒ false.
    // No dejamos que el cliente envíe combinaciones incoherentes (p. ej. status
    // ACTIVE con isActive false, que generaba "zombies" en /auctions/active).
    const data: any = { ...updateAuctionDto };
    if (updateAuctionDto.status === AuctionStatus.ACTIVE) {
      data.isActive = true;
    } else if (
      updateAuctionDto.status === AuctionStatus.DRAFT ||
      updateAuctionDto.status === AuctionStatus.CLOSED
    ) {
      data.isActive = false;
    }

    const updatedAuction = await this.activateGuarded(id, data, {
      admin: true,
      seller: true,
      auctionDetails: { include: { coffeeLot: true } },
    });

    if (updateAuctionDto.status === AuctionStatus.ACTIVE) {
      this.auctionTimerService.onAuctionActivated(id);
    } else if (updateAuctionDto.status === AuctionStatus.CLOSED) {
      this.auctionTimerService.onAuctionDeactivated(id);
    }

    return updatedAuction;
  }

  /**
   * Actualiza la subasta garantizando la invariante "solo UNA activa":
   *  - chequeo previo (mensaje claro) dentro de una transacción, y
   *  - el índice único parcial de BD (one_active_auction) como red de seguridad
   *    atómica frente a activaciones concurrentes (race check-then-act).
   */
  private async activateGuarded(id: string, data: any, include: any) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (data.isActive === true) {
          const other = await tx.auction.findFirst({
            where: { isActive: true, NOT: { id } },
            select: { id: true },
          });
          if (other) {
            throw new ConflictException(
              'Ya hay una subasta activa. Ciérrala antes de activar otra (solo se permite una activa a la vez).',
            );
          }
        }
        return tx.auction.update({ where: { id }, data, include });
      });
    } catch (e: any) {
      // Violación del índice único parcial (dos activaciones en carrera).
      if (e?.code === 'P2002') {
        throw new ConflictException(
          'Ya hay una subasta activa. Ciérrala antes de activar otra (solo se permite una activa a la vez).',
        );
      }
      throw e;
    }
  }

  async remove(id: string) {
    const auction = await this.findOne(id);

    if (auction.status !== AuctionStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT auctions can be deleted');
    }

    return this.prisma.$transaction([
      this.prisma.auctionCoffeeLot.deleteMany({ where: { auctionId: id } }),
      this.prisma.coffeeLot.updateMany({
        where: { auctionId: id },
        data: { isInAuction: false, auctionId: null }
      }),
      this.prisma.auction.delete({ where: { id } })
    ]);
  }

  async updateStatus(id: string, status: AuctionStatus) {
    const auction = await this.findOne(id);

    if (status === AuctionStatus.ACTIVE) {
      if (auction.status !== AuctionStatus.DRAFT) {
        throw new BadRequestException('Only DRAFT auctions can be activated');
      }

      const lotsCount = await this.prisma.auctionCoffeeLot.count({
        where: { auctionId: id }
      });

      if (lotsCount === 0) {
        throw new BadRequestException('Cannot activate auction without coffee lots');
      }
    }

    // Misma garantía que update(): BLOQUEA si ya hay otra activa (antes esta ruta
    // desactivaba silenciosamente las demás y dejaba la anterior como zombie
    // status=ACTIVE,isActive=false). El índice único parcial cubre el race.
    const updatedAuction = await this.activateGuarded(
      id,
      { status, isActive: status === AuctionStatus.ACTIVE },
      { auctionDetails: { include: { coffeeLot: true } } },
    );

    if (status === AuctionStatus.ACTIVE) {
      this.auctionTimerService.onAuctionActivated(id);
    } else if (status === AuctionStatus.CLOSED) {
      this.auctionTimerService.onAuctionDeactivated(id);
    }

    return updatedAuction;
  }

  async getHighestBid(auctionId: string, coffeeLotId?: string) {
    const where: any = { auctionId };
    if (coffeeLotId) {
      where.coffeeLotId = coffeeLotId;
    }

    const bids = await this.prisma.bid.findMany({
      where,
      orderBy: { amount: 'desc' },
      take: 1,
      include: { user: true, coffeeLot: true }
    });

    return bids[0] || null;
  }

  async getActiveAuction() {
    return this.prisma.auction.findFirst({
      where: { isActive: true },
    });
  }

  async findLastClosedAuction() {
    const auction = await this.prisma.auction.findFirst({
      where: { status: 'CLOSED' },
      orderBy: { endDate: 'desc' },
    });

    if (!auction) {
      throw new NotFoundException('No se encontró ninguna subasta cerrada');
    }

    return {
      id: auction.id,
      name: auction.title,
      description: auction.description,
      startDate: auction.startDate,
      endDate: auction.endDate,
      status: auction.status,
    };
  }

  async getServerTime() {
    return {
      serverTime: new Date().toISOString(),
      timestamp: Date.now(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
}