import { Controller, Post, Body, Query, Get, Request, UnauthorizedException, ForbiddenException, InternalServerErrorException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { Public } from './decorators/public.decorator';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesEnum } from './roles.enum';


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

  // Reset de contraseña por ADMIN sobre OTRO usuario: el sistema genera la nueva
  // contraseña y la envía por email. Protegido por JWT (guard global) + rol ADMIN.
  @Post('admin-reset-password')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(RolesEnum.ADMIN)
  @ApiOperation({ summary: 'Restablecer contraseña de un usuario (solo ADMIN)' })
  @ApiBody({ type: AdminResetPasswordDto })
  @ApiResponse({ status: 201, description: 'Nueva contraseña enviada por email' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async adminResetPassword(
    @Body() dto: AdminResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.adminResetPassword(dto.userId);
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