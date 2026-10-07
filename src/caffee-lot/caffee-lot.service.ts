import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BidsGateway } from 'src/bid/bids.gateway';
import { CreateCoffeeLotDto } from './dto/create-caffee-lot.dto';
import { UpdateCoffeeLotDto } from './dto/update-caffee-lot.dto';
import { AddCoffeeLotToAuctionDto } from './dto/add-coffee-lot-to-auction.dto';


@Injectable()
export class CoffeeLotsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => BidsGateway))
    private bidsGateway: BidsGateway,
  ) {}

    async create(createCoffeeLotDto: CreateCoffeeLotDto) {

    // 2. Crear el lote de café
    const coffeeLot = await this.prisma.coffeeLot.create({
      data: {
        ...createCoffeeLotDto,
        // Actualiza este campo si hay subasta
      }
    });

  

    return coffeeLot;
  }

  async findAll() {
    return this.prisma.coffeeLot.findMany({
      include: {  auction: true },
    });
  }

  async findOne(id: string) {
    const coffeeLot = await this.prisma.coffeeLot.findUnique({
      where: { id },
      include: {  auction: true, auctionDetails:true },
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
      
    });
  }

  async remove(id: string) {
    const coffeeLot = await this.prisma.coffeeLot.findUnique({
      where: { id },
      include: {
        _count: {
          select: { auctionDetails: true, bids: true, transactions: true },
        },
      },
    });

    if (!coffeeLot) {
      throw new NotFoundException(`Coffee lot with ID ${id} not found`);
    }

    // Guardia de integridad: nunca borrar un lote vinculado a una subasta, con
    // pujas o con ventas. Sin esto, la cascada de AuctionCoffeeLot lo sacaba
    // EN SILENCIO de una subasta viva (HTTP 200), y la FK de bids/transactions
    // (Restrict) devolvía un 500 crudo. Para quitarlo de una subasta usar
    // removeFromAuction; las pujas/ventas son históricas y no deben perderse.
    if (coffeeLot.isInAuction || coffeeLot.auctionId || coffeeLot._count.auctionDetails > 0) {
      throw new ConflictException(
        `El lote ${id} está vinculado a una subasta; quítalo de la subasta antes de eliminarlo`,
      );
    }

    if (coffeeLot._count.bids > 0) {
      throw new ConflictException(
        `El lote ${id} tiene pujas registradas y no puede eliminarse`,
      );
    }

    if (coffeeLot._count.transactions > 0) {
      throw new ConflictException(
        `El lote ${id} tiene transacciones/ventas registradas y no puede eliminarse`,
      );
    }

    return this.prisma.coffeeLot.delete({
      where: { id },
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

    // Un lote vendido no se vuelve a subastar. Al cerrar una subasta los lotes
    // adjudicados quedan con `isInAuction: false`, así que la comprobación de
    // arriba no los frenaba: se podía sacar a subasta café que ya tenía dueño.
    if (coffeeLot.status === 'SOLD') {
      throw new ConflictException(
        `El lote "${coffeeLot.name}" ya fue vendido en una subasta anterior`,
      );
    }

    // Crear la relación AuctionCoffeeLot
    const creado = await this.prisma.$transaction(async (tx) => {
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
          coffeeLot: true
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

    // Si la subasta ya está en marcha, avisar para que las pantallas abiertas
    // recojan el lote nuevo (si no, solo lo vería quien recargue).
    if (auction.status === 'ACTIVE') {
      void this.bidsGateway.notifyLotsChanged(auctionId);
    }

    return creado;
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
        coffeeLot:true,
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

    // Un lote con pujas NO se saca de una subasta que ya empezó: las pujas
    // quedarían huérfanas (apuntan al lote, no a la relación), el lote no se
    // adjudicaría al cerrar y quien iba ganando se quedaría sin nada y sin
    // aviso. Para retirarlo hay que cerrar o volver la subasta a borrador.
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: { status: true, title: true },
    });

    if (auction && auction.status !== 'DRAFT') {
      const pujas = await this.prisma.bid.count({
        where: { auctionId, coffeeLotId },
      });
      if (pujas > 0) {
        throw new ConflictException(
          `No se puede quitar este lote: ya tiene ${pujas} puja(s) en una subasta ${auction.status === 'ACTIVE' ? 'en curso' : 'cerrada'}.`,
        );
      }
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