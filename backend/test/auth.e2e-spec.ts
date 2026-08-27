import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { AdminOnlyTestController } from './fixtures/admin-only.controller';

interface LoginResponseBody {
  data: {
    accessToken: string;
    user: { id: string; email: string; name: string; role: string };
  };
}

interface ErrorResponseBody {
  error: string;
  details?: unknown;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const adminEmail = 'e2e-admin@ferreteria.local';
  const operarioEmail = 'e2e-operario@ferreteria.local';
  const password = 'Sup3rSecret!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [AdminOnlyTestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash, role: Role.ADMIN },
      create: {
        email: adminEmail,
        name: 'E2E Admin',
        passwordHash,
        role: Role.ADMIN,
      },
    });
    await prisma.user.upsert({
      where: { email: operarioEmail },
      update: { passwordHash, role: Role.OPERARIO },
      create: {
        email: operarioEmail,
        name: 'E2E Operario',
        passwordHash,
        role: Role.OPERARIO,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, operarioEmail] } },
    });
    await app.close();
  });

  it('POST /api/auth/login - credenciales correctas devuelve 200 + token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password })
      .expect(200);

    const body = response.body as LoginResponseBody;
    expect(body.data.accessToken).toEqual(expect.any(String));
    expect(body.data.user).toMatchObject({
      email: adminEmail,
      role: 'ADMIN',
    });
  });

  it('POST /api/auth/login - credenciales inválidas devuelve 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'wrong-password' })
      .expect(401);

    expect((response.body as ErrorResponseBody).error).toEqual(
      expect.any(String),
    );
  });

  it('POST /api/auth/login - body inválido devuelve 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail })
      .expect(400);

    expect((response.body as ErrorResponseBody).error).toEqual(
      expect.any(String),
    );
  });

  it('POST /api/auth/logout - sin token devuelve 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .expect(401);

    expect((response.body as ErrorResponseBody).error).toEqual(
      expect.any(String),
    );
  });

  it('POST /api/auth/logout - token expirado devuelve 401', async () => {
    const expiredToken = await jwtService.signAsync(
      { sub: 'x', email: adminEmail, role: Role.ADMIN },
      { expiresIn: '-1s' },
    );

    const response = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);

    expect((response.body as ErrorResponseBody).error).toEqual(
      expect.any(String),
    );
  });

  it('POST /api/auth/logout - token válido devuelve 200', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set(
        'Authorization',
        `Bearer ${(loginResponse.body as LoginResponseBody).data.accessToken}`,
      )
      .expect(200)
      .expect({ data: { message: 'Sesión cerrada' } });
  });

  it('GET /api/test/admin-only - rol OPERARIO devuelve 403', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: operarioEmail, password })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/test/admin-only')
      .set(
        'Authorization',
        `Bearer ${(loginResponse.body as LoginResponseBody).data.accessToken}`,
      )
      .expect(403);
  });

  it('GET /api/test/admin-only - rol ADMIN accede correctamente', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/test/admin-only')
      .set(
        'Authorization',
        `Bearer ${(loginResponse.body as LoginResponseBody).data.accessToken}`,
      )
      .expect(200);
  });
});
