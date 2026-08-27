import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { RestockController } from './restock.controller';
import { RestockService } from './restock.service';
import { SemanticIndexListener } from './semantic-index.listener';
import { SemanticIndexService } from './semantic-index.service';
import { SemanticSearchController } from './semantic-search.controller';
import { SemanticSearchService } from './semantic-search.service';

@Module({
  imports: [ProductsModule],
  controllers: [SemanticSearchController, RestockController],
  providers: [
    SemanticIndexService,
    SemanticIndexListener,
    SemanticSearchService,
    RestockService,
  ],
  exports: [SemanticIndexService],
})
export class SemanticModule {}
