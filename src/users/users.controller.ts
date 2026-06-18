import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from '@prisma/client';
import { RolesEnum } from 'src/auth/roles.enum';

@ApiTags('users')
@ApiBearerAuth()
// Autenticación por el guard global; RolesGuard añade autorización por rol.
// Los métodos con @Roles(ADMIN) son solo admin; los que no lo llevan (p. ej.
// GET /users/me) quedan abiertos a cualquier usuario autenticado.
@UseGuards(RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Post()
  // Crear usuarios con rol arbitrario (incl. ADMIN) es SOLO para admins.
  @Roles(RolesEnum.ADMIN)
  @ApiOperation({ summary: 'Crear nuevo usuario (solo ADMIN)' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  // Perfil del usuario autenticado: el id sale del JWT, NUNCA del cliente.
  // Sustituye al uso de /dynamic/user para que el comprador lea sus propios datos.
  @Get('me')
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  async me(@Request() req: any) {
    return this.usersService.findById(req.user.userId);
  }

  @Get()
  @Roles(RolesEnum.ADMIN)
  @ApiOperation({ summary: 'Listar todos los usuarios (solo ADMIN)' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(RolesEnum.ADMIN)
  @ApiOperation({ summary: 'Obtener usuario por ID (solo ADMIN)' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del usuario',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Usuario encontrado',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Usuario no encontrado',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Delete(':id')
  @Roles(RolesEnum.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar usuario (solo ADMIN)' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del usuario a eliminar',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Usuario eliminado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'No autorizado',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.deleteUser(id);
  }

  @Get('roles/list')
  @Roles(RolesEnum.ADMIN)
  @ApiOperation({ summary: 'Obtener todos los roles disponibles (solo ADMIN)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de roles obtenida exitosamente',
  })
  async getRoles() {
    return this.usersService.getRoles();
  }
}