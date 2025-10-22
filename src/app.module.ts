import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModule } from './product/product.module';
import { CategoryModule } from './category/category.module';
import { DmsModule } from './dms/dms.module';
import { MarcaModule } from './marca/marca.module';
import { CaffeeLotModule } from './caffee-lot/caffee-lot.module';

import { TransactionModule } from './transaction/transaction.module';
import { AuctionModule } from './auction/auction.module';
import { BidModule } from './bid/bid.module';
import { CrudGeneratorModule } from './crud-generator/crud-generator.module';
import { I18nModule } from 'nestjs-i18n';
import * as path from 'path';
import { BidsGateway } from './bid/bids.gateway';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailModule } from './email/email.module';



@Module({
  imports: [
    ScheduleModule.forRoot(),
     I18nModule.forRoot({
      fallbackLanguage: 'es', // Idioma por defecto
      loaderOptions: {
       path: path.join(__dirname, '../i18n/'), // Ruta a tus archivos de traducción
        watch: true,
      },
    }),
    AuthModule,
    UsersModule,
    PrismaModule,
    ProductModule,
    CategoryModule,
    DmsModule,
    MarcaModule,
    CaffeeLotModule,
    AuctionModule,
    BidModule,
    TransactionModule,
    CrudGeneratorModule,
    EmailModule], // Asegúrate que estén todos
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }