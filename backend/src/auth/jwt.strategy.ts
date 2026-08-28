import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser, JwtPayload } from './jwt-payload.interface';
import { getJwtSecretOrThrow } from './jwt-secret.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecretOrThrow(configService),
      // Defensa en profundidad: sin esto, passport-jwt acepta cualquier
      // algoritmo que el token declare en su header. Fijarlo a HS256 evita
      // una confusión de algoritmo si en el futuro se introduce RS256 en
      // paralelo (p. ej. durante una migración) y queda el HMAC activo.
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
