// user-logs.controller.ts
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UserLogsService } from './user-logs.service';

@Controller('user-logs')
export class UserLogsController {
  constructor(private readonly userLogsService: UserLogsService) {}

  @Get('user/:userId')
  async getUserLogs(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.userLogsService.getUserLogs(userId, page, limit);
  }

  @Get('user/:userId/recent')
  async getRecentActivity(@Param('userId') userId: string) {
    return this.userLogsService.getRecentActivity(userId);
  }

  @Get('user/:userId/stats')
  async getUserStats(@Param('userId') userId: string) {
    return this.userLogsService.getUserActivityStats(userId);
  }
}