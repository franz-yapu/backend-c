import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiProperty({ example: 'Laptop HP EliteBook' })
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({ example: 'Laptop empresarial con 16GB RAM', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
