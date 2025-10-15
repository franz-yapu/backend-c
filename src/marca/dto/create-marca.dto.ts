import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateMarcaDto {
      @ApiProperty({ example: 'nokia' })
      @IsString()
      @IsNotEmpty()
      name: string;
}
