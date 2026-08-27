import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IndexableProduct,
  SemanticIndexService,
} from '../semantic-index.service';

async function main() {
  const logger = new Logger('ReindexSemantic');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const prisma = app.get(PrismaService);
    const semanticIndexService = app.get(SemanticIndexService);

    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        category: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    });

    const payload: IndexableProduct[] = products.map((product) => ({
      id: product.id,
      code: product.code,
      name: product.name,
      description: product.description,
      category: product.category.name,
      supplier: product.supplier.name,
    }));

    const indexed = await semanticIndexService.reindexBulk(payload);
    logger.log(
      `Reindexado completo: ${indexed} producto(s) activo(s) indexado(s)`,
    );
  } finally {
    await app.close();
  }
}

void main();
