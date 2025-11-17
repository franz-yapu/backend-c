import { Module } from '@nestjs/common';
import { UserLogsService } from './user-logs.service';
import { UserLogsController } from './user-logs.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [UserLogsController],
  providers: [UserLogsService,PrismaService],
  exports:[UserLogsService]

})
export class UserLogsModule {}
