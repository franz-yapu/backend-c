import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsDateString,
  IsEnum 
} from 'class-validator';
import { AuctionStatus } from '@prisma/client';
import { PartialType } from '@nestjs/swagger';
import { CreateAuctionDto } from './create-auction.dto';

export class UpdateAuctionDto extends PartialType(CreateAuctionDto) {
 
}