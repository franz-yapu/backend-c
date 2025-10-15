import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsNumber,
  IsEnum 
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { CreateTransactionDto } from './create-transaction.dto';

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {
  @ApiProperty({ 
    description: 'Fecha de pago confirmado', 
    required: false 
  })
  @IsOptional()
  paymentDate?: Date;
}