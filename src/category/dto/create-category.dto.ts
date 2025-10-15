import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateCategoryDto {
  @ApiProperty({ example: 'Name ' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

}