import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { getAppVersion } from './version';

@ApiTags('Version')
@Public() // Versión de la plataforma: endpoint público (about / health).
@Controller('version')
export class VersionController {
  @Get()
  @ApiOperation({ summary: 'Versión de la aplicación backend' })
  @ApiResponse({ status: 200, description: 'Versión devuelta' })
  getVersion() {
    return {
      name: 'coffee-auction-backend',
      // Versión de la app (SemVer, independiente por repo).
      version: getAppVersion(),
      // Versión de la API REST (versionado por URI), cosa distinta.
      apiVersion: process.env.API_VERSION || '1.0',
    };
  }
}
