import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { AuctionStatus } from '@prisma/client';
import { BidsGateway } from 'src/bid/bids.gateway';

@Injectable()
export class AuctionClosureService {
  private readonly logger = new Logger(AuctionClosureService.name);
  private readonly EXTENSION_MINUTES = 3;
  private readonly LAST_MINUTES_THRESHOLD = 5;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    @Inject(forwardRef(() => BidsGateway))
    private bidsGateway: BidsGateway,
  ) {
    this.logger.log('🔄 AuctionClosureService inicializado');
  }

  // CRON de respaldo cada 5 minutos
  @Cron('0 */5 * * * *')
  async handleExpiredAuctions() {
    this.logger.log('🔍 Verificando subastas expiradas (CRON de respaldo)...');
    
    try {
      const expiredAuctions = await this.findExpiredAuctions();
      
      for (const auction of expiredAuctions) {
        this.logger.warn(`⚠️ Subasta ${auction.id} expirada - procesando...`);
        await this.processExpiredAuction(auction.id);
      }
      
      if (expiredAuctions.length > 0) {
        this.logger.warn(`⚠️ CRON procesó ${expiredAuctions.length} subastas expiradas`);
      }
    } catch (error) {
      this.logger.error('❌ Error en CRON:', error);
    }
  }

  private async findExpiredAuctions() {
    return this.prisma.auction.findMany({
      where: {
        endDate: { lte: new Date() },
        status: AuctionStatus.ACTIVE,
      },
      select: {
        id: true,
        title: true,
        endDate: true,
      },
    });
  }

  async processExpiredAuction(auctionId: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId }
    });

    if (!auction || auction.status !== AuctionStatus.ACTIVE) {
      return;
    }

    const hasRecentBids = await this.checkForLastMinuteBids(auctionId);
    
    if (hasRecentBids) {
      await this.extendAuction(auctionId);
      this.logger.log(`⏰ Subasta ${auctionId} extendida por 3 minutos`);
    } else {
      await this.closeAuction(auctionId);
    }
  }

  async checkForLastMinuteBids(auctionId: string): Promise<boolean> {
    const thresholdTime = new Date(Date.now() - this.LAST_MINUTES_THRESHOLD * 60 * 1000);
    
    const recentBids = await this.prisma.bid.findFirst({
      where: {
        auctionId,
        createdAt: { gte: thresholdTime }
      }
    });

    return !!recentBids;
  }

  async extendAuction(auctionId: string): Promise<void> {
    const newEndDate = new Date(Date.now() + this.EXTENSION_MINUTES * 60 * 1000);
    
    await this.prisma.auction.update({
      where: { id: auctionId },
      data: { endDate: newEndDate }
    });

    this.logger.log(`⏰ Subasta ${auctionId} extendida hasta ${newEndDate}`);
    this.bidsGateway.notifyAuctionExtension(auctionId, newEndDate);
  }

  async closeAuction(auctionId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener subasta con detalles
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
        include: {
          auctionDetails: {
            include: {
              coffeeLot: true
            },
          },
        },
      });

      if (!auction || auction.status !== 'ACTIVE') {
        return;
      }

      const winningTransactions: any[] = [];

      // 2. Procesar cada lote de café
      for (const detail of auction.auctionDetails) {
        const transaction= await this.processCoffeeLot(tx, auctionId, detail);
        if (transaction) {
          winningTransactions.push(transaction);
        }
      }

      // 3. Actualizar estado de la subasta
      await tx.auction.update({
        where: { id: auctionId },
        data: {
          status: 'CLOSED',
          isActive: false,
        },
      });

      this.logger.log(`🎉 Subasta "${auction.title}" cerrada exitosamente`);
      this.bidsGateway.notifyAuctionClosed(auctionId);

      // 4. Enviar correos SOLO después de crear transacciones
      await this.sendWinningEmails(winningTransactions, auction);

      return winningTransactions;
    });
  }

  private async processCoffeeLot(tx: any, auctionId: string, detail: any) {
    // 1. Obtener puja ganadora
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

    if (!winningBid) {
      // No hay pujas para este lote
      await tx.coffeeLot.update({
        where: { id: detail.coffeeLotId },
        data: {
          status: 'AVAILABLE',
          isInAuction: false,
          auctionId: null,
        },
      });
      return null;
    }

    // 2. Verificar precio de reserva
    if (!this.isReservePriceMet(detail, winningBid.amount)) {
      // No se alcanzó el precio de reserva
      await tx.coffeeLot.update({
        where: { id: detail.coffeeLotId },
        data: {
          status: 'AVAILABLE',
          isInAuction: false,
          auctionId: null,
        },
      });
      return null;
    }

    // 3. Crear transacción
    const transaction = await tx.transaction.create({
      data: {
        amount: winningBid.amount,
        status: 'COMPLETED',
        auction: { connect: { id: auctionId } },
        buyer: { connect: { id: winningBid.userId } },
        seller: { connect: { id: detail.coffeeLot.farmerId } }, // Asumiendo que farmerId existe
        coffeeLot: { connect: { id: detail.coffeeLotId } },
        paymentDate: new Date(),
      },
    });

    // 4. Actualizar estado del lote
    await tx.coffeeLot.update({
      where: { id: detail.coffeeLotId },
      data: {
        status: 'SOLD',
        isInAuction: false,
      },
    });

    return {
      transaction,
      winningBid,
      coffeeLot: detail.coffeeLot,
      auctionDetail: detail
    };
  }

  private isReservePriceMet(detail: any, winningBidAmount: number): boolean {
    return !detail.reservePrice || winningBidAmount >= detail.reservePrice;
  }

  private async sendWinningEmails(winningTransactions: any[], auction: any) {
    for (const winData of winningTransactions) {
      try {
        await this.emailService.sendAuctionWinNotification(
          winData.winningBid.user.email,
          winData.winningBid.user.firstName || 'Estimado/a Cliente',
          winData.coffeeLot,
          winData.winningBid,
          auction
        );
        this.logger.log(`📧 Correo enviado a ${winData.winningBid.user.email}`);
      } catch (error) {
        this.logger.error(`❌ Error enviando correo a ${winData.winningBid.user.email}:`, error);
      }
    }
  }

  async forceAuctionClosure(auctionId: string) {
    this.logger.warn(`⚠️ Cierre forzado de subasta: ${auctionId}`);
    return this.closeAuction(auctionId);
  }
}