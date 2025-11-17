// user-logs.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserLogsService {
  constructor(private prisma: PrismaService) {}

  async getUserLogs(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    // Usamos consulta raw SQL para la vista
    const [logs, totalResult]:any = await Promise.all([
      this.prisma.$queryRaw`
        SELECT 
          id,
          user_id as "userId",
          action,
          module,
          ip_address as "ipAddress", 
          user_agent as "userAgent",
          metadata,
          created_at as "createdAt"
        FROM user_logs 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${skip}
      `,
      this.prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM user_logs 
        WHERE user_id = ${userId}
      `
    ]);

    const total = parseInt(totalResult[0].total);
     console.log(totalResult);
     
    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getRecentActivity(userId: string, limit: number = 5) {
    return this.prisma.$queryRaw`
      SELECT 
        id,
        action,
        module,
        created_at as "createdAt",
        metadata
      FROM user_logs 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }

  // Método para obtener estadísticas
  async getUserActivityStats(userId: string) {
    const stats = await this.prisma.$queryRaw`
      SELECT 
        action,
        COUNT(*) as count
      FROM user_logs 
      WHERE user_id = ${userId}
      GROUP BY action
      ORDER BY count DESC
    `;

    return stats;
  }
}