import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'La contraseña debe tener al menos 8 caracteres, con una letra y un número.',
  })
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


  @ApiProperty({ example: '+59170000000', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

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