// src/dashboard/dto/dashboard-filters.dto.ts
import { IsOptional, IsDateString, IsEnum, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class DashboardFiltersDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  variety?: string;

  @IsOptional()
  @IsString()
  process?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  year?: number;
}