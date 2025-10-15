import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class AddCoffeeLotToAuctionDto {
  @ApiProperty({
    description: 'ID de la subasta',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  auctionId: string;

  @ApiProperty({
    description: 'ID del lote de café',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  coffeeLotId: string;

  @ApiProperty({
    description: 'Precio inicial de la subasta',
    example: 100.50,
    minimum: 0
  })
   @IsNumber()
  @IsOptional()
  @Min(0)
  startingPrice: number;

  @ApiProperty({
    description: 'Precio de reserva (opcional)',
    example: 150.75,
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reservePrice?: number;
}