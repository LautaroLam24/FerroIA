import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

interface NestErrorBody {
  message?: string | string[];
  [key: string]: unknown;
}

const GENERIC_ERROR_MESSAGE = 'Error interno';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    // Cualquier error que no sea un HttpException (bug no controlado, error
    // de Prisma sin capturar, etc.) nunca debe devolver su mensaje/stack al
    // cliente — se loguea completo del lado servidor y se responde genérico.
    if (!(exception instanceof HttpException)) {
      this.logger.error(exception);
      response.status(500).json({ error: GENERIC_ERROR_MESSAGE });
      return;
    }

    const status = exception.getStatus();
    const body = exception.getResponse();

    if (typeof body === 'string') {
      response.status(status).json({ error: body });
      return;
    }

    const { message } = body as NestErrorBody;
    const isValidationErrors = Array.isArray(message);

    response.status(status).json({
      error: isValidationErrors
        ? 'Error de validación'
        : (message ?? exception.message),
      ...(isValidationErrors ? { details: message } : {}),
    });
  }
}
