import { ConfigService } from '@nestjs/config';
import { getJwtSecretOrThrow } from './jwt-secret.util';

describe('getJwtSecretOrThrow', () => {
  function configServiceWith(value: string | undefined): ConfigService {
    return { get: () => value } as unknown as ConfigService;
  }

  it('devuelve el secreto cuando está seteado', () => {
    expect(getJwtSecretOrThrow(configServiceWith('un-secreto-real'))).toBe(
      'un-secreto-real',
    );
  });

  it('tira error claro si JWT_SECRET falta', () => {
    expect(() => getJwtSecretOrThrow(configServiceWith(undefined))).toThrow(
      /JWT_SECRET/,
    );
  });

  it('tira error claro si JWT_SECRET está vacío', () => {
    expect(() => getJwtSecretOrThrow(configServiceWith(''))).toThrow(
      /JWT_SECRET/,
    );
  });
});
