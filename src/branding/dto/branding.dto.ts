import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
// Acepta 0, o un número (con decimales) seguido de unidad CSS válida: 8px, 0.5rem, 50%.
const BORDER_RADIUS_REGEX = /^(0|\d{1,3}(\.\d+)?(px|rem|em|%))$/;
const THEME_MODES = ['light', 'dark', 'auto'];

export class CreateBrandingDto {
  @ApiProperty({ example: '#CA3636' })
  @IsString()
  @Matches(HEX_REGEX)
  primaryColor: string;

  @ApiProperty({ example: '#FF9A24' })
  @IsString()
  @Matches(HEX_REGEX)
  secondaryColor: string;

  @ApiProperty({ example: '#10B981', required: false })
  @IsOptional()
  @IsString()
  @Matches(HEX_REGEX)
  successColor?: string;

  @ApiProperty({ example: '#EF4444', required: false })
  @IsOptional()
  @IsString()
  @Matches(HEX_REGEX)
  dangerColor?: string;

  @ApiProperty({ example: '#F59E0B', required: false })
  @IsOptional()
  @IsString()
  @Matches(HEX_REGEX)
  warningColor?: string;

  @ApiProperty({ example: '#3B82F6', required: false })
  @IsOptional()
  @IsString()
  @Matches(HEX_REGEX)
  infoColor?: string;

  @ApiProperty({ example: '#FFFFFF', required: false })
  @IsOptional()
  @IsString()
  @Matches(HEX_REGEX)
  surfaceColor?: string;

  @ApiProperty({ example: '#1F2937', required: false })
  @IsOptional()
  @IsString()
  @Matches(HEX_REGEX)
  textColor?: string;

  @ApiProperty({ example: 'light', enum: THEME_MODES, required: false })
  @IsOptional()
  @IsString()
  @IsIn(THEME_MODES)
  themeMode?: string;

  @ApiProperty({ example: 'Inter', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  fontFamily?: string;

  @ApiProperty({ example: '4px', required: false })
  @IsOptional()
  @IsString()
  @Matches(BORDER_RADIUS_REGEX, {
    message: 'borderRadius debe ser 0 o un valor con unidad CSS (ej. 8px, 0.5rem, 50%)',
  })
  borderRadius?: string;

  @ApiProperty({ example: 'Cáritas Bolivia', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  institutionName?: string;

  @ApiProperty({ example: 'Cáritas', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  institutionShortName?: string;
}

export class UpdateBrandingDto {
  @ApiProperty({ example: '#CA3636', required: false })
  @IsOptional()
  @IsString()
  @Matches(HEX_REGEX)
  primaryColor?: string;

  @ApiProperty({ example: '#FF9A24', required: false })
  @IsOptional()
  @IsString()
  @Matches(HEX_REGEX)
  secondaryColor?: string;

  @ApiProperty({ example: '#10B981', required: false })
  @IsOptional()
  @IsString()
  @Matches(HEX_REGEX)
  successColor?: string;

  @ApiProperty({ example: '#EF4444', required: false })
  @IsOptional()
  @IsString()
  @Matches(HEX_REGEX)
  dangerColor?: string;

  @ApiProperty({ example: '#F59E0B', required: false })
  @IsOptional()
  @IsString()
  @Matches(HEX_REGEX)
  warningColor?: string;

  @ApiProperty({ example: '#3B82F6', required: false })
  @IsOptional()
  @IsString()
  @Matches(HEX_REGEX)
  infoColor?: string;

  @ApiProperty({ example: '#FFFFFF', required: false })
  @IsOptional()
  @IsString()
  @Matches(HEX_REGEX)
  surfaceColor?: string;

  @ApiProperty({ example: '#1F2937', required: false })
  @IsOptional()
  @IsString()
  @Matches(HEX_REGEX)
  textColor?: string;

  @ApiProperty({ example: 'light', enum: THEME_MODES, required: false })
  @IsOptional()
  @IsString()
  @IsIn(THEME_MODES)
  themeMode?: string;

  @ApiProperty({ example: 'Inter', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  fontFamily?: string;

  @ApiProperty({ example: '4px', required: false })
  @IsOptional()
  @IsString()
  @Matches(BORDER_RADIUS_REGEX, {
    message: 'borderRadius debe ser 0 o un valor con unidad CSS (ej. 8px, 0.5rem, 50%)',
  })
  borderRadius?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 'Cáritas Bolivia', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  institutionName?: string;

  @ApiProperty({ example: 'Cáritas', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  institutionShortName?: string;
}
