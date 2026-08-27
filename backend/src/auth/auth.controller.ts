import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';

interface LogoutResult {
  message: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<{ data: LoginResult }> {
    const result = await this.authService.login(dto.email, dto.password);
    return { data: result };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(): { data: LogoutResult } {
    return { data: { message: 'Sesión cerrada' } };
  }
}
