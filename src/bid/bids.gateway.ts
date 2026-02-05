import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BidsService } from './bid.service';
import { AuctionClosureService } from '../auction/auction-closure.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/bids',
})
export class BidsGateway {
  private readonly logger = new Logger(BidsGateway.name);
  private readonly pendingBids = new Map<string, Promise<any>>(); // Para manejar condiciones de carrera
  
  constructor(
    private readonly bidsService: BidsService,
    private readonly auctionClosureService: AuctionClosureService,
  ) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('placeBid')
  async handlePlaceBid(
    @MessageBody() createBidDto: CreateBidDto,
    @ConnectedSocket() client: Socket,
  ) {
    const bidKey = `${createBidDto.auctionId}-${createBidDto.coffeeLotId}`;
    
    // Evitar condiciones de carrera: procesar una puja a la vez por lote
    if (this.pendingBids.has(bidKey)) {
      client.emit('bidResponse', { 
        event: 'bidError', 
        data: 'Ya hay una puja en proceso para este lote. Intenta nuevamente en un momento.' 
      });
      return;
    }

    try {
      // Crear promesa para manejar la puja
      const bidPromise = this.processBidWithRaceConditionProtection(createBidDto, client);
      this.pendingBids.set(bidKey, bidPromise);
      
      const result = await bidPromise;
      
      // Notificar a todos en la sala sobre la nueva puja
      this.server.to(`auction-${createBidDto.auctionId}`).emit('newBid', {
        ...result.bid,
        timestamp: new Date().toISOString(),
        isWinningBid: result.isWinningBid,
        currentPrice: result.currentPrice,
      });

      // Emitir al cliente que hizo la puja
      client.emit('bidResponse', { 
        event: 'bidAccepted', 
        data: result.bid, 
        lastBids: result.lastBids,
        currentPrice: result.currentPrice,
        isWinningBid: result.isWinningBid,
      });

      // ✅ NUEVA LÓGICA: Verificar extensión inmediata después de cada puja
      await this.checkAndExtendAuctionImmediately(createBidDto.auctionId);
      
    } catch (error) {
      this.logger.error('Error procesando puja:', error);
      client.emit('bidResponse', { 
        event: 'bidError', 
        data: error.message || 'Error al procesar la puja' 
      });
    } finally {
      // Limpiar la puja pendiente
      this.pendingBids.delete(bidKey);
    }
  }

  private async processBidWithRaceConditionProtection(createBidDto: CreateBidDto, client: Socket) {
    // 1. Obtener precio actual más reciente
    const currentPrice = await this.bidsService.getCurrentPrice(
      createBidDto.auctionId,
      createBidDto.coffeeLotId
    );

    // 2. Validar que el monto sea mayor al precio actual
    if (createBidDto.amount <= currentPrice) {
      throw new Error(`El monto debe ser mayor al precio actual ($${currentPrice})`);
    }

    // 3. Procesar la puja con bloqueo optimista
    const bid = await this.bidsService.createWithOptimisticLock(createBidDto);
    
    // 4. Obtener últimas pujas
    const lastBids = await this.bidsService.findLastBids(
      createBidDto.auctionId,
      createBidDto.coffeeLotId,
      5
    );

    // 5. Verificar si es la puja ganadora actual
    const isWinningBid = await this.bidsService.isWinningBid(
      createBidDto.auctionId,
      createBidDto.coffeeLotId,
      bid.id
    );

    return {
      bid,
      lastBids,
      currentPrice: bid.amount,
      isWinningBid
    };
  }

