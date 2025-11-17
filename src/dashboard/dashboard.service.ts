// src/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // 1. Resumen General de Subastas
  async getAuctionSummary(filters: DashboardFiltersDto) {
    const whereClause = this.buildWhereClause(filters);

    const auctions = await this.prisma.auction.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
        isActive: true,
        _count: {
          select: {
            auctionDetails: true,
            bids: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const byStatus = await this.prisma.auction.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        id: true,
      },
    });

    const byMonth = await this.getAuctionsByMonth(filters);

    return this.transformDataForResponse({
      totalAuctions: auctions.length,
      activeAuctions: auctions.filter(a => a.isActive).length,
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: Number(item._count.id),
      })),
      byMonth,
      recentAuctions: auctions.slice(0, 5),
    });
  }

  // 2. Rendimiento de Lotes
  async getLotPerformance(filters: DashboardFiltersDto) {
    const whereClause = this.buildCoffeeLotWhereClause(filters);

    const lots = await this.prisma.coffeeLot.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        cupScore: true,
        variety: true,
        process: true,
        region: true,
        altitude: true,
        auctionDetails: {
          select: {
            currentPrice: true,
            startingPrice: true,
          },
        },
      },
    });

    // Lotes por puntaje de catación
    const scoreRanges = [
      { range: '90-100', min: 90, max: 100 },
      { range: '85-89', min: 85, max: 89.99 },
      { range: '80-84', min: 80, max: 84.99 },
      { range: '75-79', min: 75, max: 79.99 },
      { range: '0-74', min: 0, max: 74.99 },
    ];

    const byScore = scoreRanges.map(range => {
      const count = lots.filter(lot => 
        lot.cupScore && lot.cupScore >= range.min && lot.cupScore < range.max
      ).length;
      return {
        range: range.range,
        count,
      };
    });

    // Lotes por región
    const byRegion = await this.prisma.coffeeLot.groupBy({
      by: ['region'],
      where: whereClause,
      _count: {
        id: true,
      },
      _avg: {
        cupScore: true,
      },
    });

    // Lotes por proceso
    const byProcess = await this.prisma.coffeeLot.groupBy({
      by: ['process'],
      where: whereClause,
      _count: {
        id: true,
      },
      _avg: {
        cupScore: true,
      },
    });

    return this.transformDataForResponse({
      totalLots: lots.length,
      averageScore: this.calculateAverage(lots.map((l:any) => l.cupScore).filter(Boolean)),
      byScore,
      byRegion: byRegion.map(item => ({
        region: item.region || 'No especificado',
        count: Number(item._count.id),
        averageScore: item._avg.cupScore,
      })),
      byProcess: byProcess.map(item => ({
        process: item.process || 'No especificado',
        count: Number(item._count.id),
        averageScore: item._avg.cupScore,
      })),
      topLots: lots
        .filter(l => l.cupScore)
        .sort((a, b) => (b.cupScore || 0) - (a.cupScore || 0))
        .slice(0, 10),
    });
  }

  // 3. Transacciones e Ingresos
  async getTransactionAnalytics(filters: DashboardFiltersDto) {
    const whereClause = this.buildTransactionWhereClause(filters);

    const transactions = await this.prisma.transaction.findMany({
      where: whereClause,
      select: {
        id: true,
        amount: true,
        status: true,
        paymentDate: true,
        createdAt: true,
        coffeeLot: {
          select: {
            name: true,
            variety: true,
          },
        },
      },
    });

    const revenueByMonth = await this.getRevenueByMonth(filters);

    const byStatus = await this.prisma.transaction.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    });

    const totalRevenue = transactions
      .filter(t => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + t.amount, 0);

    return this.transformDataForResponse({
      totalTransactions: transactions.length,
      totalRevenue,
      completedTransactions: transactions.filter(t => t.status === 'COMPLETED').length,
      pendingTransactions: transactions.filter(t => t.status === 'PENDING').length,
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: Number(item._count.id),
        totalAmount: item._sum.amount || 0,
      })),
      revenueByMonth,
      recentTransactions: transactions.slice(0, 10),
    });
  }

  // 4. Actividad de Usuarios
  async getUserActivity(filters: DashboardFiltersDto) {
    const whereClause = this.buildUserWhereClause(filters);

    const users = await this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        role: {
          select: {
            name: true,
          },
        },
        createdAt: true,
        _count: {
          select: {
            bids: true,
            coffeeLots: true,
            soldTransactions: true,
            boughtTransactions: true,
          },
        },
      },
    });

    const byRole = await this.prisma.user.groupBy({
      by: ['roleId'],
      where: whereClause,
      _count: {
        id: true,
      },
    });

    const roles = await this.prisma.role.findMany({
      where: {
        id: {
          in: byRole.map(item => item.roleId),
        },
      },
    });
