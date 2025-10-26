import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { EmailModule } from 'src/email/email.module';


@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule), 
    EmailModule // Use forwardRef here
  ],
  controllers: [UsersController],
  providers: [UsersService,EmailModule],
  exports: [UsersService],
})
export class UsersModule {}