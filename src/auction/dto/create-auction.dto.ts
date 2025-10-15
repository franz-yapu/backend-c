import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  IsNumber, 
  IsOptional, 
  IsDateString,
  IsEnum, 
  IsDate,
  IsISO8601
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
  startDate: string;

  @ApiProperty({ description: 'Fecha y hora de cierre (ISO string)' })
   @IsISO8601({ strict: true }) // Más estricto que IsDateString
  @IsNotEmpty()
  endDate: string;



  @ApiProperty({ 
    description: 'Incremento mínimo entre pujas (ej. 0.25 USD)', 
    required: false 
  })
  @IsNumber()
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

  @ApiProperty({ description: 'ID del vendedor/productor' })
  @IsString()
  @IsNotEmpty()
  sellerId: string;
}