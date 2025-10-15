import { Module } from '@nestjs/common';
import { DmsService } from './dms.service';
import { DmsController } from './dms.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
 controllers: [DmsController],
  providers: [DmsService, PrismaService],
})
export class DmsModule {}
