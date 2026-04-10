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
export class BidsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(BidsGateway.name);
  private readonly clientConnections = new Map<string, {
    lastPing: number;
    latency: number;
    room: string;
  }>();

  private readonly bidBuffer = new Map<string, Array<{
    bidData: CreateBidDto;
    client: Socket;
    timestamp: number;
  }>>();

  private readonly pendingBids = new Map<string, Promise<any>>(); // Para manejar condiciones de carrera
  private heartbeatInterval: NodeJS.Timeout;
  private inactiveCheckInterval: NodeJS.Timeout;
  private isServerReady = false;

  private setupHeartbeat() {
    // Limpiar intervalo anterior si existe
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Enviar ping cada 30 segundos
    this.heartbeatInterval = setInterval(() => {
      if (this.server) {
        this.server.emit('ping', {
          timestamp: Date.now(),
          serverTime: new Date().toISOString()
        });
      }
    }, 30000);
  }

  private setupInactiveCheck() {
    // Limpiar intervalo anterior si existe
    if (this.inactiveCheckInterval) {
      clearInterval(this.inactiveCheckInterval);
    }
    
    // Verificar conexiones inactivas cada 30 segundos
    this.inactiveCheckInterval = setInterval(() => {
      try {
        this.checkInactiveConnections();
      } catch (error) {
        this.logger.error('Error in checkInactiveConnections:', error);
      }
    }, 30000);
  }

  constructor(
    private readonly bidsService: BidsService,
    private readonly auctionClosureService: AuctionClosureService,
  ) {
    // Inicializar después de un breve delay para asegurar que el servidor esté listo
    setTimeout(() => {
      this.setupHeartbeat();
      this.setupInactiveCheck();
      this.logger.log('✅ WebSocket server initialized with heartbeat and connection monitoring');
    }, 2000);
  }

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Client connected: ${client.id}`);
    this.isServerReady = true;

    this.clientConnections.set(client.id, {
      lastPing: Date.now(),
      latency: 0,
      room: ''
    });

    // Enviar ping inmediato
    client.emit('ping', { timestamp: Date.now() });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Client disconnected: ${client.id}`);
    this.clientConnections.delete(client.id);
  }

private disconnectInactiveClient(clientId: string) {
  try {
    // Verificar que el servidor y sockets existan
    if (!this.server || !this.server.sockets) {
      this.clientConnections.delete(clientId);
      return;
    }
    
    let client: Socket | undefined;
    
    // Intentar diferentes formas según la versión de socket.io
    if (this.server.sockets.sockets && this.server.sockets.sockets.get) {
      // socket.io v4+ - usar get()
      client = this.server.sockets.sockets.get(clientId);
    } else if (this.server.sockets.sockets && typeof this.server.sockets.sockets.values === 'function') {
      // socket.io v3 - iterar sobre los valores
      try {
        for (const socket of this.server.sockets.sockets.values()) {
          if (socket.id === clientId) {
            client = socket;
            break;
          }
        }
      } catch (error) {
        this.logger.error(`Error iterating sockets for client ${clientId}:`, error);
      }
    }
    
    if (client && client.connected) {
      this.logger.warn(`⚠️ Disconnecting inactive client: ${clientId}`);
      try {
        client.disconnect(true);
      } catch (disconnectError) {
        this.logger.error(`Error disconnecting client ${clientId}:`, disconnectError);
      }
    }
  } catch (error) {
    this.logger.error(`Error in disconnectInactiveClient for ${clientId}:`, error);
  } finally {
    // Siempre eliminar del mapa de conexiones
    this.clientConnections.delete(clientId);
  }
}

