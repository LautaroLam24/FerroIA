import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import type { SignOptions } from 'jsonwebtoken';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './jwt.strategy';
import { getJwtSecretOrThrow } from './jwt-secret.util';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: getJwtSecretOrThrow(configService),
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_EXPIRES_IN',
          ) as SignOptions['expiresIn'],
        },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
