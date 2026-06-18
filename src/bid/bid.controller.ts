import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Request,
  ForbiddenException,
} from '@nestjs/common';

import { CreateBidDto } from './dto/create-bid.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BidResponseDto } from './dto/bid-response.dto';
import { BidsService } from './bid.service';
import { Public } from '../auth/decorators/public.decorator';
import { RolesEnum } from '../auth/roles.enum';

@ApiTags('Bids')
@Controller('bids')
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Place a new bid' })
  @ApiResponse({ status: 201, description: 'Bid placed successfully', type: BidResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid bid amount or auction not active' })
  @ApiResponse({ status: 404, description: 'Auction or user not found' })
  @ApiBody({ type: CreateBidDto })
  create(@Body() createBidDto: CreateBidDto, @Request() req: any) {
    // Identidad SIEMPRE del JWT (no del body → no se puede pujar como otro) y
    // mismo camino con advisory lock + minIncrement que el socket. Antes esta
    // ruta REST tomaba userId del body y NO bloqueaba → puenteaba toda la
    // equidad/seguridad de las pujas.
    createBidDto.userId = req.user.userId;
    return this.bidsService.createWithOptimisticLock(createBidDto);
  }

  @Get('auction/:auctionId')
  @ApiOperation({ summary: 'Get all bids for an auction' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of bids',
    type: [BidResponseDto]
  })
  @ApiParam({ 
    name: 'auctionId', 
    description: 'Auction ID' 
  })
  findAllForAuction(@Param('auctionId') auctionId: string) {
    return this.bidsService.findAllForAuction(auctionId);
  }

  @Get('highest/:auctionId')
  @ApiOperation({ summary: 'Get highest bid for an auction' })
  @ApiResponse({ 
    status: 200, 
    description: 'Highest bid details',
    type: BidResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'No bids found for this auction' 
  })
  @ApiParam({ 
    name: 'auctionId', 
    description: 'Auction ID' 
  })
  findHighestBid(@Param('auctionId') auctionId: string) {
    return this.bidsService.findHighestBid(auctionId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all bids by a user' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of user bids',
    type: [BidResponseDto]
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID' 
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limit number of results'
  })
  @ApiBearerAuth()
  getUserBids(
    @Param('userId') userId: string,
    @Request() req: any,
    @Query('limit') limit?: number,
  ) {
    // Solo tus propias pujas (o ADMIN): el userId del path no puede ser de otro.
    if (req.user?.role !== RolesEnum.ADMIN && req.user?.userId !== userId) {
      throw new ForbiddenException('Solo puedes consultar tus propias pujas');
    }
    return this.bidsService.getUserBids(userId);
  }


  @Public() // Página pública /auction muestra la puja más alta por lote.
  @Get('highest/:auctionId/:coffeeLotId')
@ApiOperation({ summary: 'Get highest bid for a specific coffee lot in an auction' })
@ApiResponse({ 
  status: 200, 
  description: 'Highest bid details for the coffee lot',
  type: BidResponseDto
})
@ApiResponse({ 
  status: 404, 
  description: 'No bids found for this coffee lot' 
})
@ApiParam({ 
  name: 'auctionId', 
  description: 'Auction ID' 
})
@ApiParam({ 
  name: 'coffeeLotId', 
  description: 'Coffee Lot ID' 
})
findHighestBidForCoffeeLot(
  @Param('auctionId') auctionId: string,
  @Param('coffeeLotId') coffeeLotId: string
) {
  return this.bidsService.findHighestBidForCoffeeLot(auctionId, coffeeLotId);
}

@Public() // Página pública /auction muestra el historial de últimas pujas.
@Get('last-bids/:auctionId/:coffeeLotId')
@ApiOperation({ summary: 'Get last bids for a specific coffee lot' })
@ApiResponse({ 
  status: 200, 
  description: 'Last bids for the coffee lot',
  type: [BidResponseDto]
})
@ApiParam({ 
  name: 'auctionId', 
  description: 'Auction ID' 
})
@ApiParam({ 
  name: 'coffeeLotId', 
  description: 'Coffee Lot ID' 
})
@ApiQuery({
  name: 'limit',
  required: false,
  description: 'Number of bids to return (default: 5)'
})
findLastBids(
  @Param('auctionId') auctionId: string,
  @Param('coffeeLotId') coffeeLotId: string,
  @Query('limit') limit?: number
) {
  return this.bidsService.findLastBids(auctionId, coffeeLotId, limit);
}

}