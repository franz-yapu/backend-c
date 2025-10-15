import { Module } from '@nestjs/common';
import { CoffeeLotsController } from './caffee-lot.controller';
import { CoffeeLotsService } from './caffee-lot.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';


@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [CoffeeLotsController],
  providers: [CoffeeLotsService],
  exports: [CoffeeLotsService],
})
export class CaffeeLotModule {}
