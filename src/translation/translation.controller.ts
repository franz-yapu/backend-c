import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TranslationService } from './translation.service';
import { BulkUpsertTranslationDto } from './dto/translation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RolesEnum } from '../auth/roles.enum';

@ApiTags('Translations')
// Todo exige ADMIN salvo la lectura pública de overrides por idioma (la usa el
// front en el arranque para fusionarlos sobre los JSON base).
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolesEnum.ADMIN)
@Controller({ path: 'translations', version: '1' })
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Todos los overrides agrupados por idioma (Admin)' })
  getAll() {
    return this.translationService.getAll();
  }

  @Get(':locale')
  @Public()
  @ApiOperation({ summary: 'Overrides de un idioma (público)' })
  getOverrides(@Param('locale') locale: string) {
    return this.translationService.getOverrides(locale);
  }

  @Put(':locale')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Upsert masivo de textos de un idioma (Admin)' })
  bulkUpsert(
    @Param('locale') locale: string,
    @Body() dto: BulkUpsertTranslationDto,
    @Request() req: any,
  ) {
    const adminId = req.user?.userId ?? 'system';
    return this.translationService.bulkUpsert(locale, dto.overrides, adminId);
  }

  @Delete(':locale/:key')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Resetear una clave a su texto base (Admin)' })
  removeKey(@Param('locale') locale: string, @Param('key') key: string) {
    return this.translationService.removeKey(locale, key);
  }
}
