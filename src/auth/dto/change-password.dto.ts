import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: "userId"  })
  userId: string; // o number, dependiendo de tu DB

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'password123' })
  currentPassword: string; // Contraseña actual para validación

  @IsString()
  @MinLength(6)
  @ApiProperty({ example: 'sample1' })
  newPassword: string; // Nueva contraseña
}