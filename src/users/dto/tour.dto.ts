import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Estado del tour del comprador. `visto` suma una vez (lo llama el front cuando
 * el tour termina o se cierra); `noMostrarMas` lo apaga para siempre.
 */
export class TourDto {
  @ApiPropertyOptional({ description: 'Suma una visualización del tour' })
  @IsOptional()
  @IsBoolean()
  visto?: boolean;

  @ApiPropertyOptional({ description: 'No volver a mostrar el tour' })
  @IsOptional()
  @IsBoolean()
  noMostrarMas?: boolean;
}
