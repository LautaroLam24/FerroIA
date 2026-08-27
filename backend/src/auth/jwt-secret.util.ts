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
