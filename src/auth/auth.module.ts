import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module'; // Importa el PrismaModule
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule,
    PrismaModule,
    JwtModule.register({
      global: true, // Make JwtModule available globally
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '120m' },
    }),
    EmailModule
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    JwtStrategy,
    JwtAuthGuard
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    JwtModule
  ],
})
export class AuthModule {}