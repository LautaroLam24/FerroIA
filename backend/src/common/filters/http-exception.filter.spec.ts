import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
      }),
    } as unknown as ArgumentsHost;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mantiene el contrato {error} para un HttpException simple', () => {
    filter.catch(new NotFoundException('Producto no encontrado'), host);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Producto no encontrado' });
  });

  it('agrega {details} cuando el HttpException trae errores de validación', () => {
    filter.catch(
      new BadRequestException({ message: ['el nombre es obligatorio'] }),
      host,
    );

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Error de validación',
      details: ['el nombre es obligatorio'],
    });
  });

  it('nunca filtra el mensaje/stack de un error que no es HttpException', () => {
    filter.catch(new Error('SECRETO: falló la conexión a la DB'), host);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Error interno' });
    const [responseBody] = jsonMock.mock.calls[0] as [{ error: string }];
    expect(JSON.stringify(responseBody)).not.toContain('SECRETO');
  });
});
