import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateBidDto {
  @ApiProperty({ description: 'Valor de la puja (USD/kg)' })
  @IsNumber()
  @IsPositive() // > 0 (rechaza 0 y negativos; @IsNumber ya descarta NaN/Infinity).
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'ID de la subasta' })
  @IsString()
  @IsNotEmpty()
  auctionId: string;

  /**
   * Lo rellena SIEMPRE el servidor con el usuario del token (en el gateway y en
   * el controlador), así que el cliente no necesita mandarlo — y aunque lo
   * mande, se descarta: no se puede pujar en nombre de otro. Era obligatorio y
   * eso hacía fallar con 400 a quien pujara por HTTP sin incluirlo.
   */
  @ApiProperty({ description: 'ID del usuario (lo pone el servidor)', required: false })
  @IsString()
  @IsOptional()
  userId?: string;

 @ApiProperty({ description: 'ID del coffeeLotId' })
  @IsString()
  @IsNotEmpty()
  coffeeLotId: string;
   
}