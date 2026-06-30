import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from '../constants';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: any) {
    // Revalidar contra la BD en cada request: una cuenta desactivada o un cambio
    // de contraseña deben revocar el acceso de inmediato, sin esperar a que el
    // token expire.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, isActive: true, passwordChangedAt: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    // Token emitido antes del último cambio de contraseña → inválido. `iat` está
    // en segundos; passwordChangedAt en milisegundos.
    if (
      user.passwordChangedAt &&
      payload.iat * 1000 < user.passwordChangedAt.getTime()
    ) {
      throw new UnauthorizedException();
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role, // Esto ahora será el nombre del rol (string)
    };
  }
}
