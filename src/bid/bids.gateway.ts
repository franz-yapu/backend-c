// bids.gateway.ts
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
    try {
      const bid = await this.bidsService.create(createBidDto);
      
      // ✅ NUEVA LÓGICA: Verificar extensión inmediata después de cada puja
      await this.checkAndExtendAuctionImmediately(createBidDto.auctionId);
      
      // Notifica a todos en la sala sobre la nueva puja
      this.server.to(`auction-${createBidDto.auctionId}`).emit('newBid', bid);

      // Obtenemos últimas 5 pujas del lote
      const lastBids = await this.bidsService.findLastBids(
        createBidDto.auctionId,
        createBidDto.coffeeLotId,
        5
      );

      // Emitimos al cliente que hizo la puja
      client.emit('bidResponse', { 
        event: 'bidAccepted', 
        data: bid, 
        lastBids
      });
    } catch (error) {
      client.emit('bidResponse', { event: 'bidError', data: error.message });
    }
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

  // Métodos existentes sin cambios...
  async notifyAuctionExtension(auctionId: string, newEndDate: Date) {
    this.logger.log(`📢 Emitiendo auctionExtended para subasta ${auctionId}`);
    this.logger.log(`🕒 Nueva fecha de fin: ${newEndDate}`);
    
    this.server.to(`auction-${auctionId}`).emit('auctionExtended', {
      auctionId: auctionId,
      newEndDate: newEndDate,
      extendedBy: '3 minutos',
      reason: 'Puja realizada en los últimos 3 minutos de la subasta'
    });
  }

  async notifyAuctionClosed(auctionId: string) {
    this.logger.log(`📢 Emitiendo auctionClosed para subasta ${auctionId}`);

    this.server.to(`auction-${auctionId}`).emit('auctionClosed', {
      auctionId: auctionId,
      closedAt: new Date(),
      message: 'Subasta finalizada definitivamente'
    });
  }

  @SubscribeMessage('joinAuctionRoom')
  handleJoinAuctionRoom(client: Socket, auctionId: string) {
    client.join(`auction-${auctionId}`);
    this.logger.log(`👥 Client ${client.id} joined auction room: ${auctionId}`);
    client.emit('joinedRoom', `Joined auction room: ${auctionId}`);
  }

  @SubscribeMessage('leaveAuctionRoom')
  handleLeaveAuctionRoom(client: Socket, auctionId: string) {
    client.leave(`auction-${auctionId}`);
    this.logger.log(`👋 Client ${client.id} left auction room: ${auctionId}`);
    client.emit('leftRoom', `Left auction room: ${auctionId}`);
  }
}