private checkInactiveConnections() {
  // Verificar que el servidor esté listo y disponible
  if (!this.isServerReady || !this.server) {
    return;
  }
  
  try {
    const now = Date.now();
    const INACTIVE_THRESHOLD = 45000; // 45 segundos

    // Crear una copia de las keys para evitar problemas de modificación durante la iteración
    const clientIds = Array.from(this.clientConnections.keys());
    
    for (const clientId of clientIds) {
      const connection = this.clientConnections.get(clientId);
      if (!connection) continue;
      
      if (now - connection.lastPing > INACTIVE_THRESHOLD) {
        this.disconnectInactiveClient(clientId);
      }
    }
  } catch (error) {
    this.logger.error('Error in checkInactiveConnections:', error);
  }
}

  @SubscribeMessage('placeBid')
  async handlePlaceBid(
    @MessageBody() createBidDto: CreateBidDto,
    @ConnectedSocket() client: Socket,
  ) {
    const clientData = this.clientConnections.get(client.id);
    const HIGH_LATENCY_THRESHOLD = 1000; // 1 segundo

    if (clientData && clientData.latency > HIGH_LATENCY_THRESHOLD) {
      this.logger.warn(`⚠️ High latency detected for client ${client.id}: ${clientData.latency}ms`);

      // Notificar al cliente sobre latencia alta
      client.emit('highLatencyWarning', {
        latency: clientData.latency,
        message: 'Tu conexión es lenta. Las pujas pueden tardar en procesarse.'
      });
    }
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

      // ✅ OBTENER DATOS ACTUALIZADOS (incluyendo el nuevo endDate si fue extendido)
      const updatedAuction = await this.bidsService.getAuction(createBidDto.auctionId);

      // Notificar a todos en la sala sobre la nueva puja
      this.server.to(`auction-${createBidDto.auctionId}`).emit('newBid', {
        ...result.bid,
        timestamp: new Date().toISOString(),
        isWinningBid: result.isWinningBid,
        currentPrice: result.currentPrice,
        serverTimestamp: Date.now(),
        // Piggyback de datos de subasta para sincronización redundante
        auctionEndDate: updatedAuction?.endDate,
        auctionStatus: updatedAuction?.status
      });

      // Emitir al cliente que hizo la puja
      client.emit('bidResponse', {
        event: 'bidAccepted',
        data: result.bid,
        lastBids: result.lastBids,
        currentPrice: result.currentPrice,
        isWinningBid: result.isWinningBid,
        serverTimestamp: Date.now(),
        // Piggyback de datos de subasta
        auctionEndDate: updatedAuction?.endDate,
        auctionStatus: updatedAuction?.status
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
      serverTimestamp: Date.now(),
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
      serverTimestamp: Date.now(),
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
      serverTimestamp: Date.now(),
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
      serverTimestamp: Date.now(),
      status: 'CLOSED',
      final: true,
    });
  }

  @SubscribeMessage('joinAuctionRoom')
  handleJoinAuctionRoom(client: Socket, auctionId: string) {
    client.join(`auction-${auctionId}`);
    this.logger.log(`👥 Client ${client.id} joined auction room: ${auctionId}`);

    // Actualizar room en clientConnections
    const clientData = this.clientConnections.get(client.id);
    if (clientData) {
      clientData.room = `auction-${auctionId}`;
    }
    
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
    
    // Actualizar room en clientConnections
    const clientData = this.clientConnections.get(client.id);
    if (clientData) {
      clientData.room = '';
    }
    
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
          serverTimestamp: Date.now(),
        });
      }
    } catch (error) {
      this.logger.error('Error obteniendo tiempo de subasta:', error);
    }
  }

@SubscribeMessage('pong')
handlePong(@ConnectedSocket() client: Socket, data: any) {
  try {
    if (!data) {
      data = { timestamp: Date.now() };
    }
    
    let timestamp: number;
    if (typeof data === 'object' && data.timestamp !== undefined) {
      timestamp = data.timestamp;
    } else if (typeof data === 'number') {
      timestamp = data;
    } else {
      timestamp = Date.now();
    }
    
    const latency = Date.now() - timestamp;
    
    const clientData = this.clientConnections.get(client.id);
    if (clientData) {
      clientData.lastPing = Date.now();
      clientData.latency = latency;
      
      if (latency > 1000) {
        client.emit('highLatencyWarning', {
          latency: latency,
          message: `Tu conexión es lenta (${latency}ms). Las pujas pueden tardar en procesarse.`
        });
      }
    }
    
  } catch (error) {
    this.logger.error(`Error en handlePong para ${client.id}:`, error);
  }
}

  @SubscribeMessage('getConnectionQuality')
  handleGetConnectionQuality(@ConnectedSocket() client: Socket) {
    const clientData = this.clientConnections.get(client.id);

    let quality = 'good';
    if (clientData) {
      if (clientData.latency > 1000) quality = 'poor';
      else if (clientData.latency > 500) quality = 'fair';
    }

    client.emit('connectionQuality', {
      quality,
      latency: clientData?.latency || 0,
      lastPing: clientData?.lastPing || 0
    });
  }

  // Limpiar recursos al destruir el módulo
  onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.inactiveCheckInterval) {
      clearInterval(this.inactiveCheckInterval);
    }
    this.clientConnections.clear();
    this.pendingBids.clear();
    this.bidBuffer.clear();
    this.logger.log('🔄 BidsGateway resources cleaned up');
  }
}