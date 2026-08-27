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

interface DashboardAlert {
  id: string;
  code: string;
  name: string;
  stock: number;
  stockMin: number;
  category: { id: string; name: string };
}

interface RecentMovement {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  date: string;
  product: { id: string; name: string; code: string };
  user: { id: string; name: string; email: string };
}

interface DashboardResponseBody {
  data: {
    alerts: DashboardAlert[];
    totalInventoryValue: number;
    recentMovements: RecentMovement[];
  };
}

describe('Dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let operarioToken: string;
  let categoryId: string;
  let supplierId: string;

  const adminEmail = 'e2e-dashboard-admin@ferreteria.local';
  const operarioEmail = 'e2e-dashboard-operario@ferreteria.local';
  const password = 'Sup3rSecret!';

  function makeCode(prefix: string): string {
    return `e2e-dashboard-${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  async function createProduct(
    stock: number,
    stockMin: number,
    price: number,
    deletedAt: Date | null = null,
  ) {
    return prisma.product.create({
      data: {
        name: makeCode('producto'),
        code: makeCode('codigo'),
        price: new Prisma.Decimal(price),
        stock,
        stockMin,
        categoryId,
        supplierId,
        deletedAt,
      },
    });
  }

  beforeEach(async () => {
    await prisma.stockMovement.deleteMany({
      where: { product: { code: { startsWith: 'e2e-dashboard-' } } },
    });
    await prisma.product.deleteMany({
      where: { code: { startsWith: 'e2e-dashboard-' } },
    });
  });

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
        name: 'E2E Dashboard Admin',
        passwordHash,
        role: Role.ADMIN,
      },
    });
    const operario = await prisma.user.upsert({
      where: { email: operarioEmail },
      update: { passwordHash, role: Role.OPERARIO },
      create: {
        email: operarioEmail,
        name: 'E2E Dashboard Operario',
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
      where: { product: { code: { startsWith: 'e2e-dashboard-' } } },
    });
    await prisma.product.deleteMany({
      where: { code: { startsWith: 'e2e-dashboard-' } },
    });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.supplier.deleteMany({ where: { id: supplierId } });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'e2e-dashboard-' } },
    });
    await app.close();
  });

  it('devuelve 401 sin token', async () => {
    await request(app.getHttpServer()).get('/api/dashboard').expect(401);
  });

  it('respuesta completa con datos para ADMIN', async () => {
    const low = await createProduct(0, 5, 100);
    const high = await createProduct(10, 1, 200);

    const response = await request(app.getHttpServer())
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as DashboardResponseBody;
    expect(body.data).toBeDefined();
    expect(body.data.alerts).toBeDefined();
    expect(body.data.totalInventoryValue).toBeDefined();
    expect(body.data.recentMovements).toBeDefined();

    const alertCodes = body.data.alerts.map((alert) => alert.code);
    expect(alertCodes).toContain(low.code);
    expect(alertCodes).not.toContain(high.code);

    expect(body.data.totalInventoryValue).toBeGreaterThan(0);
  });

  it('respuesta completa con datos para OPERARIO', async () => {
    await createProduct(2, 5, 100);

    const response = await request(app.getHttpServer())
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${operarioToken}`)
      .expect(200);

    const body = response.body as DashboardResponseBody;
    expect(body.data.alerts.length).toBeGreaterThan(0);
    expect(body.data.totalInventoryValue).toBeGreaterThan(0);
  });

  it('alertas ordenadas por stock ascendente (mayor urgencia primero)', async () => {
    const a = await createProduct(4, 5, 100);
    const b = await createProduct(1, 5, 100);
    const c = await createProduct(5, 5, 100);

    const response = await request(app.getHttpServer())
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as DashboardResponseBody;
    const ownCodes = [a.code, b.code, c.code];
    const own = body.data.alerts
      .filter((alert) => ownCodes.includes(alert.code))
      .map((alert) => alert.stock);
    expect(own).toEqual([1, 4, 5]);
  });

  it('no genera alertas un producto con stock por encima del mínimo', async () => {
    const healthy = await createProduct(10, 1, 100);

    const response = await request(app.getHttpServer())
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as DashboardResponseBody;
    expect(body.data.alerts.map((alert) => alert.code)).not.toContain(
      healthy.code,
    );
  });

  it('la valorización excluye productos dados de baja', async () => {
    await createProduct(50, 1, 100, new Date());

    const response = await request(app.getHttpServer())
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as DashboardResponseBody;

    const rows = await prisma.$queryRaw<{ total: number }[]>`
      SELECT COALESCE(SUM("price" * stock), 0)::float8 AS "total"
      FROM "products"
      WHERE "deletedAt" IS NULL
    `;
    const expectedActive = Number(rows[0]?.total ?? 0);

    expect(body.data.totalInventoryValue).toBe(expectedActive);
  });

  it('incluye producto y usuario en los movimientos recientes', async () => {
    const product = await createProduct(10, 1, 100);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: adminEmail },
    });
    await prisma.stockMovement.create({
      data: {
        type: 'ENTRADA',
        quantity: 3,
        reason: 'Reposición',
        productId: product.id,
        userId: user.id,
      },
    });

    const response = await request(app.getHttpServer())
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as DashboardResponseBody;
    expect(body.data.recentMovements.length).toBeGreaterThan(0);
    body.data.recentMovements.forEach((movement) => {
      expect(movement.product).toBeDefined();
      expect(movement.product.name).toBeTruthy();
      expect(movement.user).toBeDefined();
      expect(movement.user.email).toBeTruthy();
    });
  });
});
