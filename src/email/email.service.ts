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
          name: process.env.EMAIL_FROM_NAME || 'Cafe Alborada',
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
            <h1>☕ Cafe Alborada</h1>
          </div>
          <div class="content">
            <h2>¡Bienvenido, ${data.firstName,'',  data.lastName}!</h2>
            <p>Gracias por registrarte en Cafe Alborada.</p>
            <p>Estamos emocionados de tenerte en nuestra comunidad cafetalera.</p>
            <p>Saludos,<br>El equipo de Cafe Alborada</p>
            token: ${token}
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `¡Bienvenido a Cafe Alborada, ${data.firstName,'',  data.lastName}!`,
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
      subject: 'Restablece tu contraseña - Cafe Alborada',
      html,
    });
  }

 




  async sendVerificationEmail(data: any, token: string): Promise<EmailResponse> {
    const to = data.email;
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    const loginUrl = `${process.env.ENV_FROM_ADDRESS }/login?token=${token}`;
    
    const html = `
     <!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333333;
      background-color: #f8f9fa;
      padding: 20px;
    }
    
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    .header { 
      background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
      color: white; 
      padding: 30px 20px;
      text-align: center;
    }
    
    .logo {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .content {
      padding: 40px 30px;
    }
    
    .welcome-title {
      color: #8B4513;
      font-size: 24px;
      margin-bottom: 20px;
      font-weight: 600;
    }
    
    .message {
      margin-bottom: 25px;
      font-size: 16px;
      color: #555555;
      line-height: 1.7;
    }
    
    .notification-box {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #8B4513;
      margin: 25px 0;
      font-size: 16px;
      color: #666;
      text-align: center;
    }
    
    .footer {
      text-align: center;
      padding: 25px 20px;
      background: #f8f9fa;
      color: #666;
      font-size: 14px;
      border-top: 1px solid #e9ecef;
    }
    
    .security-note {
      font-size: 12px;
      color: #888;
      margin-top: 15px;
      font-style: italic;
    }
    
    .highlight {
      color: #8B4513;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">☕ ${process.env.EMAIL_FROM_NAME}</div>
      <p>Donde cada taza cuenta una historia</p>
    </div>
    
    <div class="content">
      <h1 class="welcome-title">¡Bienvenido a ${process.env.EMAIL_FROM_NAME}, ${fullName}!</h1>
      
      <div class="message">
        <p>Nos complace enormemente darle la bienvenida a nuestra exclusiva comunidad de amantes del café. En <span class="highlight">${process.env.EMAIL_FROM_NAME}</span>, nos dedicamos a ofrecer las mejores experiencias cafetaleras.</p>
      </div>
      
      <div class="notification-box">
        <p><strong>Su solicitud de registro está siendo procesada.</strong></p>
        <p>Recibirá una notificación por correo electrónico en las próximas <span class="highlight">24 horas</span> informándole si su registro ha sido validado.</p>
      </div>
      
      <div class="message">
        <p>Estamos aquí para ayudarle en cualquier momento. ¡No dude en contactarnos!</p>
      </div>
      
      <div style="margin-top: 30px;">
        <p>Atentamente,</p>
        <p style="font-weight: 600; color: #8B4513;">El equipo de ${process.env.EMAIL_FROM_NAME}</p>
      </div>
    </div>
    
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${process.env.EMAIL_FROM_NAME}. Todos los derechos reservados.</p>
      <p>Este es un mensaje automático, por favor no responda a este correo.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({
      to,
      subject: `¡Bienvenido a ${process.env.EMAIL_FROM_NAME}, ${fullName}! Complete su registro`,
      html,
    });
  }

  async sendAuctionWinNotification(
  buyerEmail: string, 
  buyerName: string, 
  coffeeLot: any, 
  winningBid: any, 
  auction: any
): Promise<EmailResponse> {
  const to = buyerEmail;
  const subject = `🎉 ¡Felicidades! Has ganado la subasta - ${coffeeLot.name}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333333;
          background-color: #f8f9fa;
          padding: 20px;
        }
        
        .container { 
          max-width: 650px; 
          margin: 0 auto; 
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .header { 
          background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
          color: white; 
          padding: 30px 20px;
          text-align: center;
        }
        
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .content {
          padding: 40px 30px;
        }
        
        .congrats-title {
          color: #2E7D32;
          font-size: 26px;
          margin-bottom: 20px;
          font-weight: 600;
          text-align: center;
        }
        
        .message {
          margin-bottom: 25px;
          font-size: 16px;
          color: #555555;
          line-height: 1.7;
        }
        
        .lot-details {
          background: #f8f9fa;
          padding: 25px;
          border-radius: 8px;
          border-left: 4px solid #8B4513;
          margin: 25px 0;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e9ecef;
        }
        
        .detail-label {
          font-weight: 600;
          color: #8B4513;
        }
        
        .detail-value {
          font-weight: 500;
          color: #333;
        }
        
        .winning-bid {
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin: 25px 0;
        }
        
        .bid-amount {
          font-size: 32px;
          font-weight: bold;
          margin: 10px 0;
        }
        
        .next-steps {
          background: #E3F2FD;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #2196F3;
          margin: 25px 0;
        }
        
        .steps-list {
          list-style: none;
          padding: 0;
        }
        
        .steps-list li {
          margin-bottom: 15px;
          padding-left: 25px;
          position: relative;
        }
        
        .steps-list li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #2196F3;
          font-weight: bold;
        }
        
        .footer {
          text-align: center;
          padding: 25px 20px;
          background: #f8f9fa;
          color: #666;
          font-size: 14px;
          border-top: 1px solid #e9ecef;
        }
        
        .contact-info {
          background: #FFF3E0;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
          text-align: center;
        }
        
        .highlight {
          color: #8B4513;
          font-weight: 600;
        }
        
        @media (max-width: 600px) {
          .content {
            padding: 20px 15px;
          }
          
          .detail-row {
            flex-direction: column;
          }
          
          .congrats-title {
            font-size: 22px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">☕ Café Alborada</div>
          <p>Subastas de Café de Especialidad</p>
        </div>
        
        <div class="content">
          <h1 class="congrats-title">¡Felicitaciones, ${buyerName}!</h1>
          
          <div class="message">
            <p>Nos complace informarte que <strong>has ganado la subasta</strong> del lote de café especial. Tu oferta fue la más competitiva y ahora este excepcional café es tuyo.</p>
          </div>
          
          <div class="lot-details">
            <h3 style="color: #8B4513; margin-bottom: 20px;">📦 Detalles del Lote Adquirido</h3>
            
            <div class="detail-row">
              <span class="detail-label">Lote de Café:</span>
              <span class="detail-value">${coffeeLot.name}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Productor:</span>
              <span class="detail-value">${coffeeLot.producerName || 'No especificado'}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Variedad:</span>
              <span class="detail-value">${coffeeLot.variety || 'No especificado'}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Proceso:</span>
              <span class="detail-value">${coffeeLot.process || 'No especificado'}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Puntaje de Taza:</span>
              <span class="detail-value">${coffeeLot.cupScore ? coffeeLot.cupScore + ' puntos' : 'No evaluado'}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Cantidad:</span>
              <span class="detail-value">${coffeeLot.quantityLbs ? coffeeLot.quantityLbs + ' lbs' : coffeeLot.quantity + ' kg'}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Origen:</span>
              <span class="detail-value">${coffeeLot.region || ''} ${coffeeLot.country ? ', ' + coffeeLot.country : ''}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Altitud:</span>
              <span class="detail-value">${coffeeLot.altitude ? coffeeLot.altitude + ' m.s.n.m' : 'No especificado'}</span>
            </div>
          </div>
          
          <div class="winning-bid">
            <h3 style="margin-bottom: 15px;">💰 Oferta Ganadora</h3>
            <div class="bid-amount">$${winningBid.amount.toFixed(2)}</div>
            <p>Subasta: <strong>${auction?.title}</strong></p>
          </div>
          
          <div class="next-steps">
            <h3 style="color: #2196F3; margin-bottom: 15px;">📝 Próximos Pasos</h3>
            <ul class="steps-list">
              <li><strong>Procesamiento del Pago:</strong> Nuestro equipo se contactará contigo en las próximas 24 horas para coordinar el pago.</li>
              <li><strong>Documentación:</strong> Recibirás la documentación completa del lote y certificaciones de calidad.</li>
              <li><strong>Logística:</strong> Coordinaremos la logística de envío según tu ubicación y preferencias.</li>
              <li><strong>Seguimiento:</strong> Obtendrás un número de seguimiento una vez despachado el lote.</li>
            </ul>
          </div>
          
          <div class="contact-info">
            <p><strong>📞 ¿Tienes preguntas?</strong></p>
            <p>Nuestro equipo de atención al cliente está disponible para ayudarte con cualquier consulta sobre tu compra.</p>
            <p style="margin-top: 10px;">
              <strong>Email:</strong> contacto@cafealborada.com | 
              <strong>Teléfono:</strong> +1 (555) 123-4567
            </p>
          </div>
          
          <div class="message">
            <p>Gracias por confiar en <span class="highlight">Café Alborada</span> para adquirir cafés de especialidad de la más alta calidad.</p>
          </div>
        </div>
        
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Café Alborada. Todos los derechos reservados.</p>
          <p>Este es un mensaje automático, por favor no responda a este correo.</p>
          <p style="margin-top: 10px; font-size: 12px; color: #888;">
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

async sendAccountActivationEmail(user: any) {
  const fullName = `${user.firstName} ${user.lastName}`;
  return this.sendEmail({
      to:user.email,
      subject: `¡Bienvenido a ${process.env.EMAIL_FROM_NAME}, ${fullName}! Complete su registro`,
     html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      min-height: 100vh;
    }
    
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .header { 
      background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
      color: white; 
      padding: 40px 20px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
      background-size: 20px 20px;
      animation: float 6s ease-in-out infinite;
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-10px) rotate(1deg); }
    }
    
    .logo {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 15px;
      position: relative;
      display: inline-block;
    }
    
    .logo::after {
      content: '';
      position: absolute;
      bottom: -5px;
      left: 25%;
      width: 50%;
      height: 3px;
      background: linear-gradient(90deg, transparent, #FFD700, transparent);
      border-radius: 2px;
    }
    
    .badge {
      display: inline-block;
      background: #FFD700;
      color: #8B4513;
      padding: 8px 20px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      margin-top: 10px;
      box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
    }
    
    .content {
      padding: 50px 40px;
      background: linear-gradient(to bottom, #ffffff, #fefaf6);
    }
    
    .welcome-title {
      color: #8B4513;
      font-size: 28px;
      margin-bottom: 25px;
      font-weight: 700;
      text-align: center;
      background: linear-gradient(135deg, #8B4513, #D2691E);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .message {
      margin-bottom: 30px;
      font-size: 16px;
      color: #555555;
      line-height: 1.7;
      text-align: center;
    }
    
    .success-icon {
      text-align: center;
      margin: 30px 0;
    }
    
    .success-icon .circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #10B981, #059669);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    
    .credentials-box {
      background: linear-gradient(135deg, #fef7f0, #faf3eb);
      border: 2px solid #e9d7c3;
      border-radius: 15px;
      padding: 30px;
      margin: 30px 0;
      box-shadow: 0 8px 25px rgba(139, 69, 19, 0.1);
      position: relative;
    }
    
    .credentials-box::before {
      content: '🔐';
      position: absolute;
      top: -15px;
      left: 30px;
      background: white;
      padding: 5px 15px;
      border-radius: 15px;
      font-size: 14px;
      border: 2px solid #e9d7c3;
    }
    
    .credential-item {
      display: flex;
      align-items: center;
      padding: 15px 0;
      border-bottom: 1px solid #f0e6d8;
    }
    
    .credential-item:last-child {
      border-bottom: none;
    }
    
    .credential-label {
      font-weight: 700;
      color: #8B4513;
      min-width: 140px;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .credential-value {
      background: white;
      padding: 12px 18px;
      border-radius: 10px;
      border: 1px solid #e9d7c3;
      font-family: 'Courier New', monospace;
      font-weight: 600;
      flex: 1;
      margin-left: 15px;
      color: #8B4513;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .security-note {
      background: linear-gradient(135deg, #fef3c7, #fef7ed);
      border-left: 4px solid #f59e0b;
      padding: 20px;
      border-radius: 10px;
      margin: 25px 0;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.1);
    }
    
    .steps-container {
      background: white;
      border-radius: 15px;
      padding: 25px;
      margin: 30px 0;
      box-shadow: 0 5px 20px rgba(0,0,0,0.08);
    }
    
    .step {
      display: flex;
      align-items: flex-start;
      margin-bottom: 20px;
      padding: 15px;
      border-radius: 10px;
      background: #fefaf6;
      transition: transform 0.2s ease;
    }
    
    .step:hover {
      transform: translateX(5px);
      background: #fdf5f0;
    }
    
    .step-number {
      background: linear-gradient(135deg, #8B4513, #A0522D);
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      margin-right: 15px;
      flex-shrink: 0;
      box-shadow: 0 4px 8px rgba(139, 69, 19, 0.3);
    }
    
    .step-content {
      flex: 1;
    }
    
    .step-title {
      font-weight: 600;
      color: #8B4513;
      margin-bottom: 5px;
    }
    
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
      color: white;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 700;
      font-size: 16px;
      margin: 20px 0;
      text-align: center;
      transition: all 0.3s ease;
      box-shadow: 0 8px 25px rgba(139, 69, 19, 0.4);
      border: none;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }
    
    .cta-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      transition: left 0.5s;
    }
    
    .cta-button:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 35px rgba(139, 69, 19, 0.5);
    }
    
    .cta-button:hover::before {
      left: 100%;
    }
    
    .footer {
      text-align: center;
      padding: 30px 20px;
      background: linear-gradient(135deg, #2d3748, #4a5568);
      color: #cbd5e0;
      font-size: 14px;
      border-top: 1px solid #4a5568;
    }
    
    .social-links {
      display: flex;
      justify-content: center;
      gap: 15px;
      margin: 15px 0;
    }
    
    .social-link {
      color: #cbd5e0;
      text-decoration: none;
      transition: color 0.3s ease;
    }
    
    .social-link:hover {
      color: #ffffff;
    }
    
    .highlight {
      background: linear-gradient(135deg, #8B4513, #D2691E);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 700;
    }
    
    .contact-info {
      margin-top: 25px;
      padding-top: 25px;
      border-top: 1px solid #e9d7c3;
      text-align: center;
    }
    
    @media (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      
      .credential-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
      
      .credential-value {
        margin-left: 0;
        width: 100%;
      }
      
      .cta-button {
        width: 100%;
        padding: 14px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">☕ ${process.env.EMAIL_FROM_NAME || 'Coffee Platform'}</div>
      <p>Donde cada taza cuenta una historia</p>
      <div class="badge">✅ Cuenta Verificada</div>
    </div>
    
    <div class="content">
      <h1 class="welcome-title">¡Bienvenido a la Familia, ${fullName || user.email}!</h1>
      
      <div class="success-icon">
        <div class="circle">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
            <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      
      <div class="message">
        <p>🎉 <strong>¡Excelente noticia!</strong> Su cuenta ha sido <span class="highlight">verificada y activada</span> exitosamente por nuestro equipo administrativo.</p>
        <p style="margin-top: 15px;">Ahora tiene acceso completo a todas las funcionalidades exclusivas de nuestra plataforma cafetalera.</p>
      </div>

      <div class="credentials-box">
        <h3 style="color: #8B4513; margin-bottom: 25px; text-align: center; font-size: 20px;">📋 Sus Credenciales de Acceso</h3>
        
        <div class="credential-item">
          <span class="credential-label">
            <span>📧</span> Email:
          </span>
          <span class="credential-value">${user.email}</span>
        </div>
        
        <div class="credential-item">
          <span class="credential-label">
            <span>🔑</span> Contraseña:
          </span>
          <span class="credential-value">La que estableció durante el registro</span>
        </div>
        

      </div>

      <div class="security-note">
        <strong>🛡️ Importante - Seguridad de su Cuenta:</strong><br>
        Por su protección, nunca comparta sus credenciales de acceso. Si olvida su contraseña, utilice la función "¿Olvidó su contraseña?" en la página de login para restablecerla de forma segura.
      </div>

      <div class="steps-container">
        <h4 style="color: #8B4513; margin-bottom: 20px; text-align: center; font-size: 18px;">🚀 Comience su Experiencia Cafetalera</h4>
        
        <div class="step">
        
          <div class="step-content">
            <div class="step-title">Acceda a la Plataforma</div>
            <div>Visite: <span class="highlight">${process.env.FRONTEND_URL || 'https://vertexhost.cloud/Coffee/index'}</span></div>
          </div>
        </div>
        
       
        
       
      </div>

      <div style="text-align: center; margin-top: 40px;">
        <a href="${process.env.FRONTEND_URL || 'https://vertexhost.cloud/Coffee/index'}" class="cta-button">
          🚀 Comenzar Ahora
        </a>
        <p style="color: #666; font-size: 14px; margin-top: 10px;">Acceso directo y seguro a su cuenta</p>
      </div>

      <div class="contact-info">
        <p style="margin-bottom: 15px;">💬 <strong>¿Necesita ayuda?</strong></p>
        <p>Nuestro equipo de soporte está disponible para asistirle en cualquier momento.</p>
        <p style="font-weight: 600; color: #8B4513; margin-top: 15px;">
          Con cariño,<br>El equipo de ${process.env.EMAIL_FROM_NAME || 'Coffee Platform'} ☕
        </p>
      </div>
    </div>
    
    <div class="footer">
     
      <p>&copy; ${new Date().getFullYear()} ${process.env.EMAIL_FROM_NAME || 'Coffee Platform'}. Todos los derechos reservados.</p>
      <p style="font-size: 12px; margin-top: 10px; opacity: 0.8;">
        Este es un mensaje automático, por favor no responda a este correo.<br>
        Para consultas, contacte a nuestro equipo de soporte.
      </p>
    </div>
  </div>
</body>
</html>

  `});
   
  };


}

