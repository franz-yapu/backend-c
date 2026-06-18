import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete,
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
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Auctions')
@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new auction' })
  @ApiResponse({ status: 201, description: 'Auction created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Coffee lot or seller not found' })
  @ApiBody({ type: CreateAuctionDto })
  create(@Body() createAuctionDto: CreateAuctionDto) {
    return this.auctionsService.create(createAuctionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all auctions' })
  @ApiResponse({ status: 200, description: 'List of all auctions' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: AuctionStatus,
    description: 'Filter auctions by status'
  })
  findAll(@Query('status') status?: AuctionStatus) {
    return this.auctionsService.findAll();
  }

  @Public() // Página pública /auction lista las subastas activas.
  @Get('active')
  @ApiOperation({ summary: 'Get all active auctions' })
  @ApiResponse({ status: 200, description: 'List of active auctions' })
  findActive() {
    return this.auctionsService.findActiveAuctions();
  }

  @Get('active-current')
  @ApiOperation({ summary: 'Get current active auction' })
  @ApiResponse({ status: 200, description: 'Active auction' })
  async getActive() {
    return this.auctionsService.getActiveAuction();
  }

  // IMPORTANTE: rutas estáticas deben estar ANTES de rutas con parámetros (:id)
  @Public() // Página pública /winners muestra la última subasta cerrada.
  @Get('find-last')
  @ApiOperation({ summary: 'Get the last closed auction' })
  @ApiResponse({ status: 200, description: 'Last closed auction details' })
  async findLastClosedAuction() {
    return this.auctionsService.findLastClosedAuction();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an auction by ID' })
  @ApiResponse({ status: 200, description: 'Auction details' })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  @ApiParam({ name: 'id', description: 'Auction ID', type: String })
  findOne(@Param('id') id: string) {
    return this.auctionsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an auction' })
  @ApiResponse({ status: 200, description: 'Auction updated successfully' })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  @ApiParam({ name: 'id', description: 'Auction ID', type: String })
  @ApiBody({ type: UpdateAuctionDto })
  update(
    @Param('id') id: string,
    @Body() updateAuctionDto: UpdateAuctionDto,
  ) {
    return this.auctionsService.update(id, updateAuctionDto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update auction status' })
  @ApiResponse({ status: 200, description: 'Auction status updated successfully' })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  @ApiParam({ name: 'id', description: 'Auction ID', type: String })
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
  @ApiResponse({ status: 200, description: 'Auction deleted successfully' })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  @ApiParam({ name: 'id', description: 'Auction ID', type: String })
  remove(@Param('id') id: string) {
    return this.auctionsService.remove(id);
  }

  @Get(':id/highest-bid')
  @ApiOperation({ summary: 'Get highest bid for an auction' })
  @ApiResponse({ status: 200, description: 'Highest bid details' })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  @ApiParam({ name: 'id', description: 'Auction ID', type: String })
  getHighestBid(@Param('id') auctionId: string) {
    return this.auctionsService.getHighestBid(auctionId);
  }
}