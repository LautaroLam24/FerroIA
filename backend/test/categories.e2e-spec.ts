import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

interface ApiCategory {
  id: string;
  name: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryResponseBody {
  data: ApiCategory;
}

interface CategoriesResponseBody {
  data: ApiCategory[];
}

interface ErrorResponseBody {
  error: string;
  details?: unknown;
}

describe('Categories (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let operarioToken: string;

  const adminEmail = 'e2e-categories-admin@ferreteria.local';
  const operarioEmail = 'e2e-categories-operario@ferreteria.local';
  const password = 'Sup3rSecret!';

  function makeName(prefix: string): string {
    return `e2e-cat-${prefix}-${Date.now()}`;
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
        name: 'E2E Categories Admin',
        passwordHash,
        role: Role.ADMIN,
      },
    });
    const operario = await prisma.user.upsert({
      where: { email: operarioEmail },
      update: { passwordHash, role: Role.OPERARIO },
      create: {
        email: operarioEmail,
        name: 'E2E Categories Operario',
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
    await prisma.product.deleteMany({
      where: { name: { startsWith: 'e2e-cat-producto' } },
    });
    await prisma.category.deleteMany({
      where: { name: { startsWith: 'e2e-cat-' } },
    });
    await prisma.supplier.deleteMany({
      where: { name: { startsWith: 'e2e-cat-proveedor' } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'e2e-categories-' } },
    });
    await app.close();
  });

  describe('POST /api/categories', () => {
    it('devuelve 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/categories')
        .send({ name: makeName('sin-token') })
        .expect(401);
    });

    it('devuelve 403 para rol OPERARIO', async () => {
      await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${operarioToken}`)
        .send({ name: makeName('operario') })
        .expect(403);
    });

    it('alta exitosa devuelve 201', async () => {
      const name = makeName('alta');
      const response = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name })
        .expect(201);

      const category = (response.body as CategoryResponseBody).data;
      expect(category.id).toEqual(expect.any(String));
      expect(category.name).toBe(name);
    });

    it('nombre duplicado devuelve 409', async () => {
      const name = makeName('duplicado');
      await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name })
        .expect(409);

      expect((response.body as ErrorResponseBody).error).toBe(
        'Ya existe una categoría con ese nombre',
      );
    });

    it('body inválido devuelve 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '' })
        .expect(400);

      expect((response.body as ErrorResponseBody).details).toEqual(
        expect.any(Array),
      );
    });

    it('campos desconocidos devuelve 400', async () => {
      await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: makeName('campos'), extra: 'no permitido' })
        .expect(400);
    });
  });

  describe('GET /api/categories', () => {
    it('devuelve 401 sin token', async () => {
      await request(app.getHttpServer()).get('/api/categories').expect(401);
    });

    it('devuelve 403 para rol OPERARIO', async () => {
      await request(app.getHttpServer())
        .get('/api/categories')
        .set('Authorization', `Bearer ${operarioToken}`)
        .expect(403);
    });

    it('listado devuelve 200 con productCount', async () => {
      await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: makeName('listado') })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const categories = (response.body as CategoriesResponseBody).data;
      expect(categories.length).toBeGreaterThan(0);
      categories.forEach((category) => {
        expect(category.id).toEqual(expect.any(String));
        expect(category.name).toEqual(expect.any(String));
        expect(category.productCount).toEqual(expect.any(Number));
      });
    });
  });

  describe('PATCH /api/categories/:id', () => {
    it('edición exitosa devuelve 200', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: makeName('edicion') })
        .expect(201);
      const createdId = (created.body as CategoryResponseBody).data.id;

      const response = await request(app.getHttpServer())
        .patch(`/api/categories/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: makeName('edicion-renombrada') })
        .expect(200);

      expect((response.body as CategoryResponseBody).data.name).toMatch(
        /edicion-renombrada/,
      );
    });

    it('categoría inexistente devuelve 404', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: makeName('404') })
        .expect(404);

      expect((response.body as ErrorResponseBody).error).toBe(
        'Categoría no encontrada',
      );
    });

    it('nombre duplicado al editar devuelve 409', async () => {
      const nameA = makeName('dup-a');
      const nameB = makeName('dup-b');
      const a = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: nameA })
        .expect(201);
      const b = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: nameB })
        .expect(201);
      const aId = (a.body as CategoryResponseBody).data.id;
      void b;

      const response = await request(app.getHttpServer())
        .patch(`/api/categories/${aId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: nameB })
        .expect(409);

      expect((response.body as ErrorResponseBody).error).toBe(
        'Ya existe una categoría con ese nombre',
      );
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('baja exitosa devuelve 204', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: makeName('baja') })
        .expect(201);
      const createdId = (created.body as CategoryResponseBody).data.id;

      await request(app.getHttpServer())
        .delete(`/api/categories/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('categoría inexistente devuelve 404', async () => {
      await request(app.getHttpServer())
        .delete('/api/categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('baja con productos activos asociados devuelve 409', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: makeName('con-productos') })
        .expect(201);
      const createdId = (created.body as CategoryResponseBody).data.id;

      const supplier = await prisma.supplier.create({
        data: { name: makeName('proveedor') },
      });
      await prisma.product.create({
        data: {
          name: 'e2e-cat-producto-asociado',
          code: makeName('codigo-asociado'),
          price: new Prisma.Decimal('10.00'),
          stock: 5,
          stockMin: 1,
          categoryId: createdId,
          supplierId: supplier.id,
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/categories/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect((response.body as ErrorResponseBody).error).toBe(
        'No se puede eliminar: la categoría tiene productos asociados',
      );

      const stillExists = await prisma.category.findUnique({
        where: { id: createdId },
        select: { id: true },
      });
      expect(stillExists).not.toBeNull();
    });

    it('bloquea la baja aunque los productos asociados estén dados de baja', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: makeName('sin-activos') })
        .expect(201);
      const createdId = (created.body as CategoryResponseBody).data.id;

      const supplier = await prisma.supplier.create({
        data: { name: makeName('proveedor-baja') },
      });
      await prisma.product.create({
        data: {
          name: 'e2e-cat-producto-baja',
          code: makeName('codigo-baja'),
          price: new Prisma.Decimal('10.00'),
          stock: 5,
          stockMin: 1,
          categoryId: createdId,
          supplierId: supplier.id,
          deletedAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/categories/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect((response.body as ErrorResponseBody).error).toBe(
        'No se puede eliminar: la categoría tiene productos asociados',
      );
    });
  });
});
