import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsDateString 
} from 'class-validator';
import { CoffeeQuality, CoffeeProcess } from '@prisma/client';
import { PartialType } from '@nestjs/swagger';
import { CreateCoffeeLotDto } from './create-caffee-lot.dto';


export class UpdateCoffeeLotDto extends PartialType(CreateCoffeeLotDto) {
  @ApiProperty({ description: 'Disponibilidad', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'URL de imágenes', required: false })
  @IsString()
  @IsOptional()
  images?: string;

  @ApiProperty({ description: 'Documentos asociados', required: false })
  @IsString()
  @IsOptional()
  documents?: string;
}