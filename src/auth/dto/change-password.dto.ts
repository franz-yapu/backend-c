import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsNotEmpty, IsOptional } from 'class-validator';

export class ChangePasswordDto {
  // El controller SIEMPRE lo sobrescribe con el userId del JWT; es opcional en el
  // body (si llega, se ignora). Evita un 400 espurio cuando el cliente no lo manda.
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'userId' })
  userId?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'password123' })
  currentPassword: string; // Contraseña actual para validación

  @IsString()
  @MinLength(6)
  @ApiProperty({ example: 'sample1' })
  newPassword: string; // Nueva contraseña
}