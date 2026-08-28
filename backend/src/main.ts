import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(helmet());
  // Sin CORS_ORIGIN, `enableCors({ origin: undefined })` hace que el paquete
  // `cors` interprete "sin origin configurado" como "cualquier origin"
  // (Access-Control-Allow-Origin: *), violando .instructions.md §7. Fail-fast
  // en vez de arrancar en ese estado.
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  if (!corsOrigin) {
    throw new Error(
      'CORS_ORIGIN no está seteado. Definilo en el .env antes de levantar el backend.',
    );
  }
  app.enableCors({ origin: corsOrigin });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api', { exclude: ['health'] });

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
}
void bootstrap();
