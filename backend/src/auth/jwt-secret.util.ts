import { ConfigService } from '@nestjs/config';

/**
 * Sin JWT_SECRET, jsonwebtoken firma/valida tokens con secreto vacío (""):
 * cualquiera puede forjar un JWT válido offline. Falla el bootstrap en vez
 * de arrancar en ese estado.
 */
export function getJwtSecretOrThrow(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET');
  if (!secret) {
    throw new Error(
      'JWT_SECRET no está seteado. Definilo en el .env antes de levantar el backend.',
    );
  }
  return secret;
}

/**
 * Sin JWT_EXPIRES_IN, `signOptions.expiresIn` queda `undefined` y
 * jsonwebtoken firma tokens SIN claim `exp`: un JWT robado nunca expira.
 * Falla el bootstrap en vez de arrancar en ese estado.
 */
export function getJwtExpiresInOrThrow(configService: ConfigService): string {
  const expiresIn = configService.get<string>('JWT_EXPIRES_IN');
  if (!expiresIn) {
    throw new Error(
      'JWT_EXPIRES_IN no está seteado. Definilo en el .env antes de levantar el backend.',
    );
  }
  return expiresIn;
}
