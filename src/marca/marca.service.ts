import { Injectable } from '@nestjs/common';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { UpdateMarcaDto } from './dto/update-marca.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MarcaService {
  constructor(private prisma: PrismaService){
    
  }
  create(createMarcaDto: CreateMarcaDto) {
    return this.prisma.marca.create({
      data: {
        ...createMarcaDto// Convertir a string para Decimal de Prisma
      },
    })
  }

  findAll() {
     return this.prisma.marca.findMany();
  }

  findOne(id: string) {
    return this.prisma.marca.findUnique({
      where: { id },
    });
  }

  update(id: string, updateMarcaDto: UpdateMarcaDto) {
    const data: any = { ...updateMarcaDto };
    return this.prisma.marca.update({
      where: { id },
      data,
    });
  }

   remove(id: string) {
    return this.prisma.product.delete({
      where: { id },
     });
    }
}
