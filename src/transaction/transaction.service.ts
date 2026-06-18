import { 
  Injectable, 
  NotFoundException,
  BadRequestException
} from '@nestjs/common';

import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto) {
    // Validar que la subasta existe
    const auction = await this.prisma.auction.findUnique({
      where: { id: createTransactionDto.auctionId },
    });

    if (!auction) {
      throw new NotFoundException(
        `Auction with ID ${createTransactionDto.auctionId} not found`
      );
    }

    // Validar que el comprador existe
    const buyer = await this.prisma.user.findUnique({
      where: { id: createTransactionDto.buyerId },
    });

    if (!buyer) {
      throw new NotFoundException(
        `Buyer with ID ${createTransactionDto.buyerId} not found`
      );
    }

    // Validar que el vendedor existe
    const seller = await this.prisma.user.findUnique({
      where: { id: createTransactionDto.sellerId },
    });

    if (!seller) {
      throw new NotFoundException(
        `Seller with ID ${createTransactionDto.sellerId} not found`
      );
    }

    return this.prisma.transaction.create({
      data: {
        ...createTransactionDto,
        coffeeLotId: createTransactionDto.coffeeLotId,
        status: createTransactionDto.status || 'PENDING',
      },
      include: {
        auction: true,
        buyer: true,
        coffeeLot: true,
      },
    });
  }

  async findAll() {
    return this.prisma.transaction.findMany({
      include: {
        auction: true,
        buyer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        auction: true,
        buyer: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async update(id: string, updateTransactionDto: UpdateTransactionDto) {
    await this.findOne(id); // Verificar que existe

    return this.prisma.transaction.update({
      where: { id },
      data: updateTransactionDto,
      include: {
        auction: true,
        buyer: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Verificar que existe

    return this.prisma.transaction.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, status: string) {
    const validStatuses = ['PENDING', 'COMPLETED', 'FAILED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    const data: any = { status };
    if (status === 'COMPLETED') {
      data.paymentDate = new Date();
    }

    return this.prisma.transaction.update({
      where: { id },
      data,
    });
  }

  async findByAuction(auctionId: string) {
    return this.prisma.transaction.findMany({
      where: { auctionId },
      include: {
        buyer: true,
        
      },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.transaction.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
        ],
      },
      include: {
        auction: {
          include: {
            coffeeLots: true,
          },
        },
        buyer: true,
        
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

async findAuctionSales(auctionId: string) {
  // Traer todas las transacciones de la subasta con sus relaciones
  const transactions = await this.prisma.transaction.findMany({
    where: { auctionId, status: "COMPLETED" },
    include: {
      buyer: true,
      coffeeLot: true,
      auction: {
        include: {
          auctionDetails: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!transactions.length) {
    throw new NotFoundException(`No hay ventas registradas para la subasta ${auctionId}`);
  }

  return transactions.map((tx) => {
    const lot = tx.coffeeLot; // 👈 ahora sí el lote correcto

    // Buscar detalles de subasta (precio inicial, reserva)
    const auctionDetail = tx.auction.auctionDetails.find(
      (ad) => ad.coffeeLotId === lot.id
    );

    const pricePerLb =
      tx.amount && lot.quantityLbs ? Number(tx.amount) / lot.quantityLbs : null;

    return {
      transactionId: tx.id,
      lotId: lot.id,
      lotName: lot.name,
      variety: lot.variety,
      process: lot.process,
      cupScore: lot.cupScore,
      harvestYear: lot.harvestYear,
      region: lot.region,
      community: lot.community,
      altitude: lot.altitude,
      quantityKg: lot.quantity,
      quantityLbs: lot.quantityLbs,
      position: lot.position,
      seller: lot.seller,


      buyer: {
        id: tx.buyer.id,
        name: `${tx.buyer.firstName} ${tx.buyer.lastName}`,
        email: tx.buyer.email,
        company: tx.buyer.companyName,
      },

      pricing: {
        startingPrice: auctionDetail?.startingPrice ?? null,
        reservePrice: auctionDetail?.reservePrice ?? null,
        finalPrice: tx.amount,
        pricePerLb,
        totalPrice: tx.amount,
      },
      paymentDate: tx.paymentDate,
    };
  });
}

async findBuyerWins(buyerId: string) {
  // Todas las transacciones COMPLETADAS del comprador
  const transactions = await this.prisma.transaction.findMany({
    where: {
      buyerId,
      status: "COMPLETED", // 👈 solo donde efectivamente ganó
    },
    include: {
      buyer: true,
      coffeeLot: true,
      auction: {
        include: {
          bids: {
            where: { coffeeLot: { id: { not: undefined } } },
            include: { user: true },
            orderBy: { amount: "desc" },
          },
          auctionDetails: true,
        },
      },
    },
  });

  if (!transactions.length) {
    throw new NotFoundException(
      `El comprador con ID ${buyerId} no ganó ningún lote`
    );
  }

  return transactions.map((tx) => {
    const lot = tx.coffeeLot;

    const auctionDetail = tx.auction.auctionDetails.find(
      (ad) => ad.coffeeLotId === lot.id
    );

    const pricePerLb =
      tx.amount && lot.quantityLbs ? Number(tx.amount) / lot.quantityLbs : null;

    return {
      transactionId: tx.id,
      lot: {
        id: lot.id,
        name: lot.name,
        variety: lot.variety,
        process: lot.process,
        cupScore: lot.cupScore,
        harvestYear: lot.harvestYear,
        region: lot.region,
        community: lot.community,
        altitude: lot.altitude,
        quantityKg: lot.quantity,
        quantityLbs: lot.quantityLbs,
        seller:lot.seller,
      },

      buyer: {
        id: tx.buyer.id,
        name: `${tx.buyer.firstName} ${tx.buyer.lastName}`,
        email: tx.buyer.email,
        company: tx.buyer.companyName,
      },
      auction: {
        id: tx.auction.id,
        title: tx.auction.title,
        status: tx.auction.status,
        startDate: tx.auction.startDate,
        endDate: tx.auction.endDate,
        bids: tx.auction.bids.map((b) => ({
          id: b.id,
          amount: b.amount,
          createdAt: b.createdAt,
          bidder: {
            id: b.user.id,
            name: `${b.user.firstName} ${b.user.lastName}`,
            email: b.user.email,
          },
        })),
      },
      pricing: {
        startingPrice: auctionDetail?.startingPrice ?? null,
        reservePrice: auctionDetail?.reservePrice ?? null,
        finalPrice: tx.amount,
        pricePerLb,
      },
      paymentDate: tx.paymentDate,
    };
  });
}

}