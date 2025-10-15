import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateMarcaDto } from './create-marca.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateMarcaDto extends PartialType(CreateMarcaDto) {
     @ApiProperty({ example: 'nokia' })
     @IsString()
     @IsOptional()
      name?: string;
}
