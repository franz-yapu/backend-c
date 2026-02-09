// src/email/email.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import * as nodemailer from 'nodemailer';
import { EmailOptions, EmailResponse } from './interfaces/email.interface';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: any;
  private oauth2Client: any;

  async onModuleInit() {
    await this.initializeTransporter();
  }

  private initializeOAuth2() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );

    this.oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
  }

  private async initializeTransporter() {
    try {
      this.initializeOAuth2();

      const { token: accessToken } = await this.oauth2Client.getAccessToken();

      // FORMA CORRECTA de crear el transporter
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.GMAIL_USER,
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
          accessToken: accessToken,
        },
      });

      await this.verifyConnection();
      this.logger.log('✅ Email transporter initialized successfully');
    } catch (error) {
      this.logger.error('❌ Error initializing email transporter:', error);
      // Fallback a método simple
      await this.initializeSimpleTransporter();
    }
  }

  // Método alternativo simple
  private async initializeSimpleTransporter() {
    try {
      this.logger.log('🔄 Trying simple SMTP configuration...');
      
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD, // Contraseña de aplicación
        },
      });

      await this.verifyConnection();
      this.logger.log('✅ Simple SMTP transporter initialized successfully');
    } catch (error) {
      this.logger.error('❌ Simple SMTP also failed:', error);
      throw error;
    }
  }

  private async verifyConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.transporter.verify((error, success) => {
        if (error) {
          this.logger.error('❌ Error verifying email connection:', error);
          reject(error);
        } else {
          this.logger.log('✅ Email connection verified');
          resolve();
        }
      });
    });
  }

  async sendEmail(options: EmailOptions): Promise<EmailResponse> {
    try {
      const { to, subject, html } = options;

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Zeta',
          address: process.env.GMAIL_USER,
        },
        to,
        subject,
        html,
      };

      this.logger.log(`📧 Attempting to send email to: ${to}`);

      const result = await this.transporter.sendMail(mailOptions);
      
      this.logger.log(`✅ Email sent successfully to ${to}`);
      this.logger.log(`📫 Message ID: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      this.logger.error(`❌ Error sending email to ${options.to}:`, error);
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendWelcomeEmail(data: any, token: string): Promise<EmailResponse> {
    const to = data.email;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8B4513; color: white; padding: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1> Cáritas</h1>
          </div>
          <div class="content">
            <h2>¡Bienvenido, ${data.firstName} ${data.lastName}!</h2>
            <p>Gracias por registrarte en Cáritas.</p>
            <p>Estamos emocionados de tenerte en nuestra comunidad cafetalera.</p>
            <p>Saludos,<br>El equipo de Cáritas</p>
            token: ${token}
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `¡Bienvenido a Cáritas, ${data.firstName,'',  data.lastName}!`,
      html,
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string, name: string): Promise<EmailResponse> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; }
          .button { background: #D2691E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Hola ${name},</h2>
          <p>Haz clic aquí para restablecer tu contraseña:</p>
          <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
          <p>Este enlace expirará en 24 horas.</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Restablece tu contraseña - Cáritas',
      html,
    });
  }

 




async sendVerificationEmail(data: any, token: string): Promise<EmailResponse> {
  const to = data.email;
  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const loginUrl = `${process.env.ENV_FROM_ADDRESS}/login?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifica tu cuenta - Cáritas</title>
      <style>
        /* ESTILOS BÁSICOS COMPATIBLES */
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        
        .header {
          background-color: #9e2a2a;
          color: white;
          padding: 25px 20px;
          text-align: center;
        }
        
        .content {
          padding: 30px;
        }
        
        .title {
          color: #000000;
          font-size: 24px;
          margin-bottom: 20px;
          text-align: center;
        }
        
        .message {
          margin-bottom: 20px;
          font-size: 16px;
          color: #555555;
        }
        
        .info-box {
          background-color: #f8f9fa;
          padding: 20px;
          margin: 25px 0;
          border-left: 4px solid #9e2a2a;
          border-radius: 4px;
        }
        
        .footer {
          text-align: center;
          padding: 20px;
          background-color: #f5f5f5;
          color: #666666;
          font-size: 14px;
          border-top: 1px solid #e0e0e0;
        }
        
        .detail-row {
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eeeeee;
        }
        
        .detail-label {
          font-weight: bold;
          color: #666666;
          display: inline-block;
          width: 120px;
        }
        
        .detail-value {
          color: #333333;
        }
        
        /* RESPONSIVE */
        @media only screen and (max-width: 600px) {
          .container {
            width: 100%;
          }
          
          .content {
            padding: 20px 15px;
          }
          
          .detail-label {
            display: block;
            width: 100%;
            margin-bottom: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">Cáritas Bolivia</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Donde cada taza cuenta una historia</p>
        </div>
        
        <!-- Content -->
        <div class="content">
          <h2 class="title">¡Bienvenido a Cáritas, ${fullName}!</h2>
          
          <div class="message">
            <p>Nos complace enormemente darle la bienvenida a nuestra exclusiva comunidad de amantes del café. En <strong style="color: #9e2a2a;">Cáritas</strong>, nos dedicamos a ofrecer las mejores experiencias cafetaleras.</p>
          </div>
          
          <div class="message">
            <p>Para completar su registro y comenzar a explorar nuestro mundo de sabores, por favor haga clic en el siguiente botón:</p>
          </div>
          
          <!-- BOTÓN CON ESTILOS EN LÍNEA COMPLETOS -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="display: inline-block; 
                      width: 200px; 
                      margin: 0 auto; 
                      padding: 14px 24px; 
                      background-color: #9e2a2a; 
                      color: white; 
                      text-decoration: none; 
                      text-align: center; 
                      border-radius: 4px; 
                      font-weight: bold; 
                      font-size: 16px;
                      border: none;
                      cursor: pointer;">
              Confirmar Mi Registro
            </a>
          </div>
          <div style="margin: 15px 0; padding: 15px; background-color: #f0f0f0; border-radius: 4px; font-size: 14px;">
  <p style="margin: 0 0 5px 0; font-weight: bold;">Si el botón no funciona, copie y pegue este enlace en su navegador:</p>
  <p style="margin: 0; word-break: break-all; color: #9e2a2a;">${loginUrl}</p>
</div>
          <div class="info-box">
            <p style="margin: 0; font-size: 14px;"><strong>Nota importante:</strong> Este enlace es personal e intransferible. Si no solicitó este registro, por favor ignore este mensaje.</p>
          </div>
          
          <!-- Detalles del registro -->
          <div style="margin: 25px 0; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
            <h3 style="color: #9e2a2a; margin-top: 0; margin-bottom: 15px; font-size: 18px;">📋 Detalles de su registro</h3>
            
            <div class="detail-row">
              <span class="detail-label">Nombre completo:</span>
              <span class="detail-value">${fullName}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Correo electrónico:</span>
              <span class="detail-value">${data.email}</span>
            </div>
            
            <div class="detail-row" style="border-bottom: none; padding-bottom: 0; margin-bottom: 0;">
              <span class="detail-label">Fecha de registro:</span>
              <span class="detail-value">${new Date().toLocaleDateString('es-ES', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}</span>
            </div>
          </div>
          
          <div class="message">
            <p>Estamos aquí para ayudarle en cualquier momento. ¡No dude en contactarnos!</p>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <p style="margin: 0 0 5px 0;">Atentamente,</p>
            <p style="margin: 0; font-weight: bold; color: #9e2a2a;">El equipo de Cáritas</p>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Cáritas Bolivia. Todos los derechos reservados.</p>
          <p>Este es un mensaje automático, por favor no responda a este correo.</p>
          <div style="margin-top: 10px; font-size: 12px; color: #888888;">
            Por su seguridad, este enlace expirará en 24 horas.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return this.sendEmail({
    to,
    subject: `¡Bienvenido a Cáritas, ${fullName}! Complete su registro`,
    html,
  });
}

async sendAuctionWinNotification(
  buyerEmail: string, 
  buyerName: string, 
  coffeeLot: any, 
  winningBid: any, 
  auction: any,
  sellerName?: string 
): Promise<EmailResponse> {
  const to = buyerEmail;
  const subject = `¡Felicidades! Has ganado la subasta - ${coffeeLot.name}`;
  
  // Calcular valores
  const totalValue = winningBid.amount * (coffeeLot.quantityLbs || coffeeLot.quantity || 0);
  const seller = sellerName || coffeeLot.seller || 'Productor';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>¡Has ganado la subasta!</title>
      <style>
        /* ESTILOS BÁSICOS Y COMPATIBLES */
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        
        .header {
          background-color: #9e2a2a;
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        
        .content {
          padding: 30px;
        }
        
        .title {
          color: #000000;
          font-size: 24px;
          margin-bottom: 20px;
          text-align: center;
        }
        
        .message {
          margin-bottom: 20px;
          font-size: 16px;
          color: #555555;
        }
        
        .section {
          margin: 25px 0;
          padding: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 5px;
          background-color: #f9f9f9;
        }
        
        .section-title {
          color: #9e2a2a;
          font-size: 18px;
          margin-bottom: 15px;
          border-bottom: 2px solid #9e2a2a;
          padding-bottom: 5px;
        }
        
        .detail-row {
          display: table;
          width: 100%;
          margin-bottom: 10px;
        }
        
        .detail-label {
          display: table-cell;
          width: 40%;
          font-weight: bold;
          color: #666666;
          padding: 5px 0;
        }
        
        .detail-value {
          display: table-cell;
          width: 60%;
          padding: 5px 0;
        }
        
        .highlight {
          background-color: #9e2a2a;
          color: white;
          padding: 15px;
          text-align: center;
          margin: 20px 0;
          border-radius: 5px;
        }
        
        .amount {
          font-size: 28px;
          font-weight: bold;
          margin: 10px 0;
        }
        
        .footer {
          text-align: center;
          padding: 20px;
          background-color: #f5f5f5;
          color: #666666;
          font-size: 14px;
          border-top: 1px solid #e0e0e0;
        }
        
        .contact {
          background-color: #fff3e0;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
          text-align: center;
        }
        
        /* ESTILOS PARA TABLAS (más compatibles) */
        .table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        
        .table th {
          background-color: #f2f2f2;
          padding: 10px;
          text-align: left;
          border: 1px solid #ddd;
        }
        
        .table td {
          padding: 10px;
          border: 1px solid #ddd;
        }
        
        /* RESPONSIVE */
        @media only screen and (max-width: 600px) {
          .container {
            width: 100%;
          }
          
          .content {
            padding: 15px;
          }
          
          .detail-row {
            display: block;
          }
          
          .detail-label, .detail-value {
            display: block;
            width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">Cáritas Bolivia</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Subastas de Café de Especialidad</p>
        </div>
        
        <!-- Content -->
        <div class="content">
          <h2 class="title">¡Felicitaciones, ${buyerName}!</h2>
          
          <div class="message">
            <p>Nos complace informarte que <strong>has ganado la subasta</strong> del lote de café especial. Tu oferta fue la más competitiva y ahora este excepcional café es tuyo.</p>
          </div>
          
          <!-- Detalles del lote -->
          <div class="section">
            <h3 class="section-title">📋 Detalles del Lote Adquirido</h3>
            
            <div class="detail-row">
              <span class="detail-label">Lote de Café:</span>
              <span class="detail-value">${coffeeLot.name}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Productor:</span>
              <span class="detail-value">${seller}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Variedad:</span>
              <span class="detail-value">${coffeeLot.variety || 'No especificado'}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Puntaje de Taza:</span>
              <span class="detail-value">${coffeeLot.cupScore ? coffeeLot.cupScore + ' puntos' : 'No evaluado'}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Cantidad:</span>
              <span class="detail-value">${coffeeLot.quantityLbs ? coffeeLot.quantityLbs + ' lbs' : (coffeeLot.quantity || '0') + ' kg'}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Origen:</span>
              <span class="detail-value">${coffeeLot.region || ''} ${coffeeLot.country ? ', ' + coffeeLot.country : ''}</span>
            </div>
          </div>
          
          <!-- Oferta ganadora -->
          <div class="highlight">
            <h3 style="margin: 0 0 15px 0; color: white;">🏆 Oferta Ganadora</h3>
            
            <table class="table" style="background-color: rgba(255,255,255,0.1);">
              <tr>
                <th style="color: white; border-color: rgba(255,255,255,0.3);">Concepto</th>
                <th style="color: white; border-color: rgba(255,255,255,0.3);">Valor</th>
              </tr>
              <tr>
                <td style="color: white; border-color: rgba(255,255,255,0.3);">Precio por libra</td>
                <td style="color: white; border-color: rgba(255,255,255,0.3);">$${winningBid.amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color: white; border-color: rgba(255,255,255,0.3);">Cantidad total</td>
                <td style="color: white; border-color: rgba(255,255,255,0.3);">${coffeeLot.quantityLbs || coffeeLot.quantity || 0} ${coffeeLot.quantityLbs ? 'lbs' : 'kg'}</td>
              </tr>
              <tr>
                <td style="color: white; border-color: rgba(255,255,255,0.3); font-weight: bold;">VALOR TOTAL</td>
                <td style="color: white; border-color: rgba(255,255,255,0.3); font-weight: bold; font-size: 18px;">$${totalValue.toFixed(2)}</td>
              </tr>
            </table>
            
            <p style="margin: 15px 0 0 0; color: white; opacity: 0.9;">
              Subasta: <strong>${auction.title}</strong>
            </p>
          </div>
          
          <!-- Próximos pasos -->
          <div class="section">
            <h3 class="section-title">📝 Próximos Pasos</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 10px;"><strong>Procesamiento del Pago:</strong> Nuestro equipo se contactará contigo en las próximas 24 horas.</li>
              <li style="margin-bottom: 10px;"><strong>Documentación:</strong> Recibirás la documentación completa del lote.</li>
              <li style="margin-bottom: 10px;"><strong>Logística:</strong> Coordinaremos el envío según tu ubicación.</li>
              <li><strong>Seguimiento:</strong> Obtendrás un número de seguimiento una vez despachado.</li>
            </ul>
          </div>
          
          <!-- Contacto -->
          <div class="contact">
            <p style="margin: 0 0 10px 0;"><strong>¿Tienes preguntas?</strong></p>
            <p style="margin: 0 0 10px 0;">Nuestro equipo está disponible para ayudarte:</p>
            <p style="margin: 0;">
              <strong>Email:</strong> franzyapu20@gmail.com<br>
              <strong>Teléfono:</strong> +591 61139545
            </p>
          </div>
          
          <div class="message" style="text-align: center;">
            <p>Gracias por confiar en <strong style="color: #9e2a2a;">Cáritas</strong> para adquirir cafés de especialidad.</p>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Cáritas Bolivia. Todos los derechos reservados.</p>
          <p>Este es un mensaje automático, por favor no responda a este correo.</p>
          <p style="margin-top: 10px; font-size: 12px; color: #888888;">
            Calidad • Transparencia • Tradición
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return this.sendEmail({
    to,
    subject,
    html,
  });
}
}