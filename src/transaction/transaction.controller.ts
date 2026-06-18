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

import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBody,
  ApiQuery 
} from '@nestjs/swagger';
import { TransactionsService } from './transaction.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({ 
    status: 201, 
    description: 'Transaction created successfully' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Auction, buyer or seller not found' 
  })
  @ApiBody({ type: CreateTransactionDto })
  create(@Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionsService.create(createTransactionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all transactions' 
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter transactions by status'
  })
  findAll(@Query('status') status?: string) {
    /* if (status) {
      return this.transactionsService.findByStatus(status);
    } */
    return this.transactionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Transaction details' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Transaction not found' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Transaction ID' 
  })
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  @ApiResponse({ 
    status: 200, 
    description: 'Transaction updated successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Transaction not found' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Transaction ID' 
  })
  @ApiBody({ type: UpdateTransactionDto })
  update(
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, updateTransactionDto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update transaction status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Transaction status updated successfully' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid status' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Transaction not found' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Transaction ID' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['PENDING', 'COMPLETED', 'FAILED'],
        },
      },
    },
  })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.transactionsService.updateStatus(id, status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiResponse({ 
    status: 200, 
    description: 'Transaction deleted successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Transaction not found' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Transaction ID' 
  })
  remove(@Param('id') id: string) {
    return this.transactionsService.remove(id);
  }

  @Get('auction/:auctionId')
  @ApiOperation({ summary: 'Get transactions by auction ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of transactions for the auction' 
  })
  @ApiParam({ 
    name: 'auctionId', 
    description: 'Auction ID' 
  })
  findByAuction(@Param('auctionId') auctionId: string) {
    return this.transactionsService.findByAuction(auctionId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get transactions by user ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of user transactions (as buyer or seller)' 
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID' 
  })
  findByUser(@Param('userId') userId: string) {
    return this.transactionsService.findByUser(userId);
  }

  @Public() // Página pública /winners lista las ventas (ganadores) de una subasta.
  @Get('auction/:auctionId/sales')
  async findAuctionSales(@Param('auctionId') auctionId: string) {
  return this.transactionsService.findAuctionSales(auctionId);
}

@Get('buyer/:buyerId/wins')
@ApiOperation({ summary: 'Get all coffee lots won by a buyer' })
@ApiResponse({ status: 200, description: 'List of coffee lots won by the buyer' })
@ApiParam({ name: 'buyerId', description: 'Buyer ID' })
findBuyerWins(@Param('buyerId') buyerId: string) {
  return this.transactionsService.findBuyerWins(buyerId);
}


}