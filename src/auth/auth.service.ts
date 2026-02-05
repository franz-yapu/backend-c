import { ConflictException, ForbiddenException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { User } from '@prisma/client';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EmailService } from 'src/email/email.service';


@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private emailService: EmailService,
  ) { }

  async validateUser(email: string, pass: string): Promise<any> {
  // Buscar usuario por email
  const user = await this.usersService.findOne(email);
  
  // Si no existe el usuario, lanzar excepción
  if (!user) {
    throw new UnauthorizedException({
      success: false,
      message: 'Credenciales incorrectas',
      code: 'INVALID_CREDENTIALS'
    });
  }

  // Verificar contraseña
  const isPasswordValid = await bcrypt.compare(pass, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedException({
      success: false,
      message: 'Credenciales incorrectas',
      code: 'INVALID_CREDENTIALS'
    });
  }

  // Si las credenciales son correctas pero la cuenta no está verificada, lanzar excepción
  if (!user.isVerified) {
    throw new ForbiddenException({
      success: false,
      message: 'Cuenta no verificada. Por favor, verifica tu correo electrónico antes de iniciar sesión.',
      code: 'ACCOUNT_NOT_VERIFIED',
      email: user.email
    });
  }

  // Si todo está correcto, retornar usuario sin password
  const { password, ...result } = user;
  return result;
}

  async login(user: any) {
    // Este método solo se llama si validateUser pasó todas las validaciones
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role.name,
      isVerified: user.isVerified
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: user,
      success: true,
      message: 'Inicio de sesión exitoso'
    };
  }

  async register(createUserDto: CreateUserDto) {
    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException('El correo ya está registrado');
    }

    // Crear usuario y enviar correos
    try {
      const user = await this.usersService.createUser(createUserDto);
      const token = this.jwtService.sign({ email: user.email }, { expiresIn: '744h' });
      console.log('Generated token for email confirmation:', token);

      await this.emailService.sendVerificationEmail(user, token);

      return {
        access_token: this.jwtService.sign({ sub: user.id, email: user.email }),
        message: 'Revisa tu correo para confirmar la cuenta',
        user: user
      };
    } catch (error) {
      throw new InternalServerErrorException('Error al registrar usuario');
    }
  }

  async changePassword(changePasswordDto: ChangePasswordDto) {
    const { userId, currentPassword, newPassword } = changePasswordDto;

    // 1. Validar usuario y contraseña actual
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    // 2. Hashear nueva contraseña y actualizar
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }


  async confirmAccount(token: string) {
    try {
      const { email } = this.jwtService.verify(token);
      await this.prisma.user.update({
        where: { email },
        data: { isVerified: true },
      });
      return { confirm: true, message: 'Cuenta confirmada exitosamente' };
    } catch (error) {
      /* throw new UnauthorizedException('Token inválido o expirado'); */
      return { confirm: false, message: 'Token inválido o expirado' };

    }
  }

  async validateUserById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

}
