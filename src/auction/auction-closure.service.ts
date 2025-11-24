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
    @Inject(forwardRef(() => BidsGateway)) // Solo BidsGateway con forwardRef
    private bidsGateway: BidsGateway,
  ) {
    this.logger.log('🔄 AuctionClosureService inicializado');
  }

 // @Cron('*/30 * * * * *') // ← CORREGIDO: Cada 30 segundos
   @Cron('0 */30 * * * *') // ← CORREGIDO: Cada 30 minutos
 async handleExpiredAuctions() {
  this.logger.log('🔍 Verificando subastas expiradas (CRON DE RESPALDO cada 5min)...');
  
  try {
    const expiredAuctions = await this.findExpiredAuctions();
    
    for (const auction of expiredAuctions) {
      this.logger.warn(`⚠️ Subasta ${auction.id} expirada detectada por CRON de respaldo - EL TIMER DEBERÍA HABERLA MANEJADO`);
      // Procesar solo si el timer no lo hizo
      await this.processExpiredAuction(auction.id);
    }
    
    if (expiredAuctions.length > 0) {
      this.logger.warn(`⚠️ CRON de respaldo procesó ${expiredAuctions.length} subastas - REVISAR TIMER SERVICE`);
    }
  } catch (error) {
    this.logger.error('❌ Error en CRON de respaldo:', error);
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
      this.logger.log(`⏰ Subasta ${auctionId} extendida por 3 minutos debido a actividad reciente`);
    } else {
      await this.processAuctionCompletion(auctionId);
      this.logger.log(`🎉 Subasta ${auctionId} cerrada definitivamente`);
    }
  }

  async checkForLastMinuteBids(auctionId: string): Promise<boolean> {
    const thresholdTime = new Date(Date.now() - this.LAST_MINUTES_THRESHOLD * 60 * 1000);
    
    const recentBids = await this.prisma.bid.findFirst({
      where: {
        auctionId,
        createdAt: {
          gte: thresholdTime
        }
      }
    });

    return !!recentBids;
  }

  async extendAuction(auctionId: string): Promise<void> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId }
    });

    if (!auction || auction.status !== AuctionStatus.ACTIVE) {
      return;
    }

    const newEndDate = new Date(Date.now() + this.EXTENSION_MINUTES * 60 * 1000);
    
    await this.prisma.auction.update({
      where: { id: auctionId },
      data: { endDate: newEndDate }
    });

    this.logger.log(`⏰ Subasta ${auctionId} extendida hasta ${newEndDate}`);
    this.bidsGateway.notifyAuctionExtension(auctionId, newEndDate);
  }

  async processAuctionCompletion(auctionId: string) {
    return this.prisma.$transaction(async (tx) => {
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

      for (const detail of auction.auctionDetails) {
        await this.processCoffeeLot(tx, auctionId, detail);
      }

      await tx.auction.update({
        where: { id: auctionId },
        data: {
          status: 'CLOSED',
          isActive: false,
        },
      });

      this.logger.log(`🎉 Subasta "${auction.title}" cerrada exitosamente`);
      this.bidsGateway.notifyAuctionClosed(auctionId);
    });
  }

  private async processCoffeeLot(tx: any, auctionId: string, detail: any) {
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
      await this.createTransaction(tx, auctionId, detail, winningBid);
      
      await tx.coffeeLot.update({
        where: { id: detail.coffeeLotId },
        data: {
          status: 'SOLD',
          isInAuction: false,
        },
      });

      await this.sendNotifications(detail, winningBid);
    } else {
      await tx.coffeeLot.update({
        where: { id: detail.coffeeLotId },
        data: {
          status: 'AVAILABLE',
          isInAuction: false,
          auctionId: null,
        },
      });
    }
  }

  private isReservePriceMet(detail: any, winningBidAmount: number): boolean {
    return !detail.reservePrice || winningBidAmount >= detail.reservePrice;
  }

  private async createTransaction(tx: any, auctionId: string, detail: any, winningBid: any) {
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

  async forceAuctionClosure(auctionId: string) {
    this.logger.warn(`⚠️ Cierre forzado de subasta: ${auctionId}`);
    return this.processAuctionCompletion(auctionId);
  }
}