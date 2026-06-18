import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';

import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TransactionsService } from './transaction.service';
import { Public } from '../auth/decorators/public.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesEnum } from '../auth/roles.enum';

@ApiTags('Transactions')
// Autenticación global; RolesGuard añade autorización. Los métodos con
// @Roles(ADMIN) son admin; los de "mis datos" (user/:id, buyer/:id/wins) validan
// que el id sea el del propio usuario (o admin); las ventas (sales) son @Public.
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // El id del path debe ser el del usuario autenticado, salvo que sea ADMIN.
  private assertSelfOrAdmin(req: any, idFromPath: string) {
    if (req.user?.role !== RolesEnum.ADMIN && req.user?.userId !== idFromPath) {
      throw new ForbiddenException('Solo puedes consultar tus propios datos');
    }
  }

  @Post()
  @Roles(RolesEnum.ADMIN)
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
  @Roles(RolesEnum.ADMIN)
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
  @Roles(RolesEnum.ADMIN)
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
  @Roles(RolesEnum.ADMIN)
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
  @Roles(RolesEnum.ADMIN)
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
  @Roles(RolesEnum.ADMIN)
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
  @Roles(RolesEnum.ADMIN)
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
  findByUser(@Param('userId') userId: string, @Request() req: any) {
    this.assertSelfOrAdmin(req, userId);
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
findBuyerWins(@Param('buyerId') buyerId: string, @Request() req: any) {
  this.assertSelfOrAdmin(req, buyerId);
  return this.transactionsService.findBuyerWins(buyerId);
}


}