  // ✅ NUEVO MÉTODO: Verificar y extender inmediatamente
  private async checkAndExtendAuctionImmediately(auctionId: string) {
    try {
      const auction = await this.bidsService.getAuction(auctionId);
      
      if (!auction || auction.status !== 'ACTIVE') {
        return;
      }

      const now = new Date();
      const endDate = new Date(auction.endDate);
      const timeRemaining = endDate.getTime() - now.getTime();

      // Solo extender si quedan menos de 3 minutos
      if (timeRemaining <= 3 * 60 * 1000) {
        const newEndDate = new Date(Date.now() + 3 * 60 * 1000);
        
        await this.bidsService.extendAuction(auctionId, newEndDate);
        
        this.logger.log(`⏰✅ Subasta ${auctionId} extendida INMEDIATAMENTE por puja en últimos 3 minutos`);
        await this.notifyAuctionExtension(auctionId, newEndDate);
      }
    } catch (error) {
      this.logger.error('Error en checkAndExtendAuctionImmediately:', error);
    }
  }

  // ✅ MEJORADO: Notificar extensión con información completa
  async notifyAuctionExtension(auctionId: string, newEndDate: Date) {
    this.logger.log(`📢 Emitiendo auctionExtended para subasta ${auctionId}`);
    
    // Emitir a TODOS los clientes, no solo a la sala
    this.server.emit('auctionExtended', {
      auctionId: auctionId,
      newEndDate: newEndDate.toISOString(),
      extendedBy: '3 minutos',
      reason: 'Puja realizada en los últimos 3 minutos de la subasta',
      timestamp: new Date().toISOString(),
      // Información adicional para actualizar contadores
      timeRemaining: newEndDate.getTime() - Date.now(),
      formattedEndDate: newEndDate.toLocaleTimeString(),
    });

    // También emitir a la sala específica
    this.server.to(`auction-${auctionId}`).emit('auctionExtended', {
      auctionId: auctionId,
      newEndDate: newEndDate.toISOString(),
      extendedBy: '3 minutos',
      reason: 'Puja realizada en los últimos 3 minutos de la subasta',
      timestamp: new Date().toISOString(),
    });
  }

  // ✅ MEJORADO: Notificar cierre con información completa
  async notifyAuctionClosed(auctionId: string) {
    this.logger.log(`📢 Emitiendo auctionClosed para subasta ${auctionId}`);

    // Emitir a TODOS los clientes
    this.server.emit('auctionClosed', {
      auctionId: auctionId,
      closedAt: new Date().toISOString(),
      message: 'Subasta finalizada definitivamente',
      timestamp: new Date().toISOString(),
      // Información para actualizar UI
      status: 'CLOSED',
      final: true,
    });

    // También emitir a la sala específica
    this.server.to(`auction-${auctionId}`).emit('auctionClosed', {
      auctionId: auctionId,
      closedAt: new Date().toISOString(),
      message: 'Subasta finalizada definitivamente',
      timestamp: new Date().toISOString(),
      status: 'CLOSED',
      final: true,
    });
  }

  @SubscribeMessage('joinAuctionRoom')
  handleJoinAuctionRoom(client: Socket, auctionId: string) {
    client.join(`auction-${auctionId}`);
    this.logger.log(`👥 Client ${client.id} joined auction room: ${auctionId}`);
    
    // Enviar información actualizada al unirse
    client.emit('joinedRoom', {
      auctionId,
      message: `Joined auction room: ${auctionId}`,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('leaveAuctionRoom')
  handleLeaveAuctionRoom(client: Socket, auctionId: string) {
    client.leave(`auction-${auctionId}`);
    this.logger.log(`👋 Client ${client.id} left auction room: ${auctionId}`);
    client.emit('leftRoom', `Left auction room: ${auctionId}`);
  }

  // ✅ NUEVO: Enviar actualización de tiempo periódicamente
  @SubscribeMessage('getAuctionTime')
  async handleGetAuctionTime(client: Socket, auctionId: string) {
    try {
      const auction = await this.bidsService.getAuction(auctionId);
      if (auction) {
        client.emit('auctionTimeUpdate', {
          auctionId,
          endDate: auction.endDate,
          timeRemaining: new Date(auction.endDate).getTime() - Date.now(),
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error('Error obteniendo tiempo de subasta:', error);
    }
  }
}