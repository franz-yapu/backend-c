// src/dashboard/buyer-dashboard.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BuyerDashboardService } from './buyer-dashboard.service';
import { BuyerFiltersDto } from './dto/buyer-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { filter } from 'rxjs';


  @Controller('dashboard/buyer')
export class BuyerDashboardController {
  constructor(private readonly buyerDashboardService: BuyerDashboardService) {}

  @Get('summary')
  async getBuyerDashboardSummary(@Query() filters: BuyerFiltersDto) {
    if (!filters.userId) {
      throw new Error('userId es requerido');
    }

    const [bidHistory, lotComparison, priceTrends, watchedLots] = await Promise.all([
      this.buyerDashboardService.getBidHistory(filters.userId, filters),
      this.buyerDashboardService.getLotComparison(filters.userId, filters),
      this.buyerDashboardService.getPriceTrends(filters),
      this.buyerDashboardService.getWatchedLots(filters.userId, filters)
    ]);

    return {
      bidHistory,
      lotComparison,
      priceTrends,
      watchedLots,
      timestamp: new Date().toISOString()
    };
  }

  @Get('buyer/bid-history')
  @ApiOperation({ summary: 'Obtener historial de pujas del usuario' })
  async getBidHistory(@Query() filters: BuyerFiltersDto) {
    if (!filters.userId) {
      throw new Error('userId es requerido');
    }
    return this.buyerDashboardService.getBidHistory(filters.userId, filters);
  }

  @Get('buyer/lot-comparison')
  @ApiOperation({ summary: 'Obtener comparativa de lotes en subasta activa' })
  async getLotComparison(@Query() filters: BuyerFiltersDto) {
    if (!filters.userId) {
      throw new Error('userId es requerido');
    }
    return this.buyerDashboardService.getLotComparison(filters.userId, filters);
  }

 

  @Get('buyer/watched-lots')
  @ApiOperation({ summary: 'Obtener lotes de interés del usuario' })
  async getWatchedLots(@Query() filters: BuyerFiltersDto) {
    if (!filters.userId) {
      throw new Error('userId es requerido');
    }
    return this.buyerDashboardService.getWatchedLots(filters.userId, filters);
  }
}