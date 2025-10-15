import { Controller, Post, Body, Query, Get, UnauthorizedException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';


@ApiTags('auth')
@Controller('auth')
export class AuthController {
  jwtService: any;
  prisma: any;
  constructor(private authService: AuthService) {}

@Post('login')
@ApiOperation({ summary: 'Iniciar sesión' })
@ApiBody({ type: LoginDto })
async login(@Body() body: LoginDto) {
  try {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user);
  } catch (error) {
    throw error;
  }
}

  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Usuario registrado exitosamente' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'El email ya está registrado' 
  })
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Cambiar contraseña del usuario' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  @ApiResponse({ status: 401, description: 'Contraseña actual incorrecta' })
  async changePassword(@Body() changePasswordDto: ChangePasswordDto): Promise<{ message: string; }> {
    return this.authService.changePassword(changePasswordDto);
  }

  
@Post('confirm')
async confirmAccount(@Body() body: { token: string }) {
  return this.authService.confirmAccount(body.token); 
}

}