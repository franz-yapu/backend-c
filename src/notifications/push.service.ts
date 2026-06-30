import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

// Mensaje en el formato de la API de Expo Push.
type ExpoMessage = {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data: Record<string, unknown>;
  priority: 'high';
};

// Recibo (ticket) que devuelve Expo por cada mensaje.
type ExpoTicket = {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// Acepta 'ExponentPushToken[...]' y 'ExpoPushToken[...]'.
const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[.+\]$/;
// Límite de la API de Expo por request.
const CHUNK_SIZE = 100;

// Envío de notificaciones push al móvil (mobile-c) vía la API HTTP de Expo Push.
// Se llama directo con fetch (Node 20+) para evitar la dependencia ESM-only
// expo-server-sdk, incompatible con el build CommonJS de NestJS. Guarda los
// tokens por usuario (tabla push_tokens) y limpia los que Expo reporta como
// inválidos (DeviceNotRegistered). El disparo desde BidsGateway es best-effort:
// nunca debe bloquear ni romper la ruta crítica de pujas.
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private readonly prisma: PrismaService) {}

  private isExpoToken(token: string): boolean {
    return EXPO_TOKEN_RE.test(token);
  }

  // Registra (o refresca) el token de un dispositivo para el usuario autenticado.
  async registerToken(userId: string, token: string, platform?: string) {
    if (!this.isExpoToken(token)) {
      this.logger.warn(`Token de push con formato inválido: ${token}`);
      return;
    }
    // Un mismo token puede migrar de usuario (mismo dispositivo, otra cuenta):
    // upsert por token único y reasignamos userId.
    await this.prisma.pushToken.upsert({
      where: { token },
      create: { token, userId, platform },
      update: { userId, platform },
    });
  }

  // Elimina un token (logout). No falla si ya no existe.
  async removeToken(token: string) {
    await this.prisma.pushToken.deleteMany({ where: { token } });
  }

  // Envía una notificación a todos los dispositivos de un usuario.
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (tokens.length === 0) return;

    const messages: ExpoMessage[] = tokens.map((t) => ({
      to: t.token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      priority: 'high',
    }));

    for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
      const chunk = messages.slice(i, i + CHUNK_SIZE);
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(chunk),
        });
        const json = (await res.json()) as { data?: ExpoTicket[] };
        await this.handleInvalidTokens(chunk, json?.data);
      } catch (error) {
        this.logger.error('Error enviando push a Expo:', error);
      }
    }
  }

  // Borra tokens que Expo marca como no registrados (app desinstalada, etc.).
  private async handleInvalidTokens(
    messages: ExpoMessage[],
    tickets?: ExpoTicket[],
  ) {
    if (!Array.isArray(tickets)) return;
    const deadTokens: string[] = [];
    tickets.forEach((ticket, i) => {
      if (
        ticket?.status === 'error' &&
        ticket.details?.error === 'DeviceNotRegistered'
      ) {
        const to = messages[i]?.to;
        if (to) deadTokens.push(to);
      }
    });
    if (deadTokens.length > 0) {
      await this.prisma.pushToken.deleteMany({
        where: { token: { in: deadTokens } },
      });
      this.logger.log(`🧹 ${deadTokens.length} push token(s) inválido(s) eliminado(s)`);
    }
  }
}
