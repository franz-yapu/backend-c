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
          name: process.env.EMAIL_FROM_NAME || 'Café Altura',
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
            <h1>☕ Café Altura</h1>
          </div>
          <div class="content">
            <h2>¡Bienvenido, ${data.firstName,'',  data.lastName}!</h2>
            <p>Gracias por registrarte en Café Altura.</p>
            <p>Estamos emocionados de tenerte en nuestra comunidad cafetalera.</p>
            <p>Saludos,<br>El equipo de Café Altura</p>
            token: ${token}
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `¡Bienvenido a Café Altura, ${data.firstName,'',  data.lastName}!`,
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
      subject: 'Restablece tu contraseña - Café Altura',
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
          
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            text-align: center;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(139, 69, 19, 0.3);
          }
          
          .token-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #8B4513;
            margin: 25px 0;
            font-size: 14px;
            color: #666;
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
            <div class="logo">☕ Café Altura</div>
            <p>Donde cada taza cuenta una historia</p>
          </div>
          
          <div class="content">
            <h1 class="welcome-title">¡Bienvenido a Café Altura, ${fullName}!</h1>
            
            <div class="message">
              <p>Nos complace enormemente darle la bienvenida a nuestra exclusiva comunidad de amantes del café. En <span class="highlight">Café Altura</span>, nos dedicamos a ofrecer las mejores experiencias cafetaleras.</p>
            </div>
            
            <div class="message">
              <p>Para completar su registro y comenzar a explorar nuestro mundo de sabores, por favor haga clic en el siguiente botón:</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${loginUrl}" class="cta-button">
                Confirmar Mi Registro
              </a>
            </div>
            
            <div class="token-info">
              <p><strong>Nota importante:</strong> Este enlace es personal e intransferible. Si no solicitó este registro, por favor ignore este mensaje.</p>
            </div>
            
           
            
            <div class="message">
              <p>Estamos aquí para ayudarle en cualquier momento. ¡No dude en contactarnos!</p>
            </div>
            
            <div style="margin-top: 30px;">
              <p>Atentamente,</p>
              <p style="font-weight: 600; color: #8B4513;">El equipo de Café Altura</p>
            </div>
          </div>
          
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Café Altura. Todos los derechos reservados.</p>
            <p>Este es un mensaje automático, por favor no responda a este correo.</p>
            <div class="security-note">
              Por su seguridad, este enlace expirará en 24 horas.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `¡Bienvenido a Café Altura, ${fullName}! Complete su registro`,
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
          <div class="logo">☕ Café Altura</div>
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
            <p>Subasta: <strong>${auction.title}</strong></p>
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
              <strong>Email:</strong> contacto@cafealtura.com | 
              <strong>Teléfono:</strong> +1 (555) 123-4567
            </p>
          </div>
          
          <div class="message">
            <p>Gracias por confiar en <span class="highlight">Café Altura</span> para adquirir cafés de especialidad de la más alta calidad.</p>
          </div>
        </div>
        
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Café Altura. Todos los derechos reservados.</p>
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
}