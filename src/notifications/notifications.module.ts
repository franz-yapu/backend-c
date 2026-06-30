import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { PushService } from './push.service';

// Módulo de notificaciones push (Expo). Exporta PushService para que BidsGateway
// dispare el aviso "te superaron la puja".
@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [PushService],
  exports: [PushService],
})
export class NotificationsModule {}
