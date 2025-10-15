// auction-closure.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class AuctionClosureService {
  private readonly logger = new Logger(AuctionClosureService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
   /*  private mailService: MailService, */
  ) {
    this.logger.log('🔄 AuctionClosureService inicializado');
  }

  // Verificación cada 5 minutos (equilibrio entre eficiencia y confiabilidad)
  @Cron('*/30 * * * * *')
  async handleExpiredAuctions() {
    this.logger.log('🔍 Verificando subastas expiradas...');
    
    try {
      const expiredAuctions = await this.findExpiredAuctions();
      
      for (const auction of expiredAuctions) {
        await this.processAuctionCompletion(auction.id);
      }
      
      this.logger.log(`✅ Procesadas ${expiredAuctions.length} subastas expiradas`);
    } catch (error) {
      this.logger.error('❌ Error procesando subastas expiradas:', error);
    }
  }

  private async findExpiredAuctions() {
    return this.prisma.auction.findMany({
      where: {
        endDate: { lte: new Date() },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        title: true,
        endDate: true,
      },
    });
  }

  async processAuctionCompletion(auctionId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener información completa de la subasta
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
        include: {
          auctionDetails: {
            include: {
              coffeeLot: {
                include: {
                  seller: true,
                },
              },
            },
          },
        },
      });

      if (!auction || auction.status !== 'ACTIVE') {
        return;
      }

      // 2. Procesar cada lote de la subasta
      for (const detail of auction.auctionDetails) {
        await this.processCoffeeLot(tx, auctionId, detail);
      }

      // 3. Cerrar la subasta
      await tx.auction.update({
        where: { id: auctionId },
        data: {
          status: 'CLOSED',
          isActive: false,
        },
      });

      this.logger.log(`🎉 Subasta "${auction.title}" cerrada exitosamente`);
    });
  }

  private async processCoffeeLot(
    tx: any, 
    auctionId: string, 
    detail: any
  ) {
    // 1. Obtener la puja ganadora para este lote
    const winningBid = await tx.bid.findFirst({
      where: {
        auctionId,
        coffeeLotId: detail.coffeeLotId,
      },
      orderBy: {
        amount: 'desc',
      },
      include: {
        user: true,
      },
    });

    if (winningBid && this.isReservePriceMet(detail, winningBid.amount)) {
      // 2. Crear transacción para puja ganadora
      await this.createTransaction(tx, auctionId, detail, winningBid);
      
      // 3. Marcar lote como vendido
      await tx.coffeeLot.update({
        where: { id: detail.coffeeLotId },
        data: {
          status: 'SOLD',
          isInAuction: false,
        },
      });

      // 4. Enviar notificaciones
      await this.sendNotifications(detail, winningBid);
    } else {
      // 5. Si no hay puja ganadora o no alcanzó reserva
      await tx.coffeeLot.update({
        where: { id: detail.coffeeLotId },
        data: {
          status: 'AVAILABLE',
          isInAuction: false,
          auctionId: null,
        },
      });
    }

    // 6. Eliminar relación de subasta
    /* await tx.auctionCoffeeLot.delete({
      where: {
        auctionId_coffeeLotId: {
          auctionId,
          coffeeLotId: detail.coffeeLotId,
        },
      },
    }); */
  }

  private isReservePriceMet(detail: any, winningBidAmount: number): boolean {
    return !detail.reservePrice || winningBidAmount >= detail.reservePrice;
  }

  private async createTransaction(
    tx: any,
    auctionId: string,
    detail: any,
    winningBid: any
  ) {
    return tx.transaction.create({
      data: {
        amount: winningBid.amount,
        status: 'COMPLETED',
        auction: { connect: { id: auctionId } },
        buyer: { connect: { id: winningBid.userId } },
        seller: { connect: { id: detail.coffeeLot.sellerId } },
        coffeeLot: { connect: { id: detail.coffeeLotId } },
        paymentDate: new Date(),
      },
    });
  }

  private async sendNotifications(detail: any, winningBid: any) {
    try {

        console.log('Enviando notificaciones para lote:', detail.coffeeLot.name);
        
     /*  // Notificar al comprador
      await this.mailService.sendAuctionWinNotification(
        winningBid.user.email,
        detail.coffeeLot.name,
        winningBid.amount
      );*/

        await this.emailService.sendAuctionWinNotification(
      winningBid.user.email,
      winningBid.user.firstName || 'Estimado/a Cliente',
      detail.coffeeLot,
      winningBid,
      detail.auction

    );
    } catch (error) {
      this.logger.warn('No se pudieron enviar notificaciones:', error);
    }
  }

  // Método para forzar cierre manual si es necesario
  async forceAuctionClosure(auctionId: string) {
    this.logger.warn(`⚠️ Cierre forzado de subasta: ${auctionId}`);
    return this.processAuctionCompletion(auctionId);
  }

/*   private async sendSellerNotification(detail: any, winningBid: any, auction: any) {
  try {
    await this.emailService.sendAuctionSaleNotification(
      detail.coffeeLot.seller.email,
      detail.coffeeLot.seller.firstName || 'Estimado/a Productor',
      detail.coffeeLot,
      winningBid,
      auction
    );
  } catch (error) {
    this.logger.warn('No se pudo enviar notificación al vendedor:', error);
  }
} */
}