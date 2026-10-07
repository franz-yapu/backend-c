import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsDateString,
  IsEnum,
  IsDate,
  IsISO8601,
  IsBoolean
} from 'class-validator';
import { AuctionStatus } from '@prisma/client';

export class CreateAuctionDto {
  @ApiProperty({ description: 'Título descriptivo de la subasta' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Detalles adicionales', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Fecha y hora de inicio (ISO string)' })
   @IsISO8601({ strict: true }) // Más estricto que IsDateString
  @IsNotEmpty()
  startDate: string | Date;

  @ApiProperty({ description: 'Fecha y hora de cierre (ISO string)' })
   @IsISO8601({ strict: true }) // Más estricto que IsDateString
  @IsNotEmpty()
  endDate: string | Date;



  @ApiProperty({ 
    description: 'Incremento mínimo entre pujas (ej. 0.25 USD)', 
    required: false 
  })
  @IsNumber()
  @IsPositive() // Debe ser > 0 si se envía (un incremento ≤ 0 rompe la equidad).
  @IsOptional()
  minIncrement?: number;

  @ApiProperty({ 
    description: 'Estado de la subasta',
    enum: AuctionStatus,
    default: 'DRAFT'
  })
  @IsEnum(AuctionStatus)
  @IsOptional()
  status?: AuctionStatus;

  @ApiProperty({ description: 'ID del lote de café en subasta' })
  @IsString()
  @IsNotEmpty()
  adminId: string;

  /**
   * Opcional: una subasta puede reunir lotes de varios productores, y el panel
   * del admin no lo pide. Era obligatorio, así que TODA creación desde el
   * formulario fallaba con 400 (el front no lo envía).
   */
  @ApiProperty({ description: 'ID del vendedor/productor', required: false })
  @IsString()
  @IsOptional()
  sellerId?: string;

  /**
   * Opcional también: lo lleva el servidor. Es la fecha de cierre original, la
   * que sirve para saber cuánto se extendió una subasta, así que la fija el
   * backend al crearla, no el cliente.
   */
  @ApiProperty({ description: 'Fecha de cierre original', required: false })
  @IsISO8601({ strict: true })
  @IsOptional()
  originalEndDate?: string;

   @ApiProperty({ 
    description: 'extended Times', 
    required: true 
  })
  @IsNumber()
  @IsOptional()
  extendedTimes: number;

   @ApiProperty({ 
    description: 'extension Enabled', 
    required: true 
  })
  @IsBoolean()
  @IsOptional()
  extensionEnabled: boolean;

   @ApiProperty({ 
    description: 'extension Minutes', 
    required: true 
  })
  @IsNumber()
  @IsOptional()
  extensionMinutes: number;
}