import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { SemanticSearchQueryDto } from './dto/semantic-search-query.dto';
import { SemanticSearchService } from './semantic-search.service';

const NO_RELEVANT_RESULTS_MESSAGE =
  'No se encontraron productos relevantes para tu búsqueda.';

@Controller('products/semantic')
@Roles(Role.ADMIN, Role.OPERARIO)
export class SemanticSearchController {
  constructor(private readonly semanticSearchService: SemanticSearchService) {}

  @Get()
  async search(@Query() query: SemanticSearchQueryDto) {
    const data = await this.semanticSearchService.search(query.q);
    if (data.length === 0) {
      return { data, message: NO_RELEVANT_RESULTS_MESSAGE };
    }
    return { data };
  }
}
