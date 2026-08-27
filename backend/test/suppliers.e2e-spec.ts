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

interface ApiSupplier {
  id: string;
  name: string;
  contact: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SupplierResponseBody {
  data: ApiSupplier;
}

interface SuppliersResponseBody {
  data: ApiSupplier[];
}

interface ErrorResponseBody {
  error: string;
  details?: unknown;
}

describe('Suppliers (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let operarioToken: string;

  const adminEmail = 'e2e-suppliers-admin@ferreteria.local';
  const operarioEmail = 'e2e-suppliers-operario@ferreteria.local';
  const password = 'Sup3rSecret!';

  function makeName(prefix: string): string {
    return `e2e-sup-${prefix}-${Date.now()}`;
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
        name: 'E2E Suppliers Admin',
        passwordHash,
        role: Role.ADMIN,
      },
    });
    const operario = await prisma.user.upsert({
      where: { email: operarioEmail },
      update: { passwordHash, role: Role.OPERARIO },
      create: {
        email: operarioEmail,
        name: 'E2E Suppliers Operario',
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
      where: { name: { startsWith: 'e2e-sup-producto' } },
    });
    await prisma.category.deleteMany({
      where: { name: { startsWith: 'e2e-sup-categoria' } },
    });
    await prisma.supplier.deleteMany({
      where: { name: { startsWith: 'e2e-sup-' } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'e2e-suppliers-' } },
    });
    await app.close();
  });

  describe('POST /api/suppliers', () => {
    it('devuelve 401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/api/suppliers')
        .send({ name: makeName('sin-token') })
        .expect(401);
    });

    it('devuelve 403 para rol OPERARIO', async () => {
      await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${operarioToken}`)
        .send({ name: makeName('operario') })
        .expect(403);
    });

    it('alta exitosa devuelve 201 con contacto', async () => {
      const name = makeName('alta');
      const response = await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name, contact: 'contacto@mail.com' })
        .expect(201);

      const supplier = (response.body as SupplierResponseBody).data;
      expect(supplier.id).toEqual(expect.any(String));
      expect(supplier.name).toBe(name);
      expect(supplier.contact).toBe('contacto@mail.com');
    });

    it('alta sin contacto devuelve 201 con contact nulo', async () => {
      const name = makeName('sin-contacto');
      const response = await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name })
        .expect(201);

      expect((response.body as SupplierResponseBody).data.contact).toBeNull();
    });

    it('nombre duplicado devuelve 409', async () => {
      const name = makeName('duplicado');
      await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name })
        .expect(409);

      expect((response.body as ErrorResponseBody).error).toBe(
        'Ya existe un proveedor con ese nombre',
      );
    });

    it('body inválido devuelve 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '' })
        .expect(400);

      expect((response.body as ErrorResponseBody).details).toEqual(
        expect.any(Array),
      );
    });

    it('contact no string devuelve 400', async () => {
      await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: makeName('contact-invalido'), contact: 123 })
        .expect(400);
    });
  });

  describe('GET /api/suppliers', () => {
    it('devuelve 401 sin token', async () => {
      await request(app.getHttpServer()).get('/api/suppliers').expect(401);
    });

    it('devuelve 403 para rol OPERARIO', async () => {
      await request(app.getHttpServer())
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${operarioToken}`)
        .expect(403);
    });

    it('listado devuelve 200 con productCount', async () => {
      await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: makeName('listado'), contact: 'x@mail.com' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const suppliers = (response.body as SuppliersResponseBody).data;
      expect(suppliers.length).toBeGreaterThan(0);
      suppliers.forEach((supplier) => {
        expect(supplier.id).toEqual(expect.any(String));
        expect(supplier.name).toEqual(expect.any(String));
        expect(supplier.productCount).toEqual(expect.any(Number));
        expect('contact' in supplier).toBe(true);
      });
    });
  });

  describe('PATCH /api/suppliers/:id', () => {
    it('edición exitosa devuelve 200', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: makeName('edicion'), contact: 'viejo@mail.com' })
        .expect(201);
      const createdId = (created.body as SupplierResponseBody).data.id;

      const response = await request(app.getHttpServer())
        .patch(`/api/suppliers/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ contact: 'nuevo@mail.com' })
        .expect(200);

      expect((response.body as SupplierResponseBody).data.contact).toBe(
        'nuevo@mail.com',
      );
    });

    it('proveedor inexistente devuelve 404', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/suppliers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ contact: 'x@mail.com' })
        .expect(404);

      expect((response.body as ErrorResponseBody).error).toBe(
        'Proveedor no encontrado',
      );
    });

    it('nombre duplicado al editar devuelve 409', async () => {
      const nameA = makeName('dup-a');
      const nameB = makeName('dup-b');
      const a = await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: nameA })
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: nameB })
        .expect(201);
      const aId = (a.body as SupplierResponseBody).data.id;

      const response = await request(app.getHttpServer())
        .patch(`/api/suppliers/${aId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: nameB })
        .expect(409);

      expect((response.body as ErrorResponseBody).error).toBe(
        'Ya existe un proveedor con ese nombre',
      );
    });
  });

  describe('DELETE /api/suppliers/:id', () => {
    it('baja exitosa devuelve 204', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: makeName('baja') })
        .expect(201);
      const createdId = (created.body as SupplierResponseBody).data.id;

      await request(app.getHttpServer())
        .delete(`/api/suppliers/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('proveedor inexistente devuelve 404', async () => {
      await request(app.getHttpServer())
        .delete('/api/suppliers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('baja con productos activos asociados devuelve 409', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: makeName('con-productos') })
        .expect(201);
      const createdId = (created.body as SupplierResponseBody).data.id;

      const category = await prisma.category.create({
        data: { name: makeName('categoria') },
      });
      await prisma.product.create({
        data: {
          name: 'e2e-sup-producto-asociado',
          code: makeName('codigo-asociado'),
          price: new Prisma.Decimal('10.00'),
          stock: 5,
          stockMin: 1,
          categoryId: category.id,
          supplierId: createdId,
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/suppliers/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect((response.body as ErrorResponseBody).error).toBe(
        'No se puede eliminar: el proveedor tiene productos asociados',
      );

      const stillExists = await prisma.supplier.findUnique({
        where: { id: createdId },
        select: { id: true },
      });
      expect(stillExists).not.toBeNull();
    });

    it('bloquea la baja aunque los productos asociados estén dados de baja', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: makeName('sin-activos') })
        .expect(201);
      const createdId = (created.body as SupplierResponseBody).data.id;

      const category = await prisma.category.create({
        data: { name: makeName('categoria-baja') },
      });
      await prisma.product.create({
        data: {
          name: 'e2e-sup-producto-baja',
          code: makeName('codigo-baja'),
          price: new Prisma.Decimal('10.00'),
          stock: 5,
          stockMin: 1,
          categoryId: category.id,
          supplierId: createdId,
          deletedAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/suppliers/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect((response.body as ErrorResponseBody).error).toBe(
        'No se puede eliminar: el proveedor tiene productos asociados',
      );
    });
  });
});
