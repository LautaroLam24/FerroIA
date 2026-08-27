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

interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface UsersResponseBody {
  data: ApiUser[];
}

interface UserResponseBody {
  data: ApiUser;
}

interface ErrorResponseBody {
  error: string;
  details?: unknown;
}

interface LoginResponseBody {
  data: {
    accessToken: string;
    user: { id: string; email: string; name: string; role: string };
  };
}

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let operarioToken: string;

  const adminEmail = 'e2e-users-admin@ferreteria.local';
  const operarioEmail = 'e2e-users-operario@ferreteria.local';
  const password = 'Sup3rSecret!';

  function makeEmail(prefix: string): string {
    return `e2e-users-${prefix}-${Date.now()}@ferreteria.local`;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash, role: Role.ADMIN },
      create: {
        email: adminEmail,
        name: 'E2E Admin',
        passwordHash,
        role: Role.ADMIN,
      },
    });
    const operario = await prisma.user.upsert({
      where: { email: operarioEmail },
      update: { passwordHash, role: Role.OPERARIO },
      create: {
        email: operarioEmail,
        name: 'E2E Operario',
        passwordHash,
        role: Role.OPERARIO,
      },
    });

    adminToken = await jwtService.signAsync({
      sub: admin.id,
      email: admin.email,
      role: Role.ADMIN,
    });
    operarioToken = await jwtService.signAsync({
      sub: operario.id,
      email: operario.email,
      role: Role.OPERARIO,
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'e2e-users-' } },
    });
    await app.close();
  });

  describe('POST /api/users', () => {
    it('devuelve 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .send({
          email: makeEmail('sin-token'),
          name: 'Sin Token',
          password,
          role: 'OPERARIO',
        })
        .expect(401);
    });

    it('devuelve 403 para rol OPERARIO', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${operarioToken}`)
        .send({
          email: makeEmail('operario'),
          name: 'Operario',
          password,
          role: 'OPERARIO',
        })
        .expect(403);
    });

    it('alta exitosa devuelve 201 sin passwordHash', async () => {
      const email = makeEmail('alta');
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email,
          name: 'Nuevo Operario',
          password,
          role: 'OPERARIO',
        })
        .expect(201);

      const user = (response.body as UserResponseBody).data;
      expect(user.email).toBe(email);
      expect(user.name).toBe('Nuevo Operario');
      expect(user.role).toBe('OPERARIO');
      expect(user.id).toEqual(expect.any(String));
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('email duplicado devuelve 409', async () => {
      const email = makeEmail('duplicado');
      const payload = {
        email,
        name: 'Duplicado',
        password,
        role: 'OPERARIO',
      };

      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(409);

      expect((response.body as ErrorResponseBody).error).toBe(
        'El email ya está registrado',
      );
    });

    it('email inválido devuelve 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'no-es-un-email',
          name: 'Invalido',
          password,
          role: 'OPERARIO',
        })
        .expect(400);

      expect((response.body as ErrorResponseBody).details).toEqual(
        expect.any(Array),
      );
    });

    it('password débil devuelve 400', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: makeEmail('password'),
          name: 'Password Debil',
          password: '12345678',
          role: 'OPERARIO',
        })
        .expect(400);
    });

    it('rol inválido devuelve 400', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: makeEmail('rol'),
          name: 'Rol Invalido',
          password,
          role: 'GERENTE',
        })
        .expect(400);
    });

    it('campos desconocidos devuelve 400', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: makeEmail('campos'),
          name: 'Campos',
          password,
          role: 'OPERARIO',
          extra: 'no permitido',
        })
        .expect(400);
    });
  });

  describe('GET /api/users', () => {
    it('devuelve 401 sin token', async () => {
      await request(app.getHttpServer()).get('/api/users').expect(401);
    });

    it('devuelve 403 para rol OPERARIO', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${operarioToken}`)
        .expect(403);
    });

    it('listado devuelve 200 sin passwordHash', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: makeEmail('listado'),
          name: 'Listado',
          password,
          role: 'OPERARIO',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const users = (response.body as UsersResponseBody).data;
      expect(users.length).toBeGreaterThan(0);
      users.forEach((user) => {
        expect(user).not.toHaveProperty('passwordHash');
        expect(user.email).toEqual(expect.any(String));
      });
    });

    it('excluye del listado a los usuarios dados de baja', async () => {
      const email = makeEmail('baja-listado');
      const createdResponse = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email,
          name: 'Para Baja',
          password,
          role: 'OPERARIO',
        })
        .expect(201);

      const createdId = (createdResponse.body as UserResponseBody).data.id;

      await request(app.getHttpServer())
        .delete(`/api/users/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const users = (response.body as UsersResponseBody).data;
      expect(users.find((user) => user.id === createdId)).toBeUndefined();
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('devuelve 401 sin token', async () => {
      await request(app.getHttpServer())
        .delete('/api/users/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('devuelve 403 para rol OPERARIO', async () => {
      await request(app.getHttpServer())
        .delete('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${operarioToken}`)
        .expect(403);
    });

    it('baja exitosa devuelve 204', async () => {
      const createdResponse = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: makeEmail('baja'),
          name: 'Para Baja',
          password,
          role: 'OPERARIO',
        })
        .expect(201);

      const createdId = (createdResponse.body as UserResponseBody).data.id;

      await request(app.getHttpServer())
        .delete(`/api/users/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('usuario inexistente devuelve 404', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect((response.body as ErrorResponseBody).error).toBe(
        'Usuario no encontrado',
      );
    });

    it('baja de usuario ya dado de baja devuelve 404', async () => {
      const createdResponse = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: makeEmail('doble-baja'),
          name: 'Doble Baja',
          password,
          role: 'OPERARIO',
        })
        .expect(201);

      const createdId = (createdResponse.body as UserResponseBody).data.id;

      await request(app.getHttpServer())
        .delete(`/api/users/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .delete(`/api/users/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Login de usuario dado de baja', () => {
    it('devuelve 401 y no emite JWT', async () => {
      const email = makeEmail('dado-de-baja');
      const createdResponse = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email,
          name: 'Dado de Baja',
          password,
          role: 'OPERARIO',
        })
        .expect(201);

      const createdId = (createdResponse.body as UserResponseBody).data.id;

      await request(app.getHttpServer())
        .delete(`/api/users/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password })
        .expect(401);

      expect(
        (response.body as Partial<LoginResponseBody>).data,
      ).toBeUndefined();
      expect((response.body as ErrorResponseBody).error).toBe(
        'Credenciales inválidas',
      );
    });
  });
});
