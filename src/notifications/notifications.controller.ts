import { Body, Controller, Delete, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PushService } from './push.service';
import { RegisterTokenDto } from './dto/register-token.dto';

// El JwtAuthGuard es global (APP_GUARD en app.module); el userId SIEMPRE sale del
// JWT (req.user.userId), nunca del body, igual que en BidsController.
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly pushService: PushService) {}

  @Post('register-token')
  @ApiOperation({ summary: 'Registra el token de Expo Push del dispositivo' })
  async registerToken(@Body() dto: RegisterTokenDto, @Request() req: any) {
    await this.pushService.registerToken(req.user.userId, dto.token, dto.platform);
    return { ok: true };
  }

  @Delete('token')
  @ApiOperation({ summary: 'Elimina un token de push (logout)' })
  async removeToken(@Body() dto: RegisterTokenDto) {
    await this.pushService.removeToken(dto.token);
    return { ok: true };
  }
}
