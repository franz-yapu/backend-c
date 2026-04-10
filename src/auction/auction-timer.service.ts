import { Injectable, Logger, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuctionStatus } from '@prisma/client';
import { BidsGateway } from 'src/bid/bids.gateway';
import { AuctionClosureService } from './auction-closure.service';

@Injectable()
export class AuctionTimerService implements OnModuleDestroy {
  private readonly logger = new Logger(AuctionTimerService.name);
  private mainTimer: NodeJS.Timeout;
  private activeAuctions: Set<string> = new Set();
  private readonly CHECK_INTERVAL = 1000; // 1 segundo

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => BidsGateway))
    private bidsGateway: BidsGateway,
    private auctionClosureService: AuctionClosureService,
  ) {
    this.logger.log('⏰ AuctionTimerService inicializado');
    this.startMainTimer();
    setTimeout(() => this.initializeActiveAuctions(), 2000);
  }

  private async initializeActiveAuctions() {
    try {
      const activeAuctions = await this.prisma.auction.findMany({
        where: {
          status: AuctionStatus.ACTIVE,
          isActive: true
        }
      });

      for (const auction of activeAuctions) {
        this.activeAuctions.add(auction.id);
      }
      this.logger.log(`⏰ ${activeAuctions.length} subastas activas registradas`);
    } catch (error) {
      this.logger.error('Error inicializando timers:', error);
    }
  }

  private startMainTimer() {
    this.mainTimer = setInterval(async () => {
      await this.checkActiveAuctions();
    }, this.CHECK_INTERVAL);
  }

  private getPreciseTime(): Date {
    // Podrías usar NTP o servicio de tiempo si es crítico
    return new Date();
  }

  private async checkActiveAuctions() {
    const now = this.getPreciseTime();


    for (const auctionId of this.activeAuctions) {
      try {
        const auction = await this.prisma.auction.findUnique({
          where: { id: auctionId },
          select: { id: true, status: true, endDate: true }
        });

        if (!auction || auction.status !== AuctionStatus.ACTIVE) {
          this.activeAuctions.delete(auctionId);
          continue;
        }
        const endDate = new Date(auction.endDate);
        const timeRemaining = endDate.getTime() - now.getTime();
        // Emitir actualización de tiempo periódicamente
        if (timeRemaining > 0 && timeRemaining % 30000 < 1000) {
          // Esto emite aproximadamente cada 30 segundos, está bien
          this.bidsGateway.server.to(`auction-${auctionId}`).emit('timeSync', {
            auctionId,
            serverTime: now.toISOString(),
            endDate: auction.endDate,
            timeRemaining,
            timestamp: Date.now()
          });
        }



        // Solo procesar cuando el tiempo se acaba o ya expiró
        if (timeRemaining <= 0) {
          this.logger.log(`⏰ Subasta ${auctionId} terminando - procesando...`);
          await this.processAuctionCompletion(auctionId);
          this.activeAuctions.delete(auctionId);
        }

      } catch (error) {
        this.logger.error(`Error verificando subasta ${auctionId}:`, error);
      }
    }
  }

  private async processAuctionCompletion(auctionId: string) {
    try {
      // Delegar el procesamiento al AuctionClosureService
      await this.auctionClosureService.processExpiredAuction(auctionId);
    } catch (error) {
      this.logger.error(`Error procesando subasta ${auctionId}:`, error);
    }
  }

  async startTimerForAuction(auctionId: string) {
    this.activeAuctions.add(auctionId);
    this.logger.log(`⏰ Timer iniciado para subasta ${auctionId}`);
  }

  stopTimerForAuction(auctionId: string) {
    this.activeAuctions.delete(auctionId);
    this.logger.log(`⏰ Timer detenido para subasta ${auctionId}`);
  }

  async onAuctionActivated(auctionId: string) {
    this.startTimerForAuction(auctionId);
  }

  async onAuctionDeactivated(auctionId: string) {
    this.stopTimerForAuction(auctionId);
  }

  getActiveAuctionsCount(): number {
    return this.activeAuctions.size;
  }

  onModuleDestroy() {
    if (this.mainTimer) {
      clearInterval(this.mainTimer);
      this.logger.log('⏰ Timer principal detenido');
    }
    this.activeAuctions.clear();
  }
}