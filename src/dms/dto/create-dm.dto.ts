import { ApiProperty } from '@nestjs/swagger';

export class DmsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  path: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  type: string;

  @ApiProperty({ nullable: true })
  user: string | null;

  @ApiProperty({ nullable: true })
  module: string | null;

  @ApiProperty({ nullable: true })
  size: number | null;

  @ApiProperty()
  createdAt: Date;
}