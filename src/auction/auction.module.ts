import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuctionsController } from './auction.controller';
import { AuctionsService } from './auction.service';
import { CaffeeLotModule } from 'src/caffee-lot/caffee-lot.module';
import { UsersModule } from 'src/users/users.module';
import { BidModule } from 'src/bid/bid.module';
import { AuctionClosureService } from './auction-closure.service';
import { EmailModule } from 'src/email/email.module';
import { AuctionTimerService } from './auction-timer.service';

@Module({
  imports: [
    PrismaModule, 
    CaffeeLotModule, 
    UsersModule,
    forwardRef(() => BidModule),
    EmailModule,
  ],
  controllers: [AuctionsController],
  providers: [
    AuctionsService,
    AuctionClosureService,
    AuctionTimerService,
  ],
  exports: [
    AuctionsService,
    AuctionClosureService, 
    AuctionTimerService,
  ],
})
export class AuctionModule {}