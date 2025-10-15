import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCoffeeLotDto } from './dto/create-caffee-lot.dto';
import { UpdateCoffeeLotDto } from './dto/update-caffee-lot.dto';
import { AddCoffeeLotToAuctionDto } from './dto/add-coffee-lot-to-auction.dto';


@Injectable()
export class CoffeeLotsService {
  constructor(private prisma: PrismaService) {}

    async create(createCoffeeLotDto: CreateCoffeeLotDto) {

    // 2. Crear el lote de café
    const coffeeLot = await this.prisma.coffeeLot.create({
      data: {
        ...createCoffeeLotDto,
        // Actualiza este campo si hay subasta
      },
      include: { seller: true },
    });

  

    return coffeeLot;
  }

  async findAll() {
    return this.prisma.coffeeLot.findMany({
      include: { seller: true, auction: true },
    });
  }

  async findOne(id: string) {
    const coffeeLot = await this.prisma.coffeeLot.findUnique({
      where: { id },
      include: { seller: true, auction: true, auctionDetails:true },
    });

    if (!coffeeLot) {
      throw new NotFoundException(`Coffee lot with ID ${id} not found`);
    }

    return coffeeLot;
  }

  async update(id: string, updateCoffeeLotDto: UpdateCoffeeLotDto) {
    await this.findOne(id); // Verificar que existe

    return this.prisma.coffeeLot.update({
      where: { id },
      data: updateCoffeeLotDto,
      include: { seller: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Verificar que existe

    return this.prisma.coffeeLot.delete({
      where: { id },
    });
  }

  async findBySeller(sellerId: string) {
    return this.prisma.coffeeLot.findMany({
      where: { sellerId },
      include: { seller: true },
    });
  }
  async addToAuction(addCoffeeLotToAuctionDto: AddCoffeeLotToAuctionDto) {
    const { auctionId, coffeeLotId, startingPrice, reservePrice } = addCoffeeLotToAuctionDto;

    // Verificar que la subasta existe
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${auctionId} not found`);
    }

    // Verificar que el lote de café existe
    const coffeeLot = await this.prisma.coffeeLot.findUnique({
      where: { id: coffeeLotId },
    });

    if (!coffeeLot) {
      throw new NotFoundException(`Coffee lot with ID ${coffeeLotId} not found`);
    }

    // Verificar que el lote no esté ya en una subasta activa
    if (coffeeLot.isInAuction) {
      throw new ConflictException(`Coffee lot with ID ${coffeeLotId} is already in an auction`);
    }

    // Crear la relación AuctionCoffeeLot
    return this.prisma.$transaction(async (tx) => {
      // Crear la relación
      const auctionCoffeeLot = await tx.auctionCoffeeLot.create({
        data: {
          auctionId,
          coffeeLotId,
          startingPrice,
          reservePrice,
          currentPrice: startingPrice, // Precio actual igual al inicial
        },
        include: {
          auction: true,
          coffeeLot: {
            include: { seller: true }
          },
        },
      });

      // Actualizar el lote de café para marcar que está en subasta
      await tx.coffeeLot.update({
        where: { id: coffeeLotId },
        data: {
          isInAuction: true,
          auctionId: auctionId,
        },
      });

      return auctionCoffeeLot;
    });
  }


   async findByAuction(auctionId: string) {
    // Verificar que la subasta existe
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${auctionId} not found`);
    }

    return this.prisma.auctionCoffeeLot.findMany({
      where: { auctionId },
      include: {
        coffeeLot: {
          include: {
            seller: true
          }
        },
        auction: true
      },
      orderBy: {
        coffeeLot: {
          name: 'asc'
        }
      }
    });
  }

  async removeFromAuction(auctionId: string, coffeeLotId: string) {
    // Verificar que la relación existe
    const auctionCoffeeLot = await this.prisma.auctionCoffeeLot.findUnique({
      where: {
        auctionId_coffeeLotId: {
          auctionId,
          coffeeLotId
        }
      }
    });

    if (!auctionCoffeeLot) {
      throw new NotFoundException(`Coffee lot with ID ${coffeeLotId} is not in auction with ID ${auctionId}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Eliminar la relación
      await tx.auctionCoffeeLot.delete({
        where: {
          auctionId_coffeeLotId: {
            auctionId,
            coffeeLotId
          }
        }
      });

      // Actualizar el lote de café
      await tx.coffeeLot.update({
        where: { id: coffeeLotId },
        data: {
          isInAuction: false,
          auctionId: null,
        },
      });

      return { message: 'Coffee lot removed from auction successfully' };
    });
  }
}