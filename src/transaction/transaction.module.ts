import { Module } from '@nestjs/common';
import { AuctionModule } from 'src/auction/auction.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';
import { TransactionsController } from './transaction.controller';
import { TransactionsService } from './transaction.service';


@Module({
   imports: [PrismaModule, AuctionModule, UsersModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionModule {}
