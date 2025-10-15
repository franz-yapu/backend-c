import { Module } from '@nestjs/common';
import { MarcaService } from './marca.service';
import { MarcaController } from './marca.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
   imports: [PrismaModule],
  controllers: [MarcaController],
  providers: [MarcaService],
   exports: [MarcaService],
})
export class MarcaModule {}
