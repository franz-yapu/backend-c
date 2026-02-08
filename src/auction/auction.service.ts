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
  constructor(private prisma: PrismaService,private auctionTimerService: AuctionTimerService ) {}

  async create(createAuctionDto: CreateAuctionDto) {
    // Validar que el admin existe
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

    // Validar fechas
    if (new Date(createAuctionDto.startDate) >= new Date(createAuctionDto.endDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    // Crear la subasta
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
    // Verificar que la subasta existe y está en borrador
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId }
    });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${auctionId} not found`);
    }

    if (auction.status !== AuctionStatus.DRAFT) {
      throw new BadRequestException('Can only add lots to DRAFT auctions');
    }

    // Verificar que el lote existe y no está en otra subasta activa
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

    // Agregar el lote a la subasta
    return this.prisma.$transaction([
      this.prisma.auctionCoffeeLot.create({
        data: {
          startingPrice,
          auctionId,
          coffeeLotId
        },
        include: {
          auction: true,
          coffeeLot: true
        }
      }),
      this.prisma.coffeeLot.update({
        where: { id: coffeeLotId },
        data: {
          isInAuction: true,
          auctionId
        }
      })
    ]);
  }

  async findAll() {
    return this.prisma.auction.findMany({
      include: {
        admin: true,
        seller: true,
        auctionDetails: {
          include: {
            coffeeLot: true
          }
        },
        bids: {
          orderBy: {
            amount: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async findActiveAuctions() {
    return this.prisma.auction.findMany({
      where: { status: 'ACTIVE' },
      include: {
        admin: true,
        seller: true,
        auctionDetails: {
          include: {
            coffeeLot: true
          }
        },
        bids: {
          orderBy: {
            amount: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        endDate: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id },
      include: {
        admin: true,
        seller: true,
        auctionDetails: {
          include: {
            coffeeLot: true,
           
          }
        },
         bids: {
              orderBy: {
                amount: 'desc'
              },
              include: {
                user: true
              }
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
    const auction = await this.findOne(id);

    // Validar que no se modifique una subasta activa o cerrada
   /*  if (auction.status !== AuctionStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT auctions can be modified');
    } */

    // Si se está intentando activar la subasta, verificar que no haya otra activa
    if (updateAuctionDto.status === AuctionStatus.ACTIVE ) {
      const activeAuction = await this.prisma.auction.findFirst({
        where: {
          status: AuctionStatus.ACTIVE,
          isActive: true,
          NOT: { id: id } // Excluir la subasta actual
        }
      });

      if (activeAuction) {
        throw new ConflictException('There is already an active auction. Only one active auction is allowed at a time.');
      }
    }

    const updatedAuction = await this.prisma.auction.update({
      where: { id },
      data: updateAuctionDto,
      include: {
        admin: true,
        seller: true,
        auctionDetails: {
          include: {
            coffeeLot: true
          }
        }
      },
    });


  
  if (updateAuctionDto.status === AuctionStatus.ACTIVE) {
    console.log(`⏰ Subasta ${id} activada - Iniciando timer`);
    
    // Inyectar AuctionTimerService y llamar onAuctionActivated
     this.auctionTimerService.onAuctionActivated(id);
   /*  this.logger.log(`⏰ Subasta ${id} activada - Timer debería iniciarse`); */
  } else if (updateAuctionDto.status === AuctionStatus.CLOSED) {
     this.auctionTimerService.onAuctionDeactivated(id);
    /* this.logger.log(`⏰ Subasta ${id} cerrada - Timer debería detenerse`); */
  }
  return updatedAuction;
  }

  async remove(id: string) {
    const auction = await this.findOne(id);

    // Solo se pueden eliminar subastas en borrador
    if (auction.status !== AuctionStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT auctions can be deleted');
    }

    return this.prisma.$transaction([
      // Eliminar relaciones auctionCoffeeLot primero
      this.prisma.auctionCoffeeLot.deleteMany({
        where: { auctionId: id }
      }),
      // Actualizar los lotes que estaban en esta subasta
      this.prisma.coffeeLot.updateMany({
        where: { auctionId: id },
        data: {
          isInAuction: false,
          auctionId: null
        }
      }),
      // Finalmente eliminar la subasta
      this.prisma.auction.delete({
        where: { id },
      })
    ]);
  }

  async updateStatus(id: string, status: AuctionStatus) {
  const auction = await this.findOne(id);

  // Validar transiciones de estado
  if (status === AuctionStatus.ACTIVE) {
    if (auction.status !== AuctionStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT auctions can be activated');
    }

    // Asegurarse que hay al menos un lote en la subasta
    const lotsCount = await this.prisma.auctionCoffeeLot.count({
      where: { auctionId: id }
    });

    if (lotsCount === 0) {
      throw new BadRequestException('Cannot activate auction without coffee lots');
    }

    // Desactivar cualquier otra subasta activa
    await this.prisma.auction.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });
  }

  const updatedAuction = await this.prisma.auction.update({
    where: { id },
    data: { 
      status,
      isActive: status === AuctionStatus.ACTIVE
    },
    include: {
      auctionDetails: {
        include: {
          coffeeLot: true
        }
      }
    }
  });

  // INICIAR O DETENER TIMER SEGÚN EL ESTADO
  console.log(status === AuctionStatus.ACTIVE);
  console.log(status);
  
  if (status === AuctionStatus.ACTIVE) {
    console.log(`⏰ Subasta ${id} activada - Iniciando timer`);
    
    // Inyectar AuctionTimerService y llamar onAuctionActivated
     this.auctionTimerService.onAuctionActivated(id);
   /*  this.logger.log(`⏰ Subasta ${id} activada - Timer debería iniciarse`); */
  } else if (status === AuctionStatus.CLOSED) {
     this.auctionTimerService.onAuctionDeactivated(id);
    /* this.logger.log(`⏰ Subasta ${id} cerrada - Timer debería detenerse`); */
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
      include: {
        user: true,
        coffeeLot: true
      }
    });

    return bids[0] || null;
  }



async getActiveAuction() {
    return this.prisma.auction.findFirst({
      where: { isActive: true },

  })
}


async findLastClosedAuction() {
  const auction = await this.prisma.auction.findFirst({
    where: { status: "CLOSED" },
    orderBy: { endDate: "desc" }, // también puede ser createdAt
  });

  if (!auction) {
    throw new NotFoundException("No se encontró ninguna subasta cerrada");
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

// Agregar al final de la clase AuctionsService
async getServerTime() {
  return {
    serverTime: new Date().toISOString(),
    timestamp: Date.now(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}
}