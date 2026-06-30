import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Version,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { unlink } from 'fs/promises';
import { extname, join } from 'path';
import { BrandingService } from './branding.service';
import { CreateBrandingDto, UpdateBrandingDto } from './dto/branding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RolesEnum } from '../auth/roles.enum';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';

// Tipos de archivo permitidos para logos
const ALLOWED_LOGO_TYPES = /\.(jpg|jpeg|png|svg|ico|webp)$/i;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const LOGO_DESTINATIONS = ['main', 'favicon', 'email'] as const;

@ApiTags('Branding')
// Todo el controlador exige sesión válida y rol ADMIN, EXCEPTO la lectura
// pública de la config (marcada con @Public). Así un usuario no-admin no puede
// cambiar colores/logos/textos y dejar la plataforma inservible.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolesEnum.ADMIN)
@Controller({ path: 'branding', version: '1' })
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  // ─── PÚBLICO ────────────────────────────────────────────────────────────────

  @Get('config')
  @Public()
  @ApiOperation({ summary: 'Obtener configuración de branding activa (público)' })
  @ApiResponse({ status: 200, description: 'Configuración de branding activa' })
  getActiveConfig() {
    return this.brandingService.getActiveConfig();
  }

  // ─── ADMIN ───────────────────────────────────────────────────────────────────

  @Get('configs')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar todas las configuraciones de branding (Admin)' })
  findAll() {
    return this.brandingService.findAll();
  }

  @Get('config/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener configuración específica por ID (Admin)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.brandingService.findById(id);
  }

  @Post('config')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear nueva configuración de branding (Admin)' })
  @ApiResponse({ status: 201, description: 'Configuración creada' })
  create(@Body() dto: CreateBrandingDto, @Request() req: any) {
    const adminId = req.user?.userId ?? 'system';
    return this.brandingService.create(dto, adminId);
  }

  @Put('config/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar configuración de branding (Admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandingDto,
    @Request() req: any,
  ) {
    const adminId = req.user?.userId ?? 'system';
    return this.brandingService.update(id, dto, adminId);
  }

  @Post('config/activate/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Activar una configuración de branding (Admin)' })
  activate(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const adminId = req.user?.userId ?? 'system';
    return this.brandingService.activate(id, adminId);
  }

  @Delete('config/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar configuración de branding (Admin)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.brandingService.remove(id);
  }

  @Post('config/reset')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reset a valores por defecto (Admin)' })
  reset(@Request() req: any) {
    const adminId = req.user?.userId ?? 'system';
    return this.brandingService.resetToDefault(adminId);
  }

  @Get('history')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Historial de cambios de branding (Admin)' })
  getHistory() {
    return this.brandingService.getHistory();
  }

  @Post('logo/upload/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Subir logo (main | favicon | email) (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', enum: ['main', 'favicon', 'email'] },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'branding'),
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `logo-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_LOGO_TYPES.test(extname(file.originalname))) {
          return cb(new Error('Solo se permiten: JPG, PNG, SVG, ICO, WEBP'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: 'main' | 'favicon' | 'email',
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    // Validar `type` ANTES de tocar la BD. Sin esto, un type inválido hacía que
    // el service escribiera `{ [undefined]: url }` → Prisma 500, y además dejaba
    // el archivo que multer ya guardó como huérfano en disco.
    if (!LOGO_DESTINATIONS.includes(type as any)) {
      await unlink(file.path).catch(() => undefined);
      throw new BadRequestException(
        "El campo 'type' debe ser uno de: main, favicon, email",
      );
    }

    const url = `/uploads/branding/${file.filename}`;
    return this.brandingService.updateLogoUrl(id, type, url);
  }
}
