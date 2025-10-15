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
  app.useGlobalPipes(new ValidationPipe({ whitelist: true })); // ← Añade esto
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
    });

  app.enableCors({
    origin: '*',
    methods: '*',
    allowedHeaders: '*',
    credentials: true,
  });

    // Global prefix configuration for REST API endpoints
    app.setGlobalPrefix(process.env.API_ROOT || 'api', prefixOptions);
 // Global versioning configuration for REST API endpoints
 app.enableVersioning({
  type: VersioningType.URI,
});

// Global pipes configuration for REST API endpoints, including the translation for the error messages
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
 // Global filter for the validation errors of the REST API endpoints
 app.useGlobalFilters(
  new I18nValidationExceptionFilter({
    detailedErrors: false,
  }),
);
app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Configuración de Swagger http://localhost:3000/api
  const config = new DocumentBuilder()
    .setTitle('API de Usuarios y Roles')
     .setDescription('Documentación de la API Coffee')
    .setVersion(process.env.API_VERSION || '1.0')
    .addServer('/coffee/api') // 👈 importante para que Swagger genere URLs correctas en prod
    .addServer('/api')    
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese el token JWT',
        in: 'header',
      },
      'JWT-auth', // Este nombre debe coincidir con el usado en el decorador @ApiBearerAuth()
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
  await app.listen(port);
}
bootstrap();