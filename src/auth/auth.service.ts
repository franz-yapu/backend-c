import { ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { User } from '@prisma/client';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EmailService } from 'src/email/email.service';

// Roles que un usuario puede auto-asignarse en el registro público.
// NUNCA incluye ADMIN: un admin solo lo crea otro admin vía POST /users.
export const SELF_REGISTRATION_ROLES = ['BUYER', 'SELLER', 'GUEST'];

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

  // Si la cuenta fue desactivada por un administrador, bloquear el acceso
  // (independiente de la verificación de email).
  if (!user.isActive) {
    throw new ForbiddenException({
      success: false,
      message: 'Cuenta desactivada. Contacta con el administrador.',
      code: 'ACCOUNT_DISABLED',
      email: user.email
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
    // Anti escalada de privilegios: el rol del registro público NO puede ser
    // ADMIN. Si piden ADMIN se rechaza; cualquier otro valor fuera de la lista
    // permitida (o vacío) cae a 'BUYER'.
    const requested = (createUserDto.roleName || '').trim().toUpperCase();
    if (requested === 'ADMIN') {
      throw new ForbiddenException('No puedes registrarte con el rol ADMIN');
    }
    const roleName = SELF_REGISTRATION_ROLES.includes(requested)
      ? requested
      : 'BUYER';
    createUserDto = { ...createUserDto, roleName };

    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException('El correo ya está registrado');
    }

    // Crear usuario. Los errores de createUser (p. ej. email duplicado →
    // ConflictException 409) propagan tal cual, NO se convierten en 500.
    const created = await this.usersService.createUser(createUserDto);

    // Auto-verificación del registro público: el comprador queda verificado al
    // instante y puede iniciar sesión sin confirmar el correo. Se decidió así
    // porque el flujo por email era frágil (dependía del front web, del cert TLS
    // y del SMTP) y dejaba a compradores sin poder entrar. Si en el futuro se
    // quiere reactivar la confirmación por correo, restaurar isVerified:false +
    // sendVerificationEmail (ver confirmAccount()).
    const user = await this.prisma.user.update({
      where: { id: created.id },
      data: { isVerified: true },
      include: { role: true },
    });

    // Correo de bienvenida BEST-EFFORT: si el SMTP falla, el registro NO debe
    // fallar (la cuenta ya quedó utilizable).
    try {
      await this.emailService.sendWelcomeEmail(
        user,
        this.jwtService.sign({ email: user.email }, { expiresIn: '48h' }),
      );
    } catch (e: any) {
      console.error('No se pudo enviar el correo de bienvenida:', e?.message || e);
    }

    // NO se devuelve token de sesión: el usuario inicia sesión normalmente con
    // sus credenciales (ya verificado).
    return {
      message: 'Cuenta creada. Ya puedes iniciar sesión.',
      user: user,
    };
  }

  async changePassword(changePasswordDto: ChangePasswordDto) {
    const { userId, currentPassword, newPassword } = changePasswordDto;

    // 1. Validar usuario y contraseña actual (password se omite globalmente:
    //    aquí se reincluye para poder comparar el hash).
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      omit: { password: false },
    });

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    // 2. Hashear nueva contraseña y actualizar. passwordChangedAt invalida los
    //    tokens emitidos antes de este instante (ver JwtStrategy.validate).
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, passwordChangedAt: new Date() },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  /**
   * Restablecimiento de contraseña por un ADMINISTRADOR. El sistema genera una
   * contraseña aleatoria (el admin NO la elige ni la conoce), la guarda hasheada
   * e invalida las sesiones previas (passwordChangedAt). La nueva contraseña se
   * envía al usuario por email. La autorización ADMIN se exige en el controller.
   */
  async adminResetPassword(targetUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const newPassword = this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // El email se envía ANTES de tocar la contraseña: si el envío falla, no se
    // cambia nada y el usuario conserva su contraseña actual (evita dejarlo sin
    // acceso ni forma de conocer la nueva). sendEmail NO lanza: devuelve
    // { success } y aquí se comprueba explícitamente.
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    const emailResult = await this.emailService.sendNewPasswordEmail(user.email, newPassword, fullName);
    if (!emailResult?.success) {
      throw new InternalServerErrorException(
        'No se pudo enviar el correo con la nueva contraseña; la contraseña no fue modificada.',
      );
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { password: hashedPassword, passwordChangedAt: new Date() },
    });

    return { message: 'Se envió la nueva contraseña al correo del usuario' };
  }

  // Contraseña aleatoria legible (sin caracteres ambiguos) usando CSPRNG.
  private generateRandomPassword(length = 12): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const bytes = randomBytes(length);
    let password = '';
    for (let i = 0; i < length; i++) {
      password += alphabet[bytes[i] % alphabet.length];
    }
    return password;
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

  /**
   * Roles disponibles para el dropdown público de registro. Excluye ADMIN (y
   * cualquier rol no auto-asignable) para que ni siquiera se pueda elegir.
   */
  async getRoles() {
    return this.prisma.role.findMany({
      where: { name: { in: SELF_REGISTRATION_ROLES } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

}
