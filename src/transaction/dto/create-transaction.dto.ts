import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  IsNumber, 
  IsOptional,
  IsEnum 
} from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({ description: 'Monto total de la transacción' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'ID de la subasta relacionada' })
  @IsString()
  @IsNotEmpty()
  auctionId: string;

  @ApiProperty({ description: 'ID del comprador' })
  @IsString()
  @IsNotEmpty()
  buyerId: string;

  @ApiProperty({ description: 'ID del vendedor' })
  @IsString()
  @IsNotEmpty()
  sellerId: string;

  @ApiProperty({ 
    description: 'Estado de la transacción',
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
    default: 'PENDING',
    required: false
  })
  @IsOptional()
  @IsEnum(['PENDING', 'COMPLETED', 'FAILED'])
  status?: string;

   @ApiProperty({ description: 'ID de la subasta relacionada' })
  @IsString()
  @IsNotEmpty()
  coffeeLotId: string;
}