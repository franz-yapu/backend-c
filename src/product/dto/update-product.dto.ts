import { ApiProperty } from '@nestjs/swagger';
import { IsDecimal, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateProductDto {

  @ApiProperty({ example: 'Laptop HP EliteBook Pro', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Laptop empresarial con 32GB RAM', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1499.99, type: Number, required: false })
  @IsOptional()
  price?: number;

  @ApiProperty({ example: 30, required: false })
  @IsInt()
  @IsOptional()
  stock?: number;

  @ApiProperty({ example: 'file', required: false })
  @IsString()
  @IsOptional()
  file?: string;

  @ApiProperty({ example:' category Id'})
  @IsString()
   @IsOptional()
  categoryId?: string;

  @ApiProperty({ example:' marca Id'})
  @IsString()
  @IsOptional()
  marcaId?: string;
}