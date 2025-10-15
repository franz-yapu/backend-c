import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CrudGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  private validateModelExists(modelName: string) {
    if (!this.prisma[modelName]) {
      throw new NotFoundException(`El modelo '${modelName}' no existe en la base de datos`);
    }
    return true;
  }

  private validateFields(modelName: string, data: any, isUpdate: boolean = false) {
    const modelMeta = this.getModelMeta(modelName);
    
    // Verificar campos requeridos
    modelMeta.fields.forEach(field => {
      if (field.isRequired && !isUpdate) {
        if (data[field.name] === undefined || data[field.name] === null) {
          throw new BadRequestException(`El campo '${field.name}' es requerido en ${modelName}`);
        }
      }

      // Validar tipos de datos
      if (data[field.name] !== undefined && data[field.name] !== null) {
        this.validateFieldType(field, data[field.name], modelName);
      }
    });
  }

  private getModelMeta(modelName: string): Prisma.DMMF.Model {
    const modelMeta = (this.prisma as any)._dmmf?.models.find(
      (model: Prisma.DMMF.Model) => model.name === modelName,
    );
    
    if (!modelMeta) {
      throw new NotFoundException(`Modelo '${modelName}' no encontrado`);
    }
    
    return modelMeta;
  }

  private validateFieldType(field: Prisma.DMMF.Field, value: any, modelName: string) {
    switch (field.type) {
      case 'String':
        if (typeof value !== 'string') {
          throw new BadRequestException(`El campo '${field.name}' en ${modelName} debe ser texto (string)`);
        }
        break;
      case 'Int':
      case 'Float':
      case 'Decimal':
        if (isNaN(Number(value))) {
          throw new BadRequestException(`El campo '${field.name}' en ${modelName} debe ser un número`);
        }
        break;
      case 'Boolean':
        if (typeof value !== 'boolean') {
          throw new BadRequestException(`El campo '${field.name}' en ${modelName} debe ser verdadero o falso (boolean)`);
        }
        break;
      // Puedes añadir más validaciones para otros tipos según necesites
    }
  }

  private handlePrismaError(error: any, modelName: string) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          const field = (error.meta as any)?.target?.join(', ');
          throw new BadRequestException(`Ya existe un registro en ${modelName} con el valor duplicado para el campo: ${field}`);
        case 'P2003':
          throw new BadRequestException(`Violación de clave foránea: ${error.message}`);
        case 'P2016':
          throw new BadRequestException(`Error de consulta: ${error.message}`);
        case 'P2025':
          throw new NotFoundException(`Registro no encontrado en ${modelName}`);
        default:
          throw new BadRequestException(`Error de base de datos: ${error.message}`);
      }
    }
    throw error;
  }

  async findAll(modelName: string) {
    this.validateModelExists(modelName);
    try {
      return await this.prisma[modelName].findMany();
    } catch (error) {
      throw new BadRequestException(`Error al obtener registros: ${error.message}`);
    }
  }

  async findOne(modelName: string, id: string) {
    this.validateModelExists(modelName);
    try {
      const result = await this.prisma[modelName].findUnique({ where: { id } });
      if (!result) {
        throw new NotFoundException(`Registro con ID '${id}' no encontrado en ${modelName}`);
      }
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Error al buscar registro: ${error.message}`);
    }
  }

  async create(modelName: string, data: any) {
    this.validateModelExists(modelName);
 /*    this.validateFields(modelName, data); */
    try {
      return await this.prisma[modelName].create({ data });
    } catch (error) {
      this.handlePrismaError(error, modelName);
    }
  }

  async update(modelName: string, id: string, data: any) {
    this.validateModelExists(modelName);
    /* this.validateFields(modelName, data, true); */
    
    try {
      return await this.prisma[modelName].update({ where: { id }, data });
    } catch (error) {
      this.handlePrismaError(error, modelName);
    }
  }

  async remove(modelName: string, id: string) {
    this.validateModelExists(modelName);
    try {
      return await this.prisma[modelName].delete({ where: { id } });
    } catch (error) {
      this.handlePrismaError(error, modelName);
    }
  }

  async paginate(
  modelName: string,
  options: {
    page?: number;
    perPage?: number;
    where?: any;
    orderBy?: any;
    select?: any;
    include?: any;
  } = {},
) {
  try {
   
    this.validateModelExists(modelName);
    console.log(`Paginate called for model: ${modelName}`); // Log de diagnóstico

    const {
      page = 1,
      perPage = 10,
      where = {},
      orderBy = undefined,
      select = undefined,
      include = undefined,
    } = options;

   
    const skip = (page - 1) * perPage;
    const queryOptions: any = {
      skip,
      take: perPage,
      where,
    };

    if (orderBy) queryOptions.orderBy = orderBy;
    if (select) queryOptions.select = select;
    if (include) queryOptions.include = include;

 
    const [total, data] = await Promise.all([
      this.prisma[modelName].count({ where }),
      this.prisma[modelName].findMany(queryOptions),
    ]);

    const result = {
      data,
      meta: {
        total,
        page,
        perPage,
        lastPage: Math.ceil(total / perPage),
      },
    };

  
    return result;
  } catch (error) {
    console.error('Error in paginate method:', error); // Log de error detallado
    this.handlePrismaError(error, modelName);
  }
}
}
