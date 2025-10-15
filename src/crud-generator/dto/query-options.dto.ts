import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsNumber, IsPositive, IsString } from 'class-validator';

const parseJsonOrReturn = (value: any) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  }
  return value;
};

export class QueryOptionsDto {
  @ApiPropertyOptional({
    description: 'Prisma where conditions (JSON string)',
    example: '{"active": true}',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => parseJsonOrReturn(value))
  where?: any;

  @ApiPropertyOptional({
    description: 'Prisma orderBy (JSON string)',
    example: '{"createdAt": "desc"}',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => parseJsonOrReturn(value))
  orderBy?: any;

  @ApiPropertyOptional({
    description: 'Number of records to skip',
    type: Number,
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  skip?: number;

  @ApiPropertyOptional({
    description: 'Number of records to take',
    type: Number,
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  take?: number;

  @ApiPropertyOptional({
    description: 'Fields to select (JSON string)',
    example: '{"id": true, "name": true}',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => parseJsonOrReturn(value))
  select?: any;

  @ApiPropertyOptional({
    description: 'Relations to include (JSON string or boolean)',
    example: '{"posts": true}',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return parseJsonOrReturn(value);
  })
  include?: any;
}