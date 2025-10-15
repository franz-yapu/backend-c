import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  IsNumber, 
  IsOptional, 
  IsDateString, 
  IsBoolean
} from 'class-validator';
import { CoffeeQuality, CoffeeProcess } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateCoffeeLotDto {
  // Identificación básica
  @ApiProperty({ description: 'Coffee lot name (e.g., "CAFE TEODOSIO_ESPERANZA B")' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Producer name (e.g., "TEODOSIO JUMPIRI")', required: false })
  @IsString()
  @IsOptional()
  producerName?: string;

  @ApiProperty({ description: 'Optional description of the lot', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Indicates if it\'s specialty coffee', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isSpecialty?: boolean;

  // Información general del café
  @ApiProperty({ description: 'Cup score (e.g., 84.88)', required: false })
  @IsNumber()
  @IsOptional()
  cupScore?: number;

  @ApiProperty({ description: 'Coffee variety (e.g., "Catuai rojo")', required: false })
  @IsString()
  @IsOptional()
  variety?: string;

  @ApiProperty({ 
    description: 'Processing method (washed, natural, honey, etc.)',
    enum: CoffeeProcess,
    required: false 
  })
  @IsString()
  @IsOptional()
  process?: CoffeeProcess;

  @ApiProperty({ description: 'Drying system (e.g., "Mesa")', required: false })
  @IsString()
  @IsOptional()
  dryingSystem?: string;

  @ApiProperty({ description: 'Quantity in pounds (e.g., 384.43)', required: false })
  @IsNumber()
  @IsOptional()
  quantityLbs?: number;

  @ApiProperty({ description: 'Quantity in kilograms (e.g., 174.38)' })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ description: 'Position in competition or ranking (e.g., 17)', required: false })
  @IsNumber()
  @IsOptional()
  position?: number;

  // Origen del microlote
  @ApiProperty({ 
    description: 'Harvest date (format YYYY-MM-DD)',
    example: '2023-12-31'
  })
 

  @ApiProperty({ description: 'Harvest year (e.g., 2024)', required: false })
  @IsNumber()
  @IsOptional()
  harvestYear?: number;

  @ApiProperty({ description: 'Country of origin (e.g., "Bolivia")' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'Region/Department (e.g., "La Paz")', required: false })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({ description: 'Province (e.g., "Caranavi")', required: false })
  @IsString()
  @IsOptional()
  province?: string;

  @ApiProperty({ description: 'Municipality (e.g., "Caranavi")', required: false })
  @IsString()
  @IsOptional()
  municipality?: string;

  @ApiProperty({ description: 'Community (e.g., "Esperanza B")', required: false })
  @IsString()
  @IsOptional()
  community?: string;

  // Información técnica
  @ApiProperty({ description: 'Altitude in meters above sea level (e.g., 1750)', required: false })
  @IsNumber()
  @IsOptional()
  altitude?: number;

  @ApiProperty({ description: 'Production system (e.g., "Ecológico")', required: false })
  @IsString()
  @IsOptional()
  productionSystem?: string;

  @ApiProperty({ description: 'Type of shade (e.g., "Sikyle")', required: false })
  @IsString()
  @IsOptional()
  shadeType?: string;

  // Perfil en taza (flavor profile)
  @ApiProperty({ 
    description: 'Fragrance/Aroma description (e.g., "sultana, avellanas y chocolate")', 
    required: false 
  })
  @IsString()
  @IsOptional()
  fragranceAroma?: string;

  @ApiProperty({ description: 'Acidity description (e.g., "cítrica")', required: false })
  @IsString()
  @IsOptional()
  acidity?: string;

  @ApiProperty({ 
    description: 'Flavor description (e.g., "nibs de cacao, caramelo, nuez, miel, sedoso y cremoso")', 
    required: false 
  })
  @IsString()
  @IsOptional()
  flavor?: string;

  @ApiProperty({ description: 'Body description', required: false })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiProperty({ description: 'Aftertaste description', required: false })
  @IsString()
  @IsOptional()
  aftertaste?: string;

  // Información comercial
  @ApiProperty({ 
    description: 'Clasificación de calidad',
    enum: CoffeeQuality,
    required: false 
  })
  @IsString()
  @IsOptional()
  quality?: CoffeeQuality;

  @ApiProperty({ description: 'Suggested price', required: false })
  @IsNumber()
  @IsOptional()
  suggestedPrice?: number;

  @ApiProperty({ description: 'Moisture content percentage', required: false })
  @IsNumber()
  @IsOptional()
  moistureContent?: number;

  // Multimedia y documentos
  @ApiProperty({ description: 'References to images', required: false })
  @IsString()
  @IsOptional()
  images?: string;

  @ApiProperty({ description: 'References to documents', required: false })
  @IsString()
  @IsOptional()
  documents?: string;

  @ApiProperty({ description: 'Flavor profile chart/image reference', required: false })
  @IsString()
  @IsOptional()
  flavorChart?: string;

  // Relaciones
  @ApiProperty({ description: 'Seller user ID' })
  @IsString()
  @IsNotEmpty()
  sellerId: string;
}