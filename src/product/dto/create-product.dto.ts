import { ApiProperty } from '@nestjs/swagger';
import { IsDecimal, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Laptop HP EliteBook' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Laptop empresarial con 16GB RAM', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1299.99, type: Number })
  price: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  stock: number;

  @ApiProperty({ example: 'file', required: false })
  @IsString()
  @IsOptional()
  file?: string;

  @ApiProperty({ example:' category id'})
  @IsString()
  categoryId: string;

   @ApiProperty({ example:' marca id'})
   @IsString()
   marcaId: string;

}
