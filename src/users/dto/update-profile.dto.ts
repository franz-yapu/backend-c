import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Datos que el propio usuario autenticado puede editar de su perfil. NO incluye
// email, password ni rol: el email/rol son sensibles (los gestiona el admin) y
// la contraseña tiene su propio flujo (POST /auth/change-password).
export class UpdateProfileDto {
  @ApiProperty({ example: 'Juan', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Pérez', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'Café del Valle SRL', required: false })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ example: '+59170000000', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'La Paz', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Bolivia', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 'Av. Siempre Viva 123', required: false })
  @IsOptional()
  @IsString()
  address?: string;
}
