import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterTokenDto {
  // Token de Expo: 'ExponentPushToken[xxxxxxxx]'.
  @IsString()
  @MinLength(10)
  @MaxLength(255)
  token: string;

  @IsOptional()
  @IsString()
  @IsIn(['ios', 'android'])
  platform?: string;
}
