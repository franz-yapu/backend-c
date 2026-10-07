import { Module, forwardRef } from '@nestjs/common';
import { CoffeeLotsController } from './caffee-lot.controller';
import { CoffeeLotsService } from './caffee-lot.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';
import { BidModule } from 'src/bid/bid.module';


@Module({
  imports: [PrismaModule, UsersModule, forwardRef(() => BidModule)],
  controllers: [CoffeeLotsController],
  providers: [CoffeeLotsService],
  exports: [CoffeeLotsService],
})
export class CaffeeLotModule {}
