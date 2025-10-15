import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;


   @ApiProperty({ example: 'companyName' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiProperty({ example: 'Juan', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Pérez', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;


  @ApiProperty({ example: '456456', required: false })
  @IsOptional()
  @IsNumber()
  phone?: number;

  @ApiProperty({ example: '456456', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: '456456', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: '456456', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: 'ADMIN',
    description: 'Nombre del rol (USER por defecto)',
    enum: ['ADMIN', 'SELLER', 'BUYER', 'GUEST'],
    required: false
  })
  @IsOptional()
  @IsString()
  roleName?: string;
}