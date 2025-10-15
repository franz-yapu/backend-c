import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateBidDto {
  @ApiProperty({ description: 'Valor de la puja (USD/kg)' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'ID de la subasta' })
  @IsString()
  @IsNotEmpty()
  auctionId: string;

  @ApiProperty({ description: 'ID del usuario' })
  @IsString()
  @IsNotEmpty()
  userId: string;

 @ApiProperty({ description: 'ID del coffeeLotId' })
  @IsString()
  @IsNotEmpty()
  coffeeLotId: string;
   
}