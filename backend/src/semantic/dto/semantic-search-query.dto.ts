import { IsNotEmpty, IsString } from 'class-validator';

export class SemanticSearchQueryDto {
  @IsString({ message: 'La búsqueda debe ser un texto' })
  @IsNotEmpty({ message: 'La búsqueda es obligatoria' })
  q!: string;
}
