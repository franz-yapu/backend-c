import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Time')
@Public() // Hora del servidor (sync de subastas) y health check: públicos.
@Controller('time')
export class TimeController {
  @Get('server')
  @ApiOperation({ summary: 'Get server time for synchronization' })
  @ApiResponse({ status: 200, description: 'Server time returned' })
  getServerTime() {
    return {
      serverTime: new Date().toISOString(),
      timestamp: Date.now(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      uptime: process.uptime()
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Server is healthy' })
  healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'auction-backend'
    };
  }
}