import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkUpsertTranslationDto {
  @ApiProperty({
    description:
      'Mapa { clave: valor } de textos a sobreescribir. Un valor vacío borra el override.',
    example: { 'NAV.HOME': 'Inicio', 'FOOTER.COPYRIGHT': '© 2026 Cáritas' },
  })
  @IsObject()
  overrides: Record<string, string>;
}
