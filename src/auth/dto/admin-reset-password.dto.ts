import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AdminResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'userId', description: 'Id del usuario al que se le restablece la contraseña' })
  userId: string;
}
