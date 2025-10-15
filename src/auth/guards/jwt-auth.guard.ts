import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private authService: AuthService
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Verificar si es una conexión WebSocket
    if (context.getType() === 'ws') {
      return this.handleWsConnection(context);
    }

    // Para HTTP, usar la lógica original
    return super.canActivate(context);
  }

  private async handleWsConnection(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token = this.extractTokenFromHeader(client);

    if (!token) {
      throw new WsException('Unauthorized - No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      const user = await this.authService.validateUserById(payload.sub);
      if (!user) {
        throw new WsException('Unauthorized - User not found');
      }

      // Añadir usuario al objeto de conexión
      client.user = user;
      return true;
    } catch (error) {
      throw new WsException(`Unauthorized - ${error.message}`);
    }
  }

  private extractTokenFromHeader(client: any): string | undefined {
    // Para WebSockets
    if (client.handshake?.headers?.authorization) {
      const [type, token] = client.handshake.headers.authorization.split(' ') ?? [];
      return type === 'Bearer' ? token : undefined;
    }
    // Para HTTP (por si acaso)
    return undefined;
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}