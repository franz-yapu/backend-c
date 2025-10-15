import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuctionsController } from './auction.controller';
import { AuctionsService } from './auction.service';
import { CaffeeLotModule } from 'src/caffee-lot/caffee-lot.module';
import { UsersModule } from 'src/users/users.module';
import { BidModule } from 'src/bid/bid.module';
import { AuctionClosureService } from './auction-closure.service';
import { EmailService } from 'src/email/email.service';



@Module({
    imports: [PrismaModule, CaffeeLotModule, UsersModule,
      forwardRef(() => BidModule) ],
  controllers: [AuctionsController],
  providers: [AuctionsService,AuctionClosureService, EmailService],
  exports: [AuctionsService,AuctionClosureService, EmailService],
})
export class AuctionModule {}
