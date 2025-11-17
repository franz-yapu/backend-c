// src/dashboard/buyer-dashboard.service.ts (versión simplificada)
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BuyerFiltersDto } from './dto/buyer-filters.dto';

@Injectable()
export class BuyerDashboardService {
  constructor(private prisma: PrismaService) {}

  // 1. Historial de Pujas del Usuario
  async getBidHistory(userId: string, filters: BuyerFiltersDto) {
    const whereClause = this.buildBidWhereClause(userId, filters);

    const bids = await this.prisma.bid.findMany({
      where: whereClause,
      select: {
        id: true,
        amount: true,
        createdAt: true,
        coffeeLot: {
          select: {
            id: true,
            name: true,
            variety: true,
            cupScore: true,
            auctionDetails: {
              select: {
                currentPrice: true,
                startingPrice: true,
              },
            },
          },
        },
        auction: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    const bidEvolution = await this.getBidEvolution(userId, filters);

    const bidSummary = await this.prisma.bid.groupBy({
      by: ['auctionId'],
      where: whereClause,
      _count: {
        id: true,
      },
      _max: {
        amount: true,
      },
    });

    return {
      totalBids: bids.length,
      recentBids: bids.slice(0, 10),
      bidEvolution,
      bidSummary: bidSummary.map(item => ({
        auctionId: item.auctionId,
        bidCount: Number(item._count.id),
        maxBid: item._max.amount,
      })),
      topBids: bids
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
    };
  }

  // 2. Comparativa de Lotes en Subasta Activa
  async getLotComparison(userId: string, filters: BuyerFiltersDto) {
    const whereClause = this.buildLotWhereClause(filters);

    const activeLots = await this.prisma.coffeeLot.findMany({
      where: {
        ...whereClause,
        auctionDetails: {
          some: {
            auction: {
              isActive: true,
              status: 'ACTIVE',
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        variety: true,
        process: true,
        cupScore: true,
        altitude: true,
        region: true,
        auctionDetails: {
          select: {
            currentPrice: true,
            startingPrice: true,
            auction: {
              select: {
                title: true,
                endDate: true,
              },
            },
          },
        },
        _count: {
          select: {
            bids: true,
          },
        },
      },
    });

    const radarData = activeLots.map(lot => ({
      name: lot.name,
      score: lot.cupScore || 0,
      altitude: lot.altitude || 0,
      price: lot.auctionDetails[0]?.currentPrice || lot.auctionDetails[0]?.startingPrice || 0,
      bidActivity: lot._count.bids,
      valueRatio: this.calculateValueRatio(lot),
    }));

    const byVariety = await this.prisma.coffeeLot.groupBy({
      by: ['variety'],
      where: {
        ...whereClause,
        auctionDetails: {
          some: {
            auction: {
              isActive: true,
              status: 'ACTIVE',
            },
          },
        },
      },
      _count: {
        id: true,
      },
      _avg: {
        cupScore: true,
        altitude: true,
      },
    });

    const bestValueLots = activeLots
      .map(lot => ({
        ...lot,
        valueScore: this.calculateValueScore(lot),
      }))
      .sort((a, b) => b.valueScore - a.valueScore)
      .slice(0, 10);

    return {
      totalActiveLots: activeLots.length,
      radarData,
      byVariety: byVariety.map(item => ({
        variety: item.variety || 'No especificado',
        count: Number(item._count.id),
        averageScore: item._avg.cupScore,
        averageAltitude: item._avg.altitude,
      })),
      bestValueLots,
      priceRange: this.calculatePriceRange(activeLots),
    };
  }

  // 3. Tendencias de Precios - SIMPLIFICADO
  async getPriceTrends(filters: BuyerFiltersDto) {
    const whereClause = this.buildPriceTrendWhereClause(filters);

    const auctionLots = await this.prisma.auctionCoffeeLot.findMany({
      where: whereClause,
      include: {
        coffeeLot: {
          select: {
            variety: true,
            cupScore: true,
          },
        },
        auction: {
          select: {
            createdAt: true,
            endDate: true,
          },
        },
      },
    });

    // Agrupar por variedad
    const varietyMap = new Map();
    
    auctionLots.forEach(item => {
      const variety = item.coffeeLot.variety || 'Desconocido';
      if (!varietyMap.has(variety)) {
        varietyMap.set(variety, {
          variety,
          currentPrices: [],
          startingPrices: [],
          cupScores: [],
        });
      }
      
      const data = varietyMap.get(variety);
      if (item.currentPrice && item.currentPrice > 0) {
        data.currentPrices.push(item.currentPrice);
      }
      if (item.startingPrice && item.startingPrice > 0) {
        data.startingPrices.push(item.startingPrice);
      }
      if (item.coffeeLot.cupScore) {
        data.cupScores.push(item.coffeeLot.cupScore);
      }
    });

    const pricesByVariety = Array.from(varietyMap.values())
      .map(data => {
        const avgCurrent = data.currentPrices.length > 0 
          ? data.currentPrices.reduce((a, b) => a + b, 0) / data.currentPrices.length 
          : null;
        const avgStarting = data.startingPrices.length > 0 
          ? data.startingPrices.reduce((a, b) => a + b, 0) / data.startingPrices.length 
          : null;
        const avgScore = data.cupScores.length > 0 
          ? data.cupScores.reduce((a, b) => a + b, 0) / data.cupScores.length 
          : null;

        return {
          variety: data.variety,
          averageCurrentPrice: avgCurrent,
          averageStartingPrice: avgStarting,
          lotCount: Math.max(data.currentPrices.length, data.startingPrices.length),
          averageScore: avgScore,
        };
      })
      .filter(item => item.lotCount > 0)
      .sort((a, b) => (b.averageCurrentPrice || 0) - (a.averageCurrentPrice || 0));

    const priceEvolution = await this.getPriceEvolution(filters);

    return {
      pricesByVariety,
      priceEvolution,
      marketInsights: this.generateMarketInsights(pricesByVariety),
    };
  }

  // 4. Lotes de Interés - SIMPLIFICADO
  async getWatchedLots(userId: string, filters: BuyerFiltersDto) {
    const whereClause: any = {
      userId,
    };

    // Solo aplicar filtros de fecha si existen
    if (filters.startDate || filters.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) {
        whereClause.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.createdAt.lte = new Date(filters.endDate);
      }
    }

    const watchedLots = await this.prisma.bid.findMany({
      where: whereClause,
      distinct: ['coffeeLotId'],
      select: {
        coffeeLot: {
          select: {
            id: true,
            name: true,
            variety: true,
            cupScore: true,
            region: true,
            auctionDetails: {
              select: {
                currentPrice: true,
                startingPrice: true,
                auction: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    endDate: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
        amount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const lotsWithStatus = watchedLots.map((item) => {
      const auction:any = item.coffeeLot.auctionDetails[0]?.auction;
      return {
        ...item.coffeeLot,
        myLastBid: item.amount,
        lastBidDate: item.createdAt,
        status: this.getLotStatus(auction),
        timeRemaining: this.calculateTimeRemaining(auction?.endDate),
        auction: auction,
      };
    });

    return {
      totalWatched: lotsWithStatus.length,
      activeLots: lotsWithStatus.filter(lot => lot.status === 'ACTIVE'),
      wonLots: lotsWithStatus.filter(lot => lot.status === 'WON'),
      lostLots: lotsWithStatus.filter(lot => lot.status === 'LOST' || lot.status === 'CLOSED'),
      expiredLots: lotsWithStatus.filter(lot => lot.status === 'EXPIRED'),
      watchedLots: lotsWithStatus,
    };
  }

  // Métodos auxiliares SIMPLIFICADOS
  private buildBidWhereClause(userId: string, filters: BuyerFiltersDto) {
    const where: any = {
      userId,
    };

    // Solo aplicar filtros de fecha si existen
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    return where;
  }

  private buildLotWhereClause(filters: BuyerFiltersDto) {
    const where: any = {};

    // Solo aplicar filtros si existen
    if (filters.region) {
      where.region = { contains: filters.region, mode: 'insensitive' };
    }

    if (filters.variety) {
      where.variety = { contains: filters.variety, mode: 'insensitive' };
    }

    return where;
  }

  private buildPriceTrendWhereClause(filters: BuyerFiltersDto) {
    const where: any = {
      auction: {
        status: { in: ['CLOSED', 'ACTIVE'] }
      }
    };

    // Solo aplicar filtros de fecha si existen
    if (filters.startDate || filters.endDate) {
      where.auction.createdAt = {};
      if (filters.startDate) {
        where.auction.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.auction.createdAt.lte = new Date(filters.endDate);
      }
    }

    return where;
  }

  private async getBidEvolution(userId: string, filters: BuyerFiltersDto) {
    try {
      const dateFilter: any = {};
      
      if (filters.startDate) {
        dateFilter.gte = new Date(filters.startDate);
      } else {
        // Por defecto últimos 30 días
        dateFilter.gte = new Date();
        dateFilter.gte.setDate(dateFilter.gte.getDate() - 30);
      }
      
      if (filters.endDate) {
        dateFilter.lte = new Date(filters.endDate);
      } else {
        dateFilter.lte = new Date();
      }

      const result = await this.prisma.bid.groupBy({
        by: ['createdAt'],
        where: {
          userId,
          createdAt: dateFilter,
        },
        _count: {
          id: true,
        },
        _avg: {
          amount: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return result.map(item => ({
        date: item.createdAt.toISOString().split('T')[0],
        bid_count: item._count.id,
        average_bid: item._avg.amount,
      }));
    } catch (error) {
      console.error('Error en getBidEvolution:', error);
      return [];
    }
  }

  private async getPriceEvolution(filters: BuyerFiltersDto) {
    try {
      const dateFilter: any = {};
      
      if (filters.startDate) {
        dateFilter.gte = new Date(filters.startDate);
      } else {
        // Por defecto último año
        dateFilter.gte = new Date();
        dateFilter.gte.setFullYear(dateFilter.gte.getFullYear() - 1);
      }
      
      if (filters.endDate) {
        dateFilter.lte = new Date(filters.endDate);
      } else {
        dateFilter.lte = new Date();
      }

      const result = await this.prisma.auctionCoffeeLot.findMany({
        where: {
          auction: {
            createdAt: dateFilter,
            status: { in: ['CLOSED', 'ACTIVE'] }
          },
        },
        include: {
          coffeeLot: {
            select: {
              variety: true,
            },
          },
          auction: {
            select: {
              createdAt: true,
            },
          },
        },
      });

      // Agrupar por mes
      const monthlyData = new Map();
      
      result.forEach(item => {
        const date = new Date(item.auction.createdAt);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            month: monthKey,
            prices: [],
            startingPrices: [],
            count: 0,
          });
        }
        
        const data = monthlyData.get(monthKey);
        if (item.currentPrice && item.currentPrice > 0) {
          data.prices.push(item.currentPrice);
        }
        if (item.startingPrice && item.startingPrice > 0) {
          data.startingPrices.push(item.startingPrice);
        }
        data.count++;
      });

      return Array.from(monthlyData.values())
        .map(data => ({
          month: data.month,
          avg_price: data.prices.length > 0 ? 
            data.prices.reduce((a, b) => a + b, 0) / data.prices.length : null,
          avg_starting_price: data.startingPrices.length > 0 ? 
            data.startingPrices.reduce((a, b) => a + b, 0) / data.startingPrices.length : null,
          lot_count: data.count,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    } catch (error) {
      console.error('Error en getPriceEvolution:', error);
      return [];
    }
  }

  // Los demás métodos auxiliares se mantienen igual...
  private calculateValueRatio(lot: any): number {
    const price = lot.auctionDetails[0]?.currentPrice || lot.auctionDetails[0]?.startingPrice || 1;
    const score = lot.cupScore || 0;
    return score > 0 && price > 0 ? score / price : 0;
  }

  private calculateValueScore(lot: any): number {
    const price = lot.auctionDetails[0]?.currentPrice || lot.auctionDetails[0]?.startingPrice || 1;
    const score = lot.cupScore || 0;
    const altitude = lot.altitude || 0;
    return price > 0 ? (score * 0.6 + altitude * 0.0004) / price : 0;
  }

  private calculatePriceRange(lots: any[]): { min: number; max: number; avg: number } {
    const prices = lots
      .map(lot => lot.auctionDetails[0]?.currentPrice || lot.auctionDetails[0]?.startingPrice)
      .filter(price => price != null && price > 0);

    if (prices.length === 0) return { min: 0, max: 0, avg: 0 };

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    };
  }

  private getLotStatus(auction: any): string {
    if (!auction) return 'UNKNOWN';
    
    if (auction.status === 'ACTIVE' && auction.isActive) {
      return 'ACTIVE';
    }
    
    if (auction.status === 'CLOSED') {
      // Aquí deberías verificar si el usuario ganó esta subasta
      // Por ahora devolvemos CLOSED genérico
      return 'CLOSED';
    }
    
    return auction.status || 'UNKNOWN';
  }

  private calculateTimeRemaining(endDate: string): string {
    if (!endDate) return 'N/A';
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Finalizado';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }
  }

  private generateMarketInsights(pricesByVariety: any[]): string[] {
    const insights: string[] = [];
    if (pricesByVariety.length === 0) {
      insights.push('No hay datos suficientes para generar insights de mercado');
      return insights;
    }

    const varietiesWithData = pricesByVariety.filter(item => 
      item.averageCurrentPrice && item.averageCurrentPrice > 0
    );

    if (varietiesWithData.length > 0) {
      const mostExpensive = varietiesWithData.reduce((prev, current) => 
        (prev.averageCurrentPrice || 0) > (current.averageCurrentPrice || 0) ? prev : current
      );
      insights.push(`Variedad más cara: ${mostExpensive.variety} ($${mostExpensive.averageCurrentPrice?.toFixed(2)})`);

      const cheapest = varietiesWithData.reduce((prev, current) => 
        (prev.averageCurrentPrice || Infinity) < (current.averageCurrentPrice || Infinity) ? prev : current
      );
      insights.push(`Variedad más económica: ${cheapest.variety} ($${cheapest.averageCurrentPrice?.toFixed(2)})`);
    }

    return insights;
  }
}