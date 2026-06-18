// src/dms/dms.controller.ts
import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  Body,
  Param,
  ParseUUIDPipe,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { DmsService } from './dms.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { join, basename } from 'path';
import { Response } from 'express';
import * as fs from 'fs';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { DmsResponseDto } from './dto/create-dm.dto';
import { Public } from '../auth/decorators/public.decorator';




@ApiTags('dms')
@Controller('dms')
export class DmsController {
  constructor(private readonly dmsService: DmsService) {}

  // Streaming de archivos: público, equivalente al estático /uploads (las <img>
  // del front lo consumen sin token). El resto de /dms (upload, metadatos) sí
  // exige JWT por el guard global.
  @Public()
  @Get('uploads/:filename')
  getFile(@Param('filename') filename: string, @Res() res: Response) {
    // Saneo anti path-traversal: nos quedamos solo con el nombre base, así un
    // `../../etc/passwd` no puede escapar de la carpeta uploads (el endpoint es
    // público).
    const safeName = basename(filename);
    const filePath = join(process.cwd(), 'uploads', safeName);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }
    res.sendFile(filePath);
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string' },
        user: { type: 'string' },
      },
      required: ['file', 'type', 'user'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(
            Math.random() * 1e9,
          )}${extname(file.originalname)}`;
          cb(null, unique);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'application/pdf'];
        allowed.includes(file.mimetype)
          ? cb(null, true)
          : cb(new Error('Tipo de archivo no permitido'), false);
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
    @Body('user') user: string,
  ) {
    const saved = await this.dmsService.saveFile(file, type, user);
    return {
      ...saved,
      url: `http://localhost:3000/uploads/${file.filename}`,
    };
  }

  @Get()
  @ApiOkResponse({ type: [DmsResponseDto] })
  async findAll() {
    const files = await this.dmsService.findAll();
    return files.map((file) => ({
      ...file,
      url: `http://localhost:3000/uploads/${file.path.split('/').pop()}`,
    }));
  }

  @Get(':id')
  @ApiOkResponse({ type: DmsResponseDto })
  @ApiNotFoundResponse({ description: 'Archivo no encontrado' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const file = await this.dmsService.findById(id);
    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }
    return {
      ...file,
      url: `http://localhost:3000/uploads/${file.path.split('/').pop()}`,
    };
  }
}
