import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chatbotInternalTokenHeader } from '../common/chatbot-internal-token.util';
import { ChatRequestDto } from './dto/chat-request.dto';

export interface ChatResult {
  conversation_id: string;
  answer: string;
}

const UNAVAILABLE_MESSAGE = 'El asistente no está disponible en este momento';
const INVALID_CONVERSATION_MESSAGE = 'conversation_id inválido';
const DEFAULT_TIMEOUT_MS = 15_000;

@Injectable()
export class ChatbotService {
  constructor(private readonly configService: ConfigService) {}

  async ask(
    dto: ChatRequestDto,
    userId: string,
    authToken?: string,
  ): Promise<ChatResult> {
    const baseUrl = this.configService.get<string>('CHATBOT_URL');
    const timeoutMs =
      Number(this.configService.get<string>('CHATBOT_TIMEOUT_MS')) ||
      DEFAULT_TIMEOUT_MS;

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...chatbotInternalTokenHeader(this.configService),
        },
        body: JSON.stringify({
          question: dto.question,
          conversation_id: dto.conversation_id,
          user_id: userId,
          auth_token: authToken,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new BadGatewayException(UNAVAILABLE_MESSAGE);
    }

    if (response.status === 404) {
      throw new BadRequestException(INVALID_CONVERSATION_MESSAGE);
    }
    if (!response.ok) {
      throw new BadGatewayException(UNAVAILABLE_MESSAGE);
    }

    return (await response.json()) as ChatResult;
  }
}
