import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { SemanticModule } from './semantic/semantic.module';
import { StockModule } from './stock/stock.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventsModule,
    PrismaModule,
    AuthModule,
    HealthModule,
    UsersModule,
    CategoriesModule,
    SuppliersModule,
    ProductsModule,
    StockModule,
    DashboardModule,
    ChatbotModule,
    SemanticModule,
    PurchaseOrdersModule,
  ],
})
export class AppModule {}
