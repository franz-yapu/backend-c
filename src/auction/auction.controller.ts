import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete, 
  ParseUUIDPipe,
  Query 
} from '@nestjs/common';

import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBody,
  ApiQuery 
} from '@nestjs/swagger';
import { AuctionStatus } from '@prisma/client';
import { AuctionsService } from './auction.service';

@ApiTags('Auctions')
@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new auction' })
  @ApiResponse({ 
    status: 201, 
    description: 'Auction created successfully' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Coffee lot or seller not found' 
  })
  @ApiBody({ type: CreateAuctionDto })
  create(@Body() createAuctionDto: CreateAuctionDto) {
    return this.auctionsService.create(createAuctionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all auctions' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all auctions' 
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: AuctionStatus,
    description: 'Filter auctions by status'
  })
  findAll(@Query('status') status?: AuctionStatus) {
   /*  if (status) {
      return this.auctionsService.findByStatus(status);
    } */
    return this.auctionsService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active auctions' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of active auctions' 
  })
  findActive() {
    return this.auctionsService.findActiveAuctions();
  }

 @Get('active-current')
  @ApiOperation({ summary: 'Get all active auction' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of active auctions' 
  })
  async getActive() {
    return this.auctionsService.getActiveAuction();
  }


  @Get(':id')
  @ApiOperation({ summary: 'Get an auction by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Auction details' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Auction not found' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Auction ID', 
    type: String 
  })
  findOne(@Param('id') id: string) {
    return this.auctionsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an auction' })
  @ApiResponse({ 
    status: 200, 
    description: 'Auction updated successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Auction not found' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Auction ID', 
    type: String 
  })
  @ApiBody({ type: UpdateAuctionDto })
  update(
    @Param('id') id: string,
    @Body() updateAuctionDto: UpdateAuctionDto,
  ) {
    return this.auctionsService.update(id, updateAuctionDto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update auction status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Auction status updated successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Auction not found' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Auction ID', 
    type: String 
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: Object.values(AuctionStatus),
        },
      },
    },
  })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: AuctionStatus,
  ) {
    return this.auctionsService.updateStatus(id, status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an auction' })
  @ApiResponse({ 
    status: 200, 
    description: 'Auction deleted successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Auction not found' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Auction ID', 
    type: String 
  })
  remove(@Param('id') id: string) {
    return this.auctionsService.remove(id);
  }

  @Get(':id/highest-bid')
  @ApiOperation({ summary: 'Get highest bid for an auction' })
  @ApiResponse({ 
    status: 200, 
    description: 'Highest bid details' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Auction not found' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Auction ID', 
    type: String 
  })
  getHighestBid(@Param('id') auctionId: string) {
    return this.auctionsService.getHighestBid(auctionId);
  }

 @Get('auction/find-last')
  async findAuctionSales() {
  return this.auctionsService.findLastClosedAuction();
}





 

}