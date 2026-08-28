import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ChatRequestDto {
  @IsString({ message: 'La pregunta debe ser un texto' })
  @IsNotEmpty({ message: 'La pregunta es obligatoria' })
  question!: string;

  @IsOptional()
  @IsUUID('4', { message: 'El identificador de conversación no es válido' })
  conversation_id?: string;
}
