import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { ChatbotService } from './chatbot.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('chatbot')
@Roles(Role.ADMIN, Role.OPERARIO)
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async chat(
    @Body() dto: ChatRequestDto,
    @Req()
    req: { user: AuthenticatedUser; headers: { authorization?: string } },
  ) {
    const authToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    return {
      data: await this.chatbotService.ask(dto, req.user.userId, authToken),
    };
  }
}
