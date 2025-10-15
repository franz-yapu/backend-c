import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CrudGeneratorService } from './crud-generator.service';

@ApiTags('Dynamic CRUD')
@Controller('dynamic/:modelName')
export class CrudGeneratorController {
  constructor(private readonly crudService: CrudGeneratorService) {}

  @Get()
  @ApiOperation({ summary: 'Get all records from model' })
  @ApiParam({ name: 'modelName', description: 'Name of the Prisma model' })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @ApiResponse({ status: 404, description: 'Modelo no encontrado' })
  findAll(@Param('modelName') modelName: string) {
    return this.crudService.findAll(modelName);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single record by ID' })
  @ApiParam({ name: 'modelName', description: 'Name of the Prisma model' })
  @ApiParam({ name: 'id', description: 'Record ID' })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @ApiResponse({ status: 404, description: 'Modelo o registro no encontrado' })
  findOne(@Param('modelName') modelName: string, @Param('id') id: string) {
    return this.crudService.findOne(modelName, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new record' })
  @ApiParam({ name: 'modelName', description: 'Name of the Prisma model' })
  @ApiBody({ description: 'Datos del registro a crear' })
  @ApiResponse({ status: 400, description: 'Error de validación o en la solicitud' })
  @ApiResponse({ status: 404, description: 'Modelo no encontrado' })
  create(
    @Param('modelName') modelName: string,
    @Body() data: any,
  ) {

    return this.crudService.create(modelName, data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update record by ID' })
  @ApiParam({ name: 'modelName', description: 'Name of the Prisma model' })
  @ApiParam({ name: 'id', description: 'Record ID' })
  @ApiBody({ description: 'Datos a actualizar' })
  @ApiResponse({ status: 400, description: 'Error de validación o en la solicitud' })
  @ApiResponse({ status: 404, description: 'Modelo o registro no encontrado' })
  update(
    @Param('modelName') modelName: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.crudService.update(modelName, id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete record by ID' })
  @ApiParam({ name: 'modelName', description: 'Name of the Prisma model' })
  @ApiParam({ name: 'id', description: 'Record ID' })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @ApiResponse({ status: 404, description: 'Modelo o registro no encontrado' })
  remove(@Param('modelName') modelName: string, @Param('id') id: string) {
    return this.crudService.remove(modelName, id);
  }

  @Get('all/paginate')
@ApiOperation({ summary: 'Get paginated records with filtering, sorting and relations' })
@ApiParam({ name: 'modelName', description: 'Name of the Prisma model' })
@ApiQuery({ name: 'page', required: false, example: 1 })
@ApiQuery({ name: 'perPage', required: false, example: 10 })
@ApiQuery({ 
  name: 'where', 
  required: false,
  description: 'JSON string with Prisma where conditions. Example: {"name":{"contains":"john"}}'
})
@ApiQuery({
  name: 'orderBy',
  required: false,
  description: 'JSON string with Prisma orderBy conditions. Example: {"createdAt":"desc"}'
})
@ApiQuery({
  name: 'select',
  required: false,
  description: 'JSON string with fields to select. Example: {"id":true,"name":true}'
})
@ApiQuery({
  name: 'include',
  required: false,
  description: 'JSON string with relations to include. Example: {"posts":true}'
})
async paginate(
  @Param('modelName') modelName: string,
  @Query('page') page: string,
  @Query('perPage') perPage: string,
  @Query('where') where: string,
  @Query('orderBy') orderBy: string,
  @Query('select') select: string,
  @Query('include') include: string,
) {

  try {
 
    const options: any = {
      page: page ? parseInt(page) : undefined,
      perPage: perPage ? parseInt(perPage) : undefined,
    };

    // Parsear los parámetros JSON solo si existen
    if (where) {
      try {
        options.where = JSON.parse(where);
      } catch (e) {
        throw new BadRequestException('Invalid JSON in where parameter');
      }
    }

    if (orderBy) {
      try {
        options.orderBy = JSON.parse(orderBy);
      } catch (e) {
        throw new BadRequestException('Invalid JSON in orderBy parameter');
      }
    }

    if (select) {
      try {
        options.select = JSON.parse(select);
      } catch (e) {
        throw new BadRequestException('Invalid JSON in select parameter');
      }
    }

    if (include) {
      try {
        options.include = JSON.parse(include);
      } catch (e) {
        throw new BadRequestException('Invalid JSON in include parameter');
      }
    }

    
    return await this.crudService.paginate(modelName, options);
  } catch (error) {
    console.error('Error in paginate controller:', error); // Log de error detallado
    throw error;
  }
}


}