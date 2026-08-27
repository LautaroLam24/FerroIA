import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role, StockMovementType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

interface ApiMovement {
  id: string;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  date: string;
  productId: string;
  userId: string;
}

interface MovementResponseBody {
  data: ApiMovement;
}

interface MovementsResponseBody {
  data: ApiMovement[];
}

interface ErrorResponseBody {
  error: string;
  details?: unknown;
}

describe('Stock (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let operarioToken: string;
  let categoryId: string;
  let supplierId: string;

  const adminEmail = 'e2e-stock-admin@ferreteria.local';
  const operarioEmail = 'e2e-stock-operario@ferreteria.local';
  const password = 'Sup3rSecret!';

  function makeCode(prefix: string): string {
    return `e2e-stock-${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  async function createProduct(stock: number, deletedAt: Date | null = null) {
    return prisma.product.create({
      data: {
        name: makeCode('producto'),
        code: makeCode('codigo'),
        price: new Prisma.Decimal('100.00'),
        stock,
        stockMin: 1,
        categoryId,
        supplierId,
        deletedAt,
      },
    });
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
        name: 'E2E Stock Admin',
        passwordHash,
        role: Role.ADMIN,
      },
    });
    const operario = await prisma.user.upsert({
      where: { email: operarioEmail },
      update: { passwordHash, role: Role.OPERARIO },
      create: {
        email: operarioEmail,
        name: 'E2E Stock Operario',
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

    const category = await prisma.category.create({
      data: { name: makeCode('categoria') },
    });
    const supplier = await prisma.supplier.create({
      data: { name: makeCode('proveedor') },
    });
    categoryId = category.id;
    supplierId = supplier.id;
  });

  afterAll(async () => {
    await prisma.stockMovement.deleteMany({
      where: { product: { code: { startsWith: 'e2e-stock-' } } },
    });
    await prisma.product.deleteMany({
      where: { code: { startsWith: 'e2e-stock-' } },
    });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.supplier.deleteMany({ where: { id: supplierId } });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'e2e-stock-' } },
    });
    await app.close();
  });

  describe('POST /api/stock/entries', () => {
    it('devuelve 401 sin token', async () => {
      const product = await createProduct(10);
      await request(app.getHttpServer())
        .post('/api/stock/entries')
        .send({ productId: product.id, quantity: 1, reason: 'x' })
        .expect(401);
    });

    it('entrada exitosa devuelve 201 e incrementa el stock', async () => {
      const product = await createProduct(10);

      const response = await request(app.getHttpServer())
        .post('/api/stock/entries')
        .set('Authorization', `Bearer ${operarioToken}`)
        .send({ productId: product.id, quantity: 5, reason: 'Reposición' })
        .expect(201);

      const movement = (response.body as MovementResponseBody).data;
      expect(movement.type).toBe(StockMovementType.ENTRADA);
      expect(movement.quantity).toBe(5);

      const updated = await prisma.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(updated.stock).toBe(15);
    });

    it('cantidad <= 0 devuelve 400', async () => {
      const product = await createProduct(10);
      await request(app.getHttpServer())
        .post('/api/stock/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product.id, quantity: 0, reason: 'x' })
        .expect(400);
    });

    it('producto inexistente devuelve 404', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/stock/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: '11111111-1111-4111-8111-111111111111',
          quantity: 1,
          reason: 'x',
        })
        .expect(404);

      expect((response.body as ErrorResponseBody).error).toBe(
        'Producto no encontrado',
      );
    });

    it('producto dado de baja devuelve 409', async () => {
      const product = await createProduct(10, new Date());

      const response = await request(app.getHttpServer())
        .post('/api/stock/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product.id, quantity: 1, reason: 'x' })
        .expect(409);

      expect((response.body as ErrorResponseBody).error).toBe(
        'El producto está dado de baja',
      );
    });
  });

  describe('POST /api/stock/sales', () => {
    it('devuelve 401 sin token', async () => {
      const product = await createProduct(10);
      await request(app.getHttpServer())
        .post('/api/stock/sales')
        .send({ productId: product.id, quantity: 1 })
        .expect(401);
    });

    it('venta exitosa devuelve 201 y decrementa el stock', async () => {
      const product = await createProduct(10);

      const response = await request(app.getHttpServer())
        .post('/api/stock/sales')
        .set('Authorization', `Bearer ${operarioToken}`)
        .send({ productId: product.id, quantity: 4 })
        .expect(201);

      const movement = (response.body as MovementResponseBody).data;
      expect(movement.type).toBe(StockMovementType.VENTA);

      const updated = await prisma.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(updated.stock).toBe(6);
    });

    it('cantidad mayor al stock disponible devuelve 409 y no modifica el stock', async () => {
      const product = await createProduct(2);

      const response = await request(app.getHttpServer())
        .post('/api/stock/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product.id, quantity: 5 })
        .expect(409);

      expect((response.body as ErrorResponseBody).error).toBe(
        'Stock insuficiente',
      );

      const unchanged = await prisma.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(unchanged.stock).toBe(2);
    });

    it('cantidad <= 0 devuelve 400', async () => {
      const product = await createProduct(10);
      await request(app.getHttpServer())
        .post('/api/stock/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product.id, quantity: -1 })
        .expect(400);
    });

    it('producto inexistente devuelve 404', async () => {
      await request(app.getHttpServer())
        .post('/api/stock/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: '11111111-1111-4111-8111-111111111111',
          quantity: 1,
        })
        .expect(404);
    });

    it('producto dado de baja devuelve 409', async () => {
      const product = await createProduct(10, new Date());

      const response = await request(app.getHttpServer())
        .post('/api/stock/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product.id, quantity: 1 })
        .expect(409);

      expect((response.body as ErrorResponseBody).error).toBe(
        'El producto está dado de baja',
      );
    });

    it('dos ventas concurrentes sobre el último stock: una 201, otra 409, stock final 0', async () => {
      const product = await createProduct(1);

      const [first, second] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/stock/sales')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ productId: product.id, quantity: 1 }),
        request(app.getHttpServer())
          .post('/api/stock/sales')
          .set('Authorization', `Bearer ${operarioToken}`)
          .send({ productId: product.id, quantity: 1 }),
      ]);

      const statuses = [first.status, second.status].sort();
      expect(statuses).toEqual([201, 409]);

      const final = await prisma.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(final.stock).toBe(0);

      const movements = await prisma.stockMovement.findMany({
        where: { productId: product.id, type: StockMovementType.VENTA },
      });
      expect(movements).toHaveLength(1);
    });
  });

  describe('GET /api/stock/movements', () => {
    it('devuelve 401 sin token', async () => {
      await request(app.getHttpServer())
        .get('/api/stock/movements')
        .expect(401);
    });

    it('listado sin filtros devuelve 200', async () => {
      const product = await createProduct(10);
      await request(app.getHttpServer())
        .post('/api/stock/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product.id, quantity: 1, reason: 'x' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/stock/movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const movements = (response.body as MovementsResponseBody).data;
      expect(movements.length).toBeGreaterThan(0);
    });

    it('filtra por productId', async () => {
      const product = await createProduct(10);
      await request(app.getHttpServer())
        .post('/api/stock/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product.id, quantity: 1, reason: 'x' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/stock/movements?productId=${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const movements = (response.body as MovementsResponseBody).data;
      expect(movements.length).toBeGreaterThan(0);
      movements.forEach((movement) => {
        expect(movement.productId).toBe(product.id);
      });
    });

    it('filtra por rango de fechas', async () => {
      const product = await createProduct(10);
      await request(app.getHttpServer())
        .post('/api/stock/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product.id, quantity: 1, reason: 'x' })
        .expect(201);

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const response = await request(app.getHttpServer())
        .get(
          `/api/stock/movements?productId=${product.id}&from=2000-01-01&to=${tomorrow}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const movements = (response.body as MovementsResponseBody).data;
      expect(movements.length).toBeGreaterThan(0);

      const emptyRange = await request(app.getHttpServer())
        .get(
          `/api/stock/movements?productId=${product.id}&from=2000-01-01&to=2000-01-02`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect((emptyRange.body as MovementsResponseBody).data).toHaveLength(0);
    });
  });
});
