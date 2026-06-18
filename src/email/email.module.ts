// src/email/email.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { BrandingModule } from '../branding/branding.module';

@Module({
  // forwardRef: ciclo Branding → Auth → Email → Branding (ver branding.module).
  imports: [forwardRef(() => BrandingModule)],
  providers: [EmailService],
  controllers: [EmailController],
  exports: [EmailService],
})
export class EmailModule {}