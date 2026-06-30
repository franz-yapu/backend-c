import { forwardRef, Module } from '@nestjs/common';
import { AuctionModule } from 'src/auction/auction.module';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { BidsController } from './bid.controller';
import { BidsService } from './bid.service';
import { BidsGateway } from './bids.gateway';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuctionModule),
    UsersModule,
    AuthModule,
    NotificationsModule,
  ],
  controllers: [BidsController],
  providers: [
    BidsService,
    BidsGateway
  ],
  exports: [
    BidsService, 
    BidsGateway // Exporta BidsGateway para que AuctionModule pueda usarlo
  ],
})
export class BidModule {}