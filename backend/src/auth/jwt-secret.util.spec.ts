import { ConfigService } from '@nestjs/config';
import { getJwtExpiresInOrThrow, getJwtSecretOrThrow } from './jwt-secret.util';

function configServiceWith(value: string | undefined): ConfigService {
  return { get: () => value } as unknown as ConfigService;
}

describe('getJwtSecretOrThrow', () => {
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

describe('getJwtExpiresInOrThrow', () => {
  it('devuelve el valor cuando está seteado', () => {
    expect(getJwtExpiresInOrThrow(configServiceWith('8h'))).toBe('8h');
  });

  it('tira error claro si JWT_EXPIRES_IN falta', () => {
    expect(() => getJwtExpiresInOrThrow(configServiceWith(undefined))).toThrow(
      /JWT_EXPIRES_IN/,
    );
  });

  it('tira error claro si JWT_EXPIRES_IN está vacío', () => {
    expect(() => getJwtExpiresInOrThrow(configServiceWith(''))).toThrow(
      /JWT_EXPIRES_IN/,
    );
  });
});
