import { forwardRef, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { join } from 'path';
import { BrandingController } from './branding.controller';
import { BrandingService } from './branding.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    // forwardRef: existe el ciclo Branding → Auth → Email → Branding. Se importa
    // AuthModule para que JwtAuthGuard (y sus dependencias) sea inyectable aquí.
    forwardRef(() => AuthModule),
    MulterModule.register({
      dest: join(process.cwd(), 'uploads', 'branding'),
    }),
  ],
  controllers: [BrandingController],
  providers: [BrandingService],
  exports: [BrandingService],
})
export class BrandingModule {}
