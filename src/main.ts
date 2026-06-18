import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GlobalPrefixOptions } from '@nestjs/common/interfaces';
import { BadRequestException, ClassSerializerInterceptor, ValidationPipe, VersioningType } from '@nestjs/common';
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

const prefixOptions: GlobalPrefixOptions = {
  exclude: ['/'],
};
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Sirve los archivos subidos desde <cwd>/uploads, que es DONDE los guarda multer
  // (`destination: './uploads'`) y de donde los lee DmsController. Usar __dirname
  // resolvía a dist/uploads (carpeta vacía) → /uploads/* daba 404, sobre todo en
  // el contenedor donde main.js corre en dist/src.
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // CORS con orígenes explícitos
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:4200').split(',');
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'platform-seed'],
    credentials: true,
  });

  // Global prefix configuration for REST API endpoints
  app.setGlobalPrefix(process.env.API_ROOT || 'api', prefixOptions);
  
  // Global versioning configuration for REST API endpoints
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Global pipes configuration
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      transform: true,
      transformerPackage: require('class-transformer'),
      transformOptions: {
        enableImplicitConversion: true,
      },
      forbidUnknownValues: false,
      forbidNonWhitelisted: false,
    }),
  );

  // Global filter for the validation errors
  app.useGlobalFilters(
    new I18nValidationExceptionFilter({
      detailedErrors: false,
    }),
  );
  
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API de Usuarios y Roles')
    .setDescription('Documentación de la API Coffee')
    .setVersion(process.env.API_VERSION || '1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese el token JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'platform-seed',
        description: 'Platform seed of your project',
      },
      'platform-seed',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  console.log(`🚀 Server starting on http://0.0.0.0:${port}`);
  await app.listen(port, '0.0.0.0');
}
bootstrap();