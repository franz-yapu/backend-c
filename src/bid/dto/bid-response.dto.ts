import { ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

export class BidResponseDto {
  @ApiProperty({ description: 'ID único de la puja' })
  id: string;

  @ApiProperty({ description: 'Valor de la puja (USD/kg)' })
  amount: number;

  @ApiProperty({ description: 'ID de la subasta relacionada' })
  auctionId: string;

  @ApiProperty({ description: 'Fecha y hora de la puja' })
  createdAt: Date;

  @ApiProperty({ type: () => CreateUserDto, description: 'Información básica del usuario' })
  user: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string;
  };
}