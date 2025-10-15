import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Param, 
  ParseUUIDPipe, 
  Query 
} from '@nestjs/common';

import { CreateBidDto } from './dto/create-bid.dto';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiParam,
  ApiQuery 
} from '@nestjs/swagger';
import { BidResponseDto } from './dto/bid-response.dto';
import { BidsService } from './bid.service';

@ApiTags('Bids')
@Controller('bids')
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Post()
  @ApiOperation({ summary: 'Place a new bid' })
  @ApiResponse({ 
    status: 201, 
    description: 'Bid placed successfully',
    type: BidResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid bid amount or auction not active' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Auction or user not found' 
  })
  @ApiBody({ type: CreateBidDto })
  create(@Body() createBidDto: CreateBidDto) {
    return this.bidsService.create(createBidDto);
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
  getUserBids(
    @Param('userId') userId: string,
    @Query('limit') limit?: number
  ) {
    return this.bidsService.getUserBids(userId);
  }


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