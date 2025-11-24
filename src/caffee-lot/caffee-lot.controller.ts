import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete, 
  ParseUUIDPipe, 
  Injectable
} from '@nestjs/common';

import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBody 
} from '@nestjs/swagger';
import { CoffeeLotsService } from './caffee-lot.service';
import { CreateCoffeeLotDto } from './dto/create-caffee-lot.dto';
import { UpdateCoffeeLotDto } from './dto/update-caffee-lot.dto';
import { AddCoffeeLotToAuctionDto } from './dto/add-coffee-lot-to-auction.dto';

@ApiTags('Coffee Lots')
@Controller('coffee-lots')
@Injectable()
export class CoffeeLotsController {
  constructor(private readonly coffeeLotsService: CoffeeLotsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new coffee lot' })
  @ApiResponse({ status: 201, description: 'Coffee lot created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
   @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @ApiResponse({ status: 404, description: 'Modelo no encontrado' })
  @ApiBody({ type: CreateCoffeeLotDto })
  create(@Body() createCoffeeLotDto: CreateCoffeeLotDto) {
    console.log('Creating coffee lot:', createCoffeeLotDto);
    
    return this.coffeeLotsService.create(createCoffeeLotDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all coffee lots' })
  @ApiResponse({ status: 200, description: 'List of all coffee lots' })
  findAll() {
    return this.coffeeLotsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a coffee lot by ID' })
  @ApiResponse({ status: 200, description: 'Coffee lot details' })
  @ApiResponse({ status: 404, description: 'Coffee lot not found' })
  @ApiParam({ name: 'id', description: 'Coffee lot ID', type: String })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.coffeeLotsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a coffee lot' })
  @ApiResponse({ status: 200, description: 'Coffee lot updated successfully' })
  @ApiResponse({ status: 404, description: 'Coffee lot not found' })
  @ApiParam({ name: 'id', description: 'Coffee lot ID', type: String })
  @ApiBody({ type: UpdateCoffeeLotDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCoffeeLotDto: UpdateCoffeeLotDto,
  ) {
    return this.coffeeLotsService.update(id, updateCoffeeLotDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a coffee lot' })
  @ApiResponse({ status: 200, description: 'Coffee lot deleted successfully' })
  @ApiResponse({ status: 404, description: 'Coffee lot not found' })
  @ApiParam({ name: 'id', description: 'Coffee lot ID', type: String })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.coffeeLotsService.remove(id);
  }


  @Post('add-to-auction')
  @ApiOperation({ summary: 'Add a coffee lot to an auction' })
  @ApiResponse({ status: 201, description: 'Coffee lot added to auction successfully' })
  @ApiResponse({ status: 400, description: 'Bad request or validation error' })
  @ApiResponse({ status: 404, description: 'Auction or coffee lot not found' })
  @ApiResponse({ status: 409, description: 'Coffee lot already in auction' })
  @ApiBody({ type: AddCoffeeLotToAuctionDto })
  addToAuction(@Body() addCoffeeLotToAuctionDto: AddCoffeeLotToAuctionDto) {
    return this.coffeeLotsService.addToAuction(addCoffeeLotToAuctionDto);
  }

 /*  @Get()
  @ApiOperation({ summary: 'Get all coffee lots' })
  @ApiResponse({ status: 200, description: 'List of all coffee lots' })
  findAll() {
    return this.coffeeLotsService.findAll();
  } */

   @Get('auction/:auctionId')
  @ApiOperation({ summary: 'Get coffee lots by auction ID' })
  @ApiResponse({ status: 200, description: 'List of coffee lots in auction' })
  @ApiParam({ name: 'auctionId', description: 'Auction ID', type: String })
  findByAuction(@Param('auctionId') auctionId: string) {
    return this.coffeeLotsService.findByAuction(auctionId);
  }

  @Delete('auction/:auctionId/lot/:coffeeLotId')
  @ApiOperation({ summary: 'Remove a coffee lot from an auction' })
  @ApiResponse({ status: 200, description: 'Coffee lot removed from auction successfully' })
  @ApiResponse({ status: 404, description: 'Auction or coffee lot not found' })
  @ApiParam({ name: 'auctionId', description: 'Auction ID', type: String })
  @ApiParam({ name: 'coffeeLotId', description: 'Coffee lot ID', type: String })
  removeFromAuction(
    @Param('auctionId') auctionId: string,
    @Param('coffeeLotId') coffeeLotId: string,
  ) {
    return this.coffeeLotsService.removeFromAuction(auctionId, coffeeLotId);
  }
}