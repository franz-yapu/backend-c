
import { PrismaService } from 'src/prisma/prisma.service';
import { TransactionsService } from './transaction.service';
import { Test, TestingModule } from '@nestjs/testing';
/* import { PrismaService } from '../prisma/prisma.service'; // usa ruta relativa */

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: PrismaService;

  const mockPrisma = {
    transaction: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auction: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // limpiar mocks después de cada test
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(prisma).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of transactions', async () => {
      const mockData = [{ id: '1', amount: 100 }];
      mockPrisma.transaction.findMany.mockResolvedValue(mockData);

      const result = await service.findAll();
      expect(result).toEqual(mockData);
      expect(mockPrisma.transaction.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a transaction if found', async () => {
      const mockTx = { id: '1', amount: 100 };
      mockPrisma.transaction.findUnique.mockResolvedValue(mockTx);

      const result = await service.findOne('1');
      expect(result).toEqual(mockTx);
      expect(mockPrisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { auction: true, buyer: true, seller: true },
      });
    });

    it('should throw NotFoundException if transaction not found', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow('Transaction with ID 1 not found');
    });
  });


});
