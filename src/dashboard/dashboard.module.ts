import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BuyerDashboardController } from './buyer-dashboard.controller';
import { BuyerDashboardService } from './buyer-dashboard.service';

@Module({
   imports: [PrismaModule],
  controllers: [DashboardController, BuyerDashboardController],
  providers: [DashboardService, BuyerDashboardService],
  exports: [DashboardService, BuyerDashboardService],
})
export class DashboardModule {}
