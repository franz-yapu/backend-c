import { Module } from '@nestjs/common';
import { CrudGeneratorService } from './crud-generator.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CrudGeneratorController } from './crud-generator.controller';
import { PrismaModule } from 'src/prisma/prisma.module';


@Module({
  imports: [PrismaModule],
     controllers: [CrudGeneratorController], // Asegúrate que el controlador está registrado
  providers: [CrudGeneratorService, PrismaService],
})
export class CrudGeneratorModule {}
