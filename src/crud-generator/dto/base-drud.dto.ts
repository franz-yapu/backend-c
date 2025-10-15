import { ApiProperty } from '@nestjs/swagger';

export class BaseCrudDto {
  @ApiProperty({
    description: 'Dynamic properties based on model',
    type: 'object',
    additionalProperties: true,
  })
  data: Record<string, any>;
}