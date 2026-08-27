import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChatRequestDto {
  @IsString({ message: 'La pregunta debe ser un texto' })
  @IsNotEmpty({ message: 'La pregunta es obligatoria' })
  question!: string;

  @IsOptional()
  @IsString({ message: 'El identificador de conversación debe ser un texto' })
  conversation_id?: string;
}
