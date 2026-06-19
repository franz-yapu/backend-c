import { Controller, Post, Body, Query, Get, Request, UnauthorizedException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from './decorators/public.decorator';


@ApiTags('auth')
@Controller('auth')
export class AuthController {
  jwtService: any;
  prisma: any;
  constructor(private authService: AuthService) {}

@Public()
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

  @Public()
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar contraseña del usuario autenticado' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  @ApiResponse({ status: 401, description: 'Contraseña actual incorrecta' })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req: any,
  ): Promise<{ message: string }> {
    // El userId SIEMPRE del JWT, nunca del body: un usuario solo puede cambiar
    // SU propia contraseña (aunque ya estaba mitigado por exigir currentPassword).
    changePasswordDto.userId = req.user.userId;
    return this.authService.changePassword(changePasswordDto);
  }

  
@Public()
@Post('confirm')
async confirmAccount(@Body() body: { token: string }) {
  return this.authService.confirmAccount(body.token);
}

  // Endpoint público dedicado para el dropdown de roles del registro. Sustituye
  // al antiguo GET /dynamic/role (el CRUD genérico ya NO es público).
  @Public()
  @Get('roles')
  @ApiOperation({ summary: 'Listar roles disponibles (público, para registro)' })
  async getRoles() {
    return this.authService.getRoles();
  }

}