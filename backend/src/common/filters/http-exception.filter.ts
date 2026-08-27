import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

interface NestErrorBody {
  message?: string | string[];
  [key: string]: unknown;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
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
