// auction-timer.service.ts - VERSIÓN COMPLETA CON INTERVALOS VARIABLES
import { Injectable, Logger, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuctionStatus } from '@prisma/client';
import { BidsGateway } from 'src/bid/bids.gateway';

@Injectable()
export class AuctionTimerService implements OnModuleDestroy {
  private readonly logger = new Logger(AuctionTimerService.name);
  private mainTimer: NodeJS.Timeout;
  private activeAuctions: Set<string> = new Set();
  private lastChecks: Map<string, number> = new Map();
  private processedAuctions: Set<string> = new Set();
  private auctionCache: Map<string, { data: any; timestamp: number }> = new Map();
  
  private readonly CACHE_TTL = 30000; // 30 segundos
  private readonly CHECK_INTERVAL = 1000; // 1 segundo base
  private readonly EXTENSION_MINUTES = 3;
  private readonly LAST_MINUTES_THRESHOLD = 3;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => BidsGateway))
    private bidsGateway: BidsGateway,
  ) {
    this.logger.log('⏰ AuctionTimerService inicializado - INTERVALOS VARIABLES');
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
        this.startTimerForAuction(auction.id);
      }
      this.logger.log(`⏰ Timers iniciados para ${activeAuctions.length} subastas activas`);
    } catch (error) {
      this.logger.error('Error inicializando timers:', error);
    }
  }

  private startMainTimer() {
    this.mainTimer = setInterval(async () => {
      await this.checkAllActiveAuctions();
    }, this.CHECK_INTERVAL);
  }

  private async checkAllActiveAuctions() {
    const now = Date.now();
    
    for (const auctionId of this.activeAuctions) {
      try {
        if (this.processedAuctions.has(auctionId)) {
          continue;
        }

        const lastCheck = this.lastChecks.get(auctionId) || 0;
        const interval = this.getOptimalCheckInterval(auctionId);
        
        if (now - lastCheck >= interval) {
          await this.checkSingleAuction(auctionId);
          this.lastChecks.set(auctionId, now);
        }
      } catch (error) {
        this.logger.error(`Error verificando subasta ${auctionId}:`, error);
      }
    }
  }

  private getOptimalCheckInterval(auctionId: string): number {
    const auction = this.auctionCache.get(auctionId)?.data;
    if (!auction) return 1000; // Default 1s si no hay cache
    
    const now = new Date();
    const endDate = new Date(auction.endDate);
    const timeRemaining = endDate.getTime() - now.getTime();
    
    // ESTRATEGIA DE INTERVALOS VARIABLES
    if (timeRemaining <= 10 * 60 * 1000) {        // Últimos 10 minutos o menos
      return 1000;                                // Cada 1 SEGUNDO
    } else if (timeRemaining <= 30 * 60 * 1000) { // Últimos 30 minutos
      return 60 * 1000;                           // Cada 1 MINUTO
    } else if (timeRemaining <= 60 * 60 * 1000) { // Última hora
      return 10 * 60 * 1000;                      // Cada 10 MINUTOS
    } else {                                      // Más de 1 hora
      return 60 * 60 * 1000;                      // Cada 1 HORA
    }
  }

  private async checkSingleAuction(auctionId: string) {
    const auction = await this.getAuctionWithCache(auctionId);
    
    if (!auction || auction.status !== AuctionStatus.ACTIVE) {
      this.stopTimerForAuction(auctionId);
      return;
    }

    const now = new Date();
    const endDate = new Date(auction.endDate);
    const timeRemaining = endDate.getTime() - now.getTime();

    // Log informativo cada cierto tiempo
    this.logCheckInterval(auctionId, timeRemaining);

    if (timeRemaining <= 1000) { // 1 segundo de margen
      this.logger.log(`⏰ Subasta ${auctionId} en tiempo 0 - PROCESANDO INMEDIATAMENTE`);
      this.processedAuctions.add(auctionId);
      await this.processAuctionAtZero(auctionId);
    }
  }

  private logCheckInterval(auctionId: string, timeRemaining: number) {
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    
    // Log solo en momentos clave para no saturar
    if (timeRemaining <= 10 * 60 * 1000 && seconds === 0) {
      this.logger.debug(`⏰ Subasta ${auctionId}: ${minutes}m ${seconds}s - VERIFICACIÓN CADA 1s`);
    } else if (timeRemaining <= 30 * 60 * 1000 && minutes % 5 === 0 && seconds === 0) {
      this.logger.debug(`⏰ Subasta ${auctionId}: ${minutes}m - VERIFICACIÓN CADA 1min`);
    } else if (timeRemaining <= 60 * 60 * 1000 && minutes % 10 === 0 && seconds === 0) {
      this.logger.debug(`⏰ Subasta ${auctionId}: ${minutes}m - VERIFICACIÓN CADA 10min`);
    } else if (timeRemaining > 60 * 60 * 1000 && minutes % 60 === 0 && seconds === 0) {
      this.logger.debug(`⏰ Subasta ${auctionId}: ${Math.floor(minutes/60)}h - VERIFICACIÓN CADA 1h`);
    }
  }

  private async getAuctionWithCache(auctionId: string) {
    const cached = this.auctionCache.get(auctionId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      return cached.data;
    }
    
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: { id: true, status: true, endDate: true, isActive: true, title: true }
    });
    
    if (auction) {
      this.auctionCache.set(auctionId, { data: auction, timestamp: now });
    }
    
    return auction;
  }

  private async processAuctionAtZero(auctionId: string) {
    try {
      const hasRecentBids = await this.checkForLastMinuteBids(auctionId);
      
      if (hasRecentBids) {
        this.logger.log(`⏰ Subasta ${auctionId} tiene actividad reciente, EXTENDIENDO...`);
        await this.extendAuctionImmediately(auctionId);
      } else {
        this.logger.log(`⏰ Subasta ${auctionId} sin actividad reciente, CERRANDO...`);
        await this.closeAuctionImmediately(auctionId);
      }
    } catch (error) {
      this.logger.error(`Error procesando subasta ${auctionId}:`, error);
      this.processedAuctions.delete(auctionId);
    }
  }

  private async checkForLastMinuteBids(auctionId: string): Promise<boolean> {
    const thresholdTime = new Date(Date.now() - this.LAST_MINUTES_THRESHOLD * 60 * 1000);
    
    const recentBids = await this.prisma.bid.findFirst({
      where: {
        auctionId,
        createdAt: { gte: thresholdTime }
      }
    });

    const hasBids = !!recentBids;
    this.logger.log(`⏰ Subasta ${auctionId} - Pujas en últimos ${this.LAST_MINUTES_THRESHOLD}min: ${hasBids}`);
    return hasBids;
  }

  private async extendAuctionImmediately(auctionId: string) {
    try {
      const newEndDate = new Date(Date.now() + this.EXTENSION_MINUTES * 60 * 1000);
      
      await this.prisma.auction.update({
        where: { id: auctionId },
        data: { endDate: newEndDate }
      });

      // Limpiar cache para forzar nueva consulta con fecha actualizada
      this.auctionCache.delete(auctionId);
      
      this.logger.log(`⏰✅ Subasta ${auctionId} EXTENDIDA 3 minutos hasta ${newEndDate.toLocaleTimeString()}`);
      this.bidsGateway.notifyAuctionExtension(auctionId, newEndDate);

      // Reactivar para la nueva fecha
      this.processedAuctions.delete(auctionId);
      
    } catch (error) {
      this.logger.error(`Error extendiendo subasta ${auctionId}:`, error);
      this.processedAuctions.delete(auctionId);
    }
  }

  private async closeAuctionImmediately(auctionId: string) {
    try {
      this.bidsGateway.notifyAuctionClosed(auctionId);
      this.logger.log(`⏰✅ Subasta ${auctionId} CERRADA DEFINITIVAMENTE`);
      this.stopTimerForAuction(auctionId);
    } catch (error) {
      this.logger.error(`Error cerrando subasta ${auctionId}:`, error);
      this.processedAuctions.delete(auctionId);
    }
  }

  async startTimerForAuction(auctionId: string) {
    this.activeAuctions.add(auctionId);
    this.lastChecks.set(auctionId, Date.now());
    this.processedAuctions.delete(auctionId);
    this.auctionCache.delete(auctionId);
    this.logger.log(`⏰ Timer iniciado para subasta ${auctionId} con intervalos variables`);
  }

  stopTimerForAuction(auctionId: string) {
    this.activeAuctions.delete(auctionId);
    this.lastChecks.delete(auctionId);
    this.processedAuctions.delete(auctionId);
    this.auctionCache.delete(auctionId);
    this.logger.log(`⏰ Timer detenido para subasta ${auctionId}`);
  }

  async onAuctionActivated(auctionId: string) {
    this.startTimerForAuction(auctionId);
  }

  async onAuctionDeactivated(auctionId: string) {
    this.stopTimerForAuction(auctionId);
  }

  // Método para debugging - ver intervalos actuales
  getAuctionIntervals(): { [auctionId: string]: string } {
    const intervals: { [auctionId: string]: string } = {};
    
    for (const auctionId of this.activeAuctions) {
      const auction = this.auctionCache.get(auctionId)?.data;
      if (auction) {
        const now = new Date();
        const endDate = new Date(auction.endDate);
        const timeRemaining = endDate.getTime() - now.getTime();
        const interval = this.getOptimalCheckInterval(auctionId);
        
        const minutes = Math.floor(timeRemaining / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        let timeText = '';
        if (days > 0) timeText = `${days}d ${hours % 24}h ${minutes % 60}m`;
        else if (hours > 0) timeText = `${hours}h ${minutes % 60}m`;
        else timeText = `${minutes}m`;
        
        let intervalText = '';
        if (interval === 1000) intervalText = '1 segundo';
        else if (interval === 60000) intervalText = '1 minuto';
        else if (interval === 600000) intervalText = '10 minutos';
        else intervalText = '1 hora';
        
        intervals[auctionId] = `${timeText} - Verifica cada ${intervalText}`;
      }
    }
    
    return intervals;
  }

  // Método para obtener estadísticas
  getTimerStats() {
    return {
      activeAuctions: this.activeAuctions.size,
      processedAuctions: this.processedAuctions.size,
      cachedAuctions: this.auctionCache.size,
      intervals: this.getAuctionIntervals()
    };
  }

  onModuleDestroy() {
    if (this.mainTimer) {
      clearInterval(this.mainTimer);
      this.logger.log('⏰ Timer principal detenido');
    }
    this.activeAuctions.clear();
    this.lastChecks.clear();
    this.processedAuctions.clear();
    this.auctionCache.clear();
  }
}