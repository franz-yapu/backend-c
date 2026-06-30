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
  private readonly LAST_MINUTES_THRESHOLD = 3;

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
  this.logger.log(`🔍 Procesando subasta expirada: ${auctionId}`);
  
  try {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId }
    });

    if (!auction || auction.status !== AuctionStatus.ACTIVE) {
      this.logger.log(`ℹ️ Subasta ${auctionId} no está activa o no existe`);
      return;
    }

    const hasRecentBids = await this.checkForLastMinuteBids(auctionId);
    
    if (hasRecentBids) {
      this.logger.log(`⏰ Subasta ${auctionId} tiene pujas recientes, extendiendo...`);
      await this.extendAuction(auctionId);
    } else {
      this.logger.log(`🔚 Subasta ${auctionId} no tiene pujas recientes, cerrando...`);
      await this.closeAuction(auctionId);
    }
    
  } catch (error) {
    this.logger.error(`❌ Error procesando subasta ${auctionId}:`, error);
    // No re-lanzar el error para que el CRON continúe con otras subastas
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
  let winningTransactions: any[] = [];
  let auction: any = null;

  // 1. Ejecutar la transacción de base de datos SIN enviar correos
  try {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Candado Optimista: Intentamos cambiar el estado de ACTIVE a CLOSED
      // Si otra instancia o proceso ya lo hizo en este milisegundo, count será 0.
      const lockResult = await tx.auction.updateMany({
        where: { id: auctionId, status: 'ACTIVE' },
        data: {
          status: 'CLOSED',
          isActive: false,
        },
      });

      if (lockResult.count === 0) {
        this.logger.warn(`⚠️ Subasta ${auctionId} ya está en procesamiento o cerrada por otra instancia.`);
        return { auction: null, transactions: [] };
      }

      // 2. Ahora que somos dueños exclusivos de esta subasta, obtenemos los detalles
      auction = await tx.auction.findUnique({
        where: { id: auctionId },
        include: {
          auctionDetails: {
            include: {
              coffeeLot: true
            },
          },
        },
      });

      if (!auction) {
        return { auction: null, transactions: [] };
      }

      const transactions: any[] = [];

      // Procesar cada lote de café
      for (const detail of auction.auctionDetails) {
        const transaction = await this.processCoffeeLot(tx, auctionId, detail);
        if (transaction) {
          transactions.push(transaction);
        }
      }

      this.logger.log(`🎉 Subasta "${auction.title}" adjudicada y cerrada exitosamente en base de datos`);

      return { auction, transactions };
    }, {
      timeout: 30000, // ✅ Aumentar timeout a 30 segundos
      maxWait: 20000, // ✅ Aumentar tiempo máximo de espera
    });

    winningTransactions = result.transactions;
    auction = result.auction;

  } catch (error) {
    this.logger.error(`❌ Error en transacción de cierre de subasta ${auctionId}:`, error);
    throw error;
  }

  // 2. Notificar cierre de subasta via WebSocket (fuera de transacción)
  if (auction) {
    this.bidsGateway.notifyAuctionClosed(auctionId);
  }

  // 2.b Push "ganaste" al adjudicatario de cada lote (fire-and-forget: no debe
  // bloquear el cierre ni el envío de correos).
  for (const win of winningTransactions) {
    void this.bidsGateway.notifyAuctionWin(
      win.winningBid.userId,
      auctionId,
      win.coffeeLot.id,
      win.coffeeLot.name ?? null,
      Number(win.winningBid.amount),
    );
  }

  // 3. Enviar correos FUERA de la transacción (puede tomar tiempo)
  if (winningTransactions.length > 0 && auction) {
    // Usar Promise.all para enviar correos en paralelo
    await this.sendWinningEmails(winningTransactions, auction);
  }

  return winningTransactions;
}

  private async processCoffeeLot(tx: any, auctionId: string, detail: any) {
  this.logger.log(`🔍 Procesando lote ${detail.coffeeLotId} para subasta ${auctionId}`);

  // 🔒 MISMO candado por lote que usa BidsService.createWithOptimisticLock
  // (`hashtext(coffeeLotId)::int8`). Serializa el cierre frente a las pujas en
  // vuelo del MISMO lote y elimina la carrera cierre-vs-puja:
  //  - Si una puja tiene el candado primero: el cierre espera a su commit y la
  //    cuenta (la puja entró antes de que el cierre se confirmara → es válida).
  //  - Si el cierre lo tiene primero: la puja espera y, al re-leer el estado,
  //    ve la subasta CLOSED y se rechaza.
  // $executeRaw (no $queryRaw): pg_advisory_xact_lock devuelve `void`.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${detail.coffeeLotId})::int8)`;

  // 1. Obtener puja ganadora.
  // Desempate determinista: a igual monto gana el primero en el tiempo
  // (createdAt asc) y, como último criterio estable, el menor id.
  // DEBE coincidir con BidsService.isWinningBid.
  const winningBid = await tx.bid.findFirst({
    where: {
      auctionId,
      coffeeLotId: detail.coffeeLotId,
    },
    orderBy: [
      { amount: 'desc' },
      { createdAt: 'asc' },
      { id: 'asc' },
    ],
    include: {
      user: true,
    },
  });

  if (!winningBid) {
    this.logger.warn(`⚠️ No hay pujas para el lote ${detail.coffeeLotId}`);
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

  this.logger.log(`🏆 Puja ganadora para lote ${detail.coffeeLotId}: $${winningBid.amount} por ${winningBid.user.email}`);

  // 2. Verificar precio de reserva
  if (!this.isReservePriceMet(detail, winningBid.amount)) {
    this.logger.warn(`⚠️ No se alcanzó precio de reserva para lote ${detail.coffeeLotId}`);
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

  // 3. Obtener el coffee lot para el nombre del seller
  const coffeeLot = await tx.coffeeLot.findUnique({
    where: { id: detail.coffeeLotId },
  });

  if (!coffeeLot) {
    this.logger.error(`❌ No se encontró el lote ${detail.coffeeLotId}`);
    return null;
  }

  // 4. Crear transacción con sellerId como string (nombre del seller)
  try {
    const transaction = await tx.transaction.create({
      data: {
        amount: winningBid.amount,
        status: 'COMPLETED',
        auction: { connect: { id: auctionId } },
        buyer: { connect: { id: winningBid.userId } },
        sellerId: coffeeLot.seller, // ✅ Guardar el nombre del seller como string
        coffeeLot: { connect: { id: detail.coffeeLotId } },
        paymentDate: new Date(),
      },
    });

    this.logger.log(`💳 Transacción creada: ${transaction.id} - Seller: ${coffeeLot.seller}`);

    // 5. Actualizar estado del lote
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
      coffeeLot,
      auctionDetail: detail
    };
  } catch (error) {
    this.logger.error(`❌ Error creando transacción:`, error);
    throw error;
  }
}

  private isReservePriceMet(detail: any, winningBidAmount: number): boolean {
    return !detail.reservePrice || winningBidAmount >= detail.reservePrice;
  }

 private async sendWinningEmails(winningTransactions: any[], auction: any) {
  if (winningTransactions.length === 0) {
    this.logger.log('📭 No hay transacciones ganadoras, no se enviarán correos');
    return;
  }

  this.logger.log(`📧 Preparando envío de ${winningTransactions.length} correos en paralelo...`);
  
  const startTime = Date.now();
  
  // Crear todas las promesas de envío
  const emailPromises = winningTransactions.map(winData => 
    () => this.sendSingleEmailWithRetry(winData, auction)
  );
  
  // Ejecutar en paralelo con límite de concurrencia
  const CONCURRENCY_LIMIT = 10; // Máximo 10 correos simultáneos
  const results = await this.processInBatches(emailPromises, CONCURRENCY_LIMIT);
  
  const endTime = Date.now();
  
  // Analizar resultados
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  this.logger.log(`📊 Resultados envío de correos:`);
  this.logger.log(`   ✅ ${successful} exitosos (${((successful / winningTransactions.length) * 100).toFixed(1)}%)`);
  this.logger.log(`   ❌ ${failed} fallidos`);
  this.logger.log(`   ⏱️  Tiempo total: ${endTime - startTime}ms`);
  this.logger.log(`   ⚡ Velocidad: ${(winningTransactions.length / ((endTime - startTime) / 1000)).toFixed(2)} correos/segundo`);
  
  // Log detallado de fallos
  if (failed > 0) {
    results.filter(r => !r.success).forEach(result => {
      this.logger.error(`   ❌ Falló correo para ${result.email}:`, result.error?.message || 'Error desconocido');
    });
  }
}

private async sendSingleEmailWithRetry(winData: any, auction: any, retries = 2): Promise<{success: boolean; email: string; error?: any}> {
  const email = winData.winningBid.user.email;
  
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      await this.emailService.sendAuctionWinNotification(
        email,
        winData.winningBid.user.firstName || 'Estimado/a Cliente',
        winData.coffeeLot,
        winData.winningBid,
        auction,
        winData.transaction.sellerId
      );
      
      if (attempt > 1) {
        this.logger.log(`   🔄 Correo a ${email} enviado en intento ${attempt}`);
      }
      
      return { success: true, email };
      
    } catch (error) {
      if (attempt <= retries) {
        this.logger.warn(`   ⚠️ Intento ${attempt} falló para ${email}, reintentando...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Backoff exponencial
      } else {
        this.logger.error(`   ❌ Todos los intentos fallaron para ${email}`);
        return { success: false, email, error };
      }
    }
  }
  
  return { success: false, email, error: new Error('Máximo de reintentos alcanzado') };
}

private async processInBatches<T>(
  promises: (() => Promise<T>)[],
  batchSize: number
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < promises.length; i += batchSize) {
    const batch = promises.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(promises.length / batchSize);
    
    this.logger.log(`   📦 Procesando lote ${batchNumber}/${totalBatches} (${batch.length} correos)`);
    
    const batchResults = await Promise.allSettled(batch.map(p => p()));
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Para mantener consistencia, creamos un resultado fallido
        results.push({
          success: false,
          email: `unknown-${i + index}`,
          error: result.reason
        } as any);
      }
    });
    
    // Pequeña pausa entre lotes para no saturar
    if (i + batchSize < promises.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

  async forceAuctionClosure(auctionId: string) {
    this.logger.warn(`⚠️ Cierre forzado de subasta: ${auctionId}`);
    return this.closeAuction(auctionId);
  }
}