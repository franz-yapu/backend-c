import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

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

  @ApiProperty({ example: 'light', enum: ['light', 'dark', 'auto'], required: false })
  @IsOptional()
  @IsString()
  themeMode?: string;

  @ApiProperty({ example: 'Inter', required: false })
  @IsOptional()
  @IsString()
  fontFamily?: string;

  @ApiProperty({ example: '4px', required: false })
  @IsOptional()
  @IsString()
  borderRadius?: string;
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

  @ApiProperty({ example: 'light', enum: ['light', 'dark', 'auto'], required: false })
  @IsOptional()
  @IsString()
  themeMode?: string;

  @ApiProperty({ example: 'Inter', required: false })
  @IsOptional()
  @IsString()
  fontFamily?: string;

  @ApiProperty({ example: '4px', required: false })
  @IsOptional()
  @IsString()
  borderRadius?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
