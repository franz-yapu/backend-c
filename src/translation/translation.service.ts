import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Idiomas soportados por la plataforma (deben coincidir con assets/i18n del front).
export const SUPPORTED_LOCALES = ['es', 'en'];

@Injectable()
export class TranslationService {
  constructor(private readonly prisma: PrismaService) {}

  private assertLocale(locale: string): void {
    if (!SUPPORTED_LOCALES.includes(locale)) {
      throw new BadRequestException(
        `Idioma no soportado: ${locale}. Permitidos: ${SUPPORTED_LOCALES.join(', ')}`,
      );
    }
  }

  /** Mapa plano { "NAV.HOME": "Inicio", ... } de los overrides de un idioma. */
  async getOverrides(locale: string): Promise<Record<string, string>> {
    this.assertLocale(locale);
    const rows = await this.prisma.translationOverride.findMany({
      where: { locale },
      select: { key: true, value: true },
    });
    return rows.reduce<Record<string, string>>((acc, r) => {
      acc[r.key] = r.value;
      return acc;
    }, {});
  }

  /** Todos los overrides agrupados por idioma, para el editor del admin. */
  async getAll(): Promise<Record<string, Record<string, string>>> {
    const result: Record<string, Record<string, string>> = {};
    for (const locale of SUPPORTED_LOCALES) {
      result[locale] = await this.getOverrides(locale);
    }
    return result;
  }

  /**
   * Upsert masivo de overrides de un idioma. Un valor vacío/whitespace borra el
   * override (la clave vuelve al texto base del JSON). Devuelve el mapa resultante.
   */
  async bulkUpsert(
    locale: string,
    overrides: Record<string, string>,
    adminId: string,
  ): Promise<Record<string, string>> {
    this.assertLocale(locale);
    if (!overrides || typeof overrides !== 'object') {
      throw new BadRequestException('overrides debe ser un objeto { clave: valor }');
    }

    const entries = Object.entries(overrides);
    const toDelete = entries.filter(([, v]) => !v || !String(v).trim()).map(([k]) => k);
    const toUpsert = entries.filter(([, v]) => v && String(v).trim());

    await this.prisma.$transaction([
      ...(toDelete.length
        ? [
            this.prisma.translationOverride.deleteMany({
              where: { locale, key: { in: toDelete } },
            }),
          ]
        : []),
      ...toUpsert.map(([key, value]) =>
        this.prisma.translationOverride.upsert({
          where: { locale_key: { locale, key } },
          create: { locale, key, value, updatedBy: adminId },
          update: { value, updatedBy: adminId },
        }),
      ),
    ]);

    return this.getOverrides(locale);
  }

  /** Borra un override puntual (la clave vuelve al texto base). */
  async removeKey(locale: string, key: string): Promise<{ removed: boolean }> {
    this.assertLocale(locale);
    const res = await this.prisma.translationOverride.deleteMany({
      where: { locale, key },
    });
    return { removed: res.count > 0 };
  }
}
