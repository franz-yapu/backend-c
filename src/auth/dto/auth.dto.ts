import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'Nombre del usuario', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ 
    example: 'USER',
    description: 'Nombre del rol (USER por defecto)',
    required: false 
  })

  @IsOptional()
  @IsString()
  roleName?: string;


   @ApiProperty({ example: '+59170000000', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

   @ApiProperty({ example: 'Nombre del usuario', required: false })
  @IsOptional()
  @IsString()
  companyName?: string;
}