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
import { forwardRef, Inject } from '@nestjs/common';
import { CreateBidDto } from './dto/create-bid.dto';
import { BidsService } from './bid.service';

// OPCIÓN 1: Sin namespace (recomendado)
@WebSocketGateway({
  cors: {
    origin: '*',
  },
 namespace: '/bids',
})

// OPCIÓN 2: Con namespace (si prefieres usarlo)
// @WebSocketGateway({
//   cors: {
//     origin: '*',
//   },
//   namespace: '/bids' // ← Asegúrate de que coincida con el frontend
// })
export class BidsGateway {
  constructor(private readonly bidsService: BidsService) {}

  @WebSocketServer()
  server: Server; // 👈 aquí NestJS lo inicializa automáticamente

@SubscribeMessage('placeBid')
async handlePlaceBid(
  @MessageBody() createBidDto: CreateBidDto,
  @ConnectedSocket() client: Socket,
) {
  try {
  const bid = await this.bidsService.create(createBidDto);
    // Notifica a todos en la sala
    this.server.to(`auction-${createBidDto.auctionId}`).emit('newBid', bid);

    // Obtenemos últimas 5 pujas del lote
    const lastBids = await this.bidsService.findLastBids(
      createBidDto.auctionId,
      createBidDto.coffeeLotId,
      5
    );

    // Emitimos al cliente que hizo la puja
    client.emit('bidResponse', { event: 'bidAccepted', data: bid, lastBids });
  } catch (error) {
    client.emit('bidResponse', { event: 'bidError', data: error.message });
  }
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