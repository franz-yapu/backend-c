import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async createUser(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    roleName?: string;
    companyName?: string;
    phone: number;
    city?: string;
    country?: string;
    address?: string;
  }) {
    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Obtener el rol (USER por defecto si no se especifica)
    const role = await this.prisma.role.findUnique({
      where: { name: data.roleName || 'USER' },
    });

    if (!role) {
      throw new Error('Rol especificado no existe');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);


    return this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        roleId: role.id,
        companyName: data.companyName,
        phone: data.phone,
        city: data.city,
        country: data.country,
        address: data.address,

      },
      include: {
        role: true,
      },
    });
  }


  // Actualizar otros métodos para usar string en lugar de number
  async findOne(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
      // Login necesita el hash para bcrypt.compare (password se omite globalmente).
      omit: { password: false },
    });
  }

  async findById(id: string) { // Ahora recibe string
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  async updateUser(id: string, data: {
    firstName?: string;
    lastName?: string;
    roleId?: string
  }) {
    const updateData: any = {};

    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.roleId) updateData.roleId = data.roleId;

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });
  }

  async deleteUser(id: string) { // Ahora recibe string
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      include: { role: true },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getRoles() {
    return this.prisma.role.findMany();
  }
}