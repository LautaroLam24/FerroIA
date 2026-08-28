import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
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
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
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
