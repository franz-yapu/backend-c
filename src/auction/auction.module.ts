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
    // forwardRef en los dos: desde que el módulo de lotes avisa por WebSocket
    // (BidsGateway) hay un ciclo Auction → CaffeeLot → Bid → Auction, y sin
    // esto uno de los tres se evalúa a `undefined` y Nest no arranca.
    forwardRef(() => CaffeeLotModule),
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