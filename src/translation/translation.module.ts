import { Module } from '@nestjs/common';
import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  // AuthModule provee JwtAuthGuard (y sus dependencias) para los guards.
  // No hay ciclo: Auth no importa TranslationModule.
  imports: [PrismaModule, AuthModule],
  controllers: [TranslationController],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationModule {}
