import { ConfigService } from '@nestjs/config';

/**
 * El servicio Python de `chatbot` no valida autenticación propia en ninguna
 * ruta (confía solo en el perímetro de red). Este header comparte un secreto
 * entre Nest y ese servicio para que, si el puerto queda alcanzable desde
 * afuera, las requests directas sin este header sean rechazadas (401) del
 * lado Python. Si `CHATBOT_INTERNAL_TOKEN` no está configurado, no se manda
 * el header — el propio servicio Python rechaza igual (fail-closed).
 */
export function chatbotInternalTokenHeader(
  configService: ConfigService,
): Record<string, string> {
  const token = configService.get<string>('CHATBOT_INTERNAL_TOKEN');
  return token ? { 'X-Internal-Token': token } : {};
}
