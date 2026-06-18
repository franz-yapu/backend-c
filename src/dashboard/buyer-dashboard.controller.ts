// src/dashboard/buyer-dashboard.controller.ts
import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { BuyerDashboardService } from './buyer-dashboard.service';
import { BuyerFiltersDto } from './dto/buyer-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { filter } from 'rxjs';


// El dato es SIEMPRE del usuario autenticado: el userId se toma del JWT y se
// ignora el que venga del cliente (evita IDOR de leer el dashboard de otro).
@ApiBearerAuth()
@Controller('dashboard/buyer')
export class BuyerDashboardController {
  constructor(private readonly buyerDashboardService: BuyerDashboardService) {}

  @Get('summary')
  async getBuyerDashboardSummary(@Query() filters: BuyerFiltersDto, @Request() req: any) {
    const userId: string = req.user.userId;
    filters.userId = userId;

    const [bidHistory, lotComparison, priceTrends, watchedLots] = await Promise.all([
      this.buyerDashboardService.getBidHistory(userId, filters),
      this.buyerDashboardService.getLotComparison(userId, filters),
      this.buyerDashboardService.getPriceTrends(filters),
      this.buyerDashboardService.getWatchedLots(userId, filters)
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
  async getBidHistory(@Query() filters: BuyerFiltersDto, @Request() req: any) {
    const userId: string = req.user.userId;
    filters.userId = userId;
    return this.buyerDashboardService.getBidHistory(userId, filters);
  }

  @Get('buyer/lot-comparison')
  @ApiOperation({ summary: 'Obtener comparativa de lotes en subasta activa' })
  async getLotComparison(@Query() filters: BuyerFiltersDto, @Request() req: any) {
    const userId: string = req.user.userId;
    filters.userId = userId;
    return this.buyerDashboardService.getLotComparison(userId, filters);
  }

  @Get('buyer/watched-lots')
  @ApiOperation({ summary: 'Obtener lotes de interés del usuario' })
  async getWatchedLots(@Query() filters: BuyerFiltersDto, @Request() req: any) {
    const userId: string = req.user.userId;
    filters.userId = userId;
    return this.buyerDashboardService.getWatchedLots(userId, filters);
  }
}