const byRoleWithNames = byRole.map(item => {
  const role = roles.find(r => r.id === item.roleId);
  
  // Traducción de roles al español
  let roleName = 'Desconocido';
  
  if (role?.name) {
    const roleTranslations: { [key: string]: string } = {
      'ADMIN': 'Administrador',
      'PRODUCER': 'Productor',
      'CLIENT': 'Cliente',
      'BUYER': 'Comprador',
      'SELLER': 'Vendedor',
      'USER': 'Usuario',
      'MANAGER': 'Gerente',
      'MODERATOR': 'Moderador'
    };
    
    roleName = roleTranslations[role.name] || role.name;
  }
  
  return {
    role: roleName,
    count: Number(item._count.id),
  };
});

    const registrationsByMonth = await this.getRegistrationsByMonth(filters);

    const mostActiveUsers = users
      .map(user => ({
        ...user,
        totalActivity: Number(user._count.bids) + Number(user._count.coffeeLots),
      }))
      .sort((a, b) => b.totalActivity - a.totalActivity)
      .slice(0, 10);

    return this.transformDataForResponse({
      totalUsers: users.length,
      byRole: byRoleWithNames,
      registrationsByMonth,
      mostActiveUsers,
      newUsersThisMonth: users.filter(user => {
        const userDate = new Date(user.createdAt);
        const now = new Date();
        return userDate.getMonth() === now.getMonth() && 
               userDate.getFullYear() === now.getFullYear();
      }).length,
    });
  }

  // ========== MÉTODOS AUXILIARES ==========

  private buildWhereClause(filters: DashboardFiltersDto) {
    const where: any = {};

    if (filters.startDate && filters.endDate) {
      where.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    if (filters.year) {
      where.startDate = {
        gte: new Date(filters.year, 0, 1),
        lte: new Date(filters.year, 11, 31),
      };
    }

    return where;
  }

  private buildCoffeeLotWhereClause(filters: DashboardFiltersDto) {
    const where: any = {};

    if (filters.region) {
      where.region = { contains: filters.region, mode: 'insensitive' };
    }

    if (filters.variety) {
      where.variety = { contains: filters.variety, mode: 'insensitive' };
    }

    if (filters.process) {
      where.process = { contains: filters.process, mode: 'insensitive' };
    }

    if (filters.startDate && filters.endDate) {
      where.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    return where;
  }

  private buildTransactionWhereClause(filters: DashboardFiltersDto) {
    const where: any = {};

    if (filters.startDate && filters.endDate) {
      where.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    return where;
  }

  private buildUserWhereClause(filters: DashboardFiltersDto) {
    const where: any = {};

    if (filters.startDate && filters.endDate) {
      where.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    return where;
  }

  private async getAuctionsByMonth(filters: DashboardFiltersDto) {
    const result: any = await this.prisma.$queryRaw`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "created_at"), 'YYYY-MM') as month,
        status,
        COUNT(*)::integer as count
      FROM "auctions"
      WHERE "created_at" BETWEEN COALESCE(${filters.startDate ? new Date(filters.startDate) : null}::timestamp, NOW() - INTERVAL '1 year') 
                            AND COALESCE(${filters.endDate ? new Date(filters.endDate) : null}::timestamp, NOW())
      GROUP BY DATE_TRUNC('month', "created_at"), status
      ORDER BY month DESC
      LIMIT 12
    `;

    return this.transformRawResults(result);
  }

  private async getRevenueByMonth(filters: DashboardFiltersDto) {
    const result: any = await this.prisma.$queryRaw`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "created_at"), 'YYYY-MM') as month,
        SUM(amount)::float as revenue,
        COUNT(*)::integer as transaction_count
      FROM "transactions"
      WHERE status = 'COMPLETED'
        AND "created_at" BETWEEN COALESCE(${filters.startDate ? new Date(filters.startDate) : null}::timestamp, NOW() - INTERVAL '1 year') 
                            AND COALESCE(${filters.endDate ? new Date(filters.endDate) : null}::timestamp, NOW())
      GROUP BY DATE_TRUNC('month', "created_at")
      ORDER BY month DESC
      LIMIT 12
    `;

    return this.transformRawResults(result);
  }

  private async getRegistrationsByMonth(filters: DashboardFiltersDto) {
    const result: any = await this.prisma.$queryRaw`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "created_at"), 'YYYY-MM') as month,
        COUNT(*)::integer as count
      FROM "user"
      WHERE "created_at" BETWEEN COALESCE(${filters.startDate ? new Date(filters.startDate) : null}::timestamp, NOW() - INTERVAL '1 year') 
                            AND COALESCE(${filters.endDate ? new Date(filters.endDate) : null}::timestamp, NOW())
      GROUP BY DATE_TRUNC('month', "created_at")
      ORDER BY month DESC
      LIMIT 12
    `;

    return this.transformRawResults(result);
  }

  private transformRawResults(results: any[]): any[] {
    return results.map(item => {
      const transformed: any = {};
      for (const key in item) {
        if (item.hasOwnProperty(key)) {
          let value = item[key];
          
          if (typeof value === 'bigint') {
            value = Number(value);
          }
          
          if (value instanceof Date) {
            value = value.toISOString();
          }
          
          transformed[key] = value;
        }
      }
      return transformed;
    });
  }

  private transformDataForResponse(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'bigint') {
      return Number(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.transformDataForResponse(item));
    }

    if (typeof data === 'object' && !(data instanceof Date)) {
      const transformed: any = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          transformed[key] = this.transformDataForResponse(data[key]);
        }
      }
      return transformed;
    }

    if (data instanceof Date) {
      return data.toISOString();
    }

    return data;
  }

  private calculateAverage(numbers: number[]): number {
    const validNumbers = numbers.filter(n => n != null);
    if (validNumbers.length === 0) return 0;
    return validNumbers.reduce((a, b) => a + b, 0) / validNumbers.length;
  }
}