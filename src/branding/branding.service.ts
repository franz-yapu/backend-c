import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBrandingDto, UpdateBrandingDto } from './dto/branding.dto';

const DEFAULT_BRANDING = {
  primaryColor: '#CA3636',
  secondaryColor: '#FF9A24',
  successColor: '#10B981',
  warningColor: '#F59E0B',
  dangerColor: '#EF4444',
  infoColor: '#3B82F6',
  surfaceColor: '#FFFFFF',
  textColor: '#1F2937',
  themeMode: 'light',
  fontFamily: 'Inter',
  borderRadius: '4px',
  institutionName: 'Cáritas Bolivia',
  institutionShortName: 'Cáritas',
  isActive: true,
};

@Injectable()
export class BrandingService {
  constructor(private prisma: PrismaService) {}

  private readonly ACTIVE_ID = '00000000-0000-0000-0000-000000000001';

  /** GET /branding/config — público */
  async getActiveConfig() {
    try {
      // Intentar traer por ID fijo primero para consistencia absoluta
      let config = await this.prisma.branding.findUnique({
        where: { id: this.ACTIVE_ID },
      });

      if (!config) {
        // Fallback al último actualizado si el ID fijo no existe por alguna razón
        config = await this.prisma.branding.findFirst({
          orderBy: { updatedAt: 'desc' },
        });
      }

      const base = config || DEFAULT_BRANDING;
      
      const response = {
        ...base,
        id: (base as any).id || this.ACTIVE_ID,
        primaryColor: base.primaryColor || DEFAULT_BRANDING.primaryColor,
        secondaryColor: base.secondaryColor || DEFAULT_BRANDING.secondaryColor,
        successColor: base.successColor || DEFAULT_BRANDING.successColor,
        warningColor: base.warningColor || DEFAULT_BRANDING.warningColor,
        dangerColor: base.dangerColor || DEFAULT_BRANDING.dangerColor,
        infoColor: base.infoColor || DEFAULT_BRANDING.infoColor,
        surfaceColor: base.surfaceColor || DEFAULT_BRANDING.surfaceColor,
        textColor: base.textColor || DEFAULT_BRANDING.textColor,
        themeMode: base.themeMode || DEFAULT_BRANDING.themeMode,
        fontFamily: base.fontFamily || DEFAULT_BRANDING.fontFamily,
        borderRadius: base.borderRadius || DEFAULT_BRANDING.borderRadius,
      };

      return response;
    } catch (error) {
      console.error('Error in getActiveConfig:', error);
      return DEFAULT_BRANDING;
    }
  }

  /** GET /branding/config/:id — admin */
  async findById(id: string) {
    const config = await this.prisma.branding.findUnique({
      where: { id },
      include: { history: { orderBy: { changedAt: 'desc' }, take: 10 } },
    });
    if (!config) throw new NotFoundException(`Branding config ${id} not found`);
    return config;
  }

  /** GET /branding/configs — lista todas */
  async findAll() {
    return this.prisma.branding.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /** POST /branding/config */
  async create(dto: CreateBrandingDto, _adminId: string) {
    const { id, ...data } = dto as any;
    return this.prisma.branding.upsert({
      where: { id: this.ACTIVE_ID },
      update: { ...data, isActive: true },
      create: { ...data, id: this.ACTIVE_ID, isActive: true },
    });
  }

  /** PUT /branding/config/:id — actualiza y registra historial */
  async update(id: string, dto: UpdateBrandingDto, adminId: string) {
    // NO exigir que la fila exista: la primera vez que un admin guarda branding
    // en una BD nueva, la fila singleton aún no está creada (no se siembra). Antes
    // findById lanzaba 404 y rompía el guardado inicial. Leemos el estado actual
    // sin lanzar; el upsert de abajo crea la fila si hace falta.
    const current = await this.prisma.branding.findUnique({
      where: { id: this.ACTIVE_ID },
    });

    const { id: dtoId, ...data } = dto as any;

    const updated = await this.prisma.$transaction(async (tx) => {
      // El historial solo se registra si YA existía una config: brandHistory
      // tiene FK a branding.id, así que no se puede insertar antes de crear la
      // fila (en el primer guardado simplemente no hay "antes" que historiar).
      if (current) {
        await tx.brandHistory.create({
          data: {
            brandingId: this.ACTIVE_ID,
            changedBy: adminId,
            changes: {
              before: {
                primaryColor: current.primaryColor,
                secondaryColor: current.secondaryColor,
                themeMode: current.themeMode,
                fontFamily: current.fontFamily,
                borderRadius: current.borderRadius,
              },
              after: dto as any,
            } as any,
          },
        });
      }

      return tx.branding.upsert({
        where: { id: this.ACTIVE_ID },
        update: { ...data, isActive: true },
        create: { ...data, id: this.ACTIVE_ID, isActive: true },
      });
    });

    return updated;
  }

  /** POST /branding/config/activate/:id — activa una config */
  async activate(id: string, adminId: string) {
    // Desactivar todas las demás (opcional si solo manejamos ACTIVE_ID)
    await this.prisma.branding.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    return this.prisma.branding.update({
      where: { id },
      data: { isActive: true },
    });
  }

  /** DELETE /branding/config/:id */
  async remove(id: string) {
    const config = await this.findById(id);
    if (config.isActive) {
      // Antes era `throw new Error(...)`, que Nest convertía en un 500 crudo.
      // Como la única config real es el singleton activo, DELETE siempre daba 500.
      throw new ConflictException(
        'No se puede eliminar una configuración de branding activa',
      );
    }
    return this.prisma.branding.delete({ where: { id } });
  }

  /** POST /branding/config/reset — reset a valores por defecto */
  async resetToDefault(adminId: string) {
    await this.prisma.branding.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    return this.prisma.branding.upsert({
      where: { id: this.ACTIVE_ID },
      update: { ...DEFAULT_BRANDING, isActive: true },
      create: { ...DEFAULT_BRANDING, id: this.ACTIVE_ID, isActive: true },
    });
  }

  /** Guardar URL del logo después de upload */
  async updateLogoUrl(id: string, type: 'main' | 'favicon' | 'email', url: string) {
    const fieldMap = {
      main: 'logoUrl',
      favicon: 'faviconUrl',
      email: 'emailLogoUrl',
    };
    const field = fieldMap[type];
    // upsert (no update): si la fila singleton aún no existe (BD nueva donde el
    // admin sube el logo antes de guardar colores), la creamos con los valores
    // por defecto + la URL del logo, en vez de fallar con "record not found".
    return this.prisma.branding.upsert({
      where: { id: this.ACTIVE_ID },
      update: { [field]: url },
      create: { ...DEFAULT_BRANDING, id: this.ACTIVE_ID, isActive: true, [field]: url },
    });
  }

  /** GET /branding/history — historial de cambios */
  async getHistory() {
    return this.prisma.brandHistory.findMany({
      orderBy: { changedAt: 'desc' },
      include: { branding: true },
    });
  }
}
