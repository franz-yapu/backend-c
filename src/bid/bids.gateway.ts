// bids.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BidsService } from './bid.service';
import { AuctionClosureService } from '../auction/auction-closure.service';
import { CreateBidDto } from './dto/create-bid.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/bids',
})
export class BidsGateway {
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
      
      // NOTA: Ya NO verificamos extensión inmediata aquí
      // La extensión ahora ocurre solo cuando el tiempo llega a 0
      
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

  // Nuevo método para notificar extensiones (será llamado por el AuctionClosureService)
  async notifyAuctionExtension(auctionId: string, newEndDate: Date) {
     console.log(`📢 Emitiendo auctionExtended para subasta ${auctionId}`);
  console.log(`🕒 Nueva fecha de fin: ${newEndDate}`);
    this.server.to(`auction-${auctionId}`).emit('auctionExtended', {
      auctionId: auctionId,
      newEndDate: newEndDate,
      extendedBy: '3 minutos',
      reason: 'Actividad de pujas en los últimos 5 minutos'
    });
  }

    async notifyAuctionClosed(auctionId: string) {
      console.log(`📢 Emitiendo auctionClosed para subasta ${auctionId}`);
  
    this.server.to(`auction-${auctionId}`).emit('auctionClosed', {
      auctionId: auctionId,
      closedAt: new Date(),
      message: 'Subasta finalizada definitivamente'
    });
  }

  @SubscribeMessage('joinAuctionRoom')
  handleJoinAuctionRoom(client: Socket, auctionId: string) {
    client.join(`auction-${auctionId}`);
    console.log(`👥 Client ${client.id} joined auction room: ${auctionId}`);
    client.emit('joinedRoom', `Joined auction room: ${auctionId}`);
  }

  @SubscribeMessage('leaveAuctionRoom')
  handleLeaveAuctionRoom(client: Socket, auctionId: string) {
    client.leave(`auction-${auctionId}`);
    console.log(`👋 Client ${client.id} left auction room: ${auctionId}`);
    client.emit('leftRoom', `Left auction room: ${auctionId}`);
  }
}