// src/email/email.controller.ts
import { Controller, Post, Body, Get, BadRequestException } from '@nestjs/common';
import { EmailResponse } from './interfaces/email.interface';
import { EmailService } from './email.service';


@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test')
  async sendTestEmail(@Body() body: { email?: string }): Promise<EmailResponse> {
    const email = this.validateEmail(body.email);
    
    const html = `
      <h1>✅ Email Test - Cafe Alborada</h1>
      <p>Este es un email de prueba para verificar que el servicio está funcionando correctamente.</p>
      <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
    `;

    return this.emailService.sendEmail({
      to: email,
      subject: 'Prueba de Email - Cafe Alborada',
      html,
    });
  }

  @Post('welcome')
  async sendWelcomeEmail(@Body() body: { email?: string; name?: string }): Promise<EmailResponse> {
    const email = this.validateEmail(body.email);
    const name = this.validateRequired(body.name, 'name');

    return this.emailService.sendWelcomeEmail(email, name);
  }

  @Post('reset-password')
  async sendPasswordResetEmail(
    @Body() body: { email?: string; resetToken?: string; name?: string }
  ): Promise<EmailResponse> {
    const email = this.validateEmail(body.email);
    const resetToken = this.validateRequired(body.resetToken, 'resetToken');
    const name = this.validateRequired(body.name, 'name');

    return this.emailService.sendPasswordResetEmail(email, resetToken, name);
  }

  @Get('health')
  async healthCheck() {
    return {
      status: 'healthy',
      service: process.env.EMAIL_FROM_NAME+' '+'Email Service',
      timestamp: new Date().toISOString(),
    };
  }

  private validateEmail(email?: string): string {
    if (!email) {
      throw new BadRequestException('El campo "email" es requerido');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('El formato del email no es válido');
    }
    
    return email;
  }

  private validateRequired(value: any, fieldName: string): string {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException(`El campo "${fieldName}" es requerido`);
    }
    return value;
  }
}