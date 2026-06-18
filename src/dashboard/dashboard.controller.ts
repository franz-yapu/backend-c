// src/dashboard/dashboard.controller.ts
import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';
import { BigIntInterceptor } from 'src/common/interceptors/bigint.interceptor';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesEnum } from '../auth/roles.enum';


// Dashboard de administración (métricas globales): solo ADMIN.
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(RolesEnum.ADMIN)
@Controller('dashboard')
@UseInterceptors(BigIntInterceptor)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin/summary')
  async getAdminSummary(@Query() filters: DashboardFiltersDto) {
    const [auctionSummary, lotPerformance, transactionAnalytics, userActivity] = await Promise.all([
      this.dashboardService.getAuctionSummary(filters),
      this.dashboardService.getLotPerformance(filters),
      this.dashboardService.getTransactionAnalytics(filters),
      this.dashboardService.getUserActivity(filters),
    ]);

    return {
      auctionSummary,
      lotPerformance,
      transactionAnalytics,
      userActivity,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin/auctions')
  async getAuctionAnalytics(@Query() filters: DashboardFiltersDto) {
    return this.dashboardService.getAuctionSummary(filters);
  }

  @Get('admin/lots')
  async getLotAnalytics(@Query() filters: DashboardFiltersDto) {
    return this.dashboardService.getLotPerformance(filters);
  }

  @Get('admin/transactions')
  async getTransactionAnalytics(@Query() filters: DashboardFiltersDto) {
    return this.dashboardService.getTransactionAnalytics(filters);
  }

  @Get('admin/users')
  async getUserAnalytics(@Query() filters: DashboardFiltersDto) {
    return this.dashboardService.getUserActivity(filters);
  }
}