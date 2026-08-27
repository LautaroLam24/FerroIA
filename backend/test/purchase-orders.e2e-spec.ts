import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OrdenCompraEstado,
  OrdenCompraOrigen,
  Prisma,
  Role,
} from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

interface ApiPurchaseOrder {
  id: string;
  estado: OrdenCompraEstado;
  origen: OrdenCompraOrigen;
  createdBy: string;
  createdAt: string;
  proveedor: { id: string; name: string };
  items: {
    id: string;
    cantidadSugerida: number;
    producto: { id: string; code: string; name: string };
  }[];
}

interface PurchaseOrderResponseBody {
  data: ApiPurchaseOrder;
}

interface ErrorResponseBody {
  error: string;
  details?: unknown;
}

describe('Purchase Orders (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let operarioToken: string;
  let categoryId: string;
  let supplierId: string;

  const adminEmail = 'e2e-po-admin@ferreteria.local';
  const operarioEmail = 'e2e-po-operario@ferreteria.local';
  const password = 'Sup3rSecret!';

  function makeCode(prefix: string): string {
    return `e2e-po-${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  async function createProduct(stock = 10) {
    return prisma.product.create({
      data: {
        name: makeCode('producto'),
        code: makeCode('codigo'),
        price: new Prisma.Decimal('100.00'),
        stock,
        stockMin: 1,
        categoryId,
        supplierId,
      },
    });
  }

  async function createDraft(token: string, productId: string) {
    const response = await request(app.getHttpServer())
      .post('/api/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        proveedorId: supplierId,
        items: [{ productoId: productId, cantidadSugerida: 5 }],
      })
      .expect(201);
    return (response.body as PurchaseOrderResponseBody).data;
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
        name: 'E2E PO Admin',
        passwordHash,
        role: Role.ADMIN,
      },
    });
    const operario = await prisma.user.upsert({
      where: { email: operarioEmail },
      update: { passwordHash, role: Role.OPERARIO },
      create: {
        email: operarioEmail,
        name: 'E2E PO Operario',
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
    await prisma.ordenCompraItem.deleteMany({
      where: { producto: { code: { startsWith: 'e2e-po-' } } },
    });
    await prisma.ordenCompra.deleteMany({
      where: { proveedor: { name: { startsWith: 'e2e-po-' } } },
    });
    await prisma.product.deleteMany({
      where: { code: { startsWith: 'e2e-po-' } },
    });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.supplier.deleteMany({ where: { id: supplierId } });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'e2e-po-' } },
    });
    await app.close();
  });

  describe('POST /api/purchase-orders', () => {
    it('devuelve 401 sin token', async () => {
      const product = await createProduct();
      await request(app.getHttpServer())
        .post('/api/purchase-orders')
        .send({
          proveedorId: supplierId,
          items: [{ productoId: product.id, cantidadSugerida: 5 }],
        })
        .expect(401);
    });

    it('creación manual devuelve 201, BORRADOR y origen MANUAL', async () => {
      const product = await createProduct();
      const order = await createDraft(operarioToken, product.id);

      expect(order.estado).toBe(OrdenCompraEstado.BORRADOR);
      expect(order.origen).toBe(OrdenCompraOrigen.MANUAL);
      expect(order.proveedor.id).toBe(supplierId);
      expect(order.items).toHaveLength(1);
    });

    it('proveedor inexistente devuelve 400', async () => {
      const product = await createProduct();
      const response = await request(app.getHttpServer())
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          proveedorId: '11111111-1111-4111-8111-111111111111',
          items: [{ productoId: product.id, cantidadSugerida: 5 }],
        })
        .expect(400);

      expect((response.body as ErrorResponseBody).error).toBeDefined();
    });

    it('producto inexistente devuelve 400', async () => {
      await request(app.getHttpServer())
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          proveedorId: supplierId,
          items: [
            {
              productoId: '11111111-1111-4111-8111-111111111111',
              cantidadSugerida: 5,
            },
          ],
        })
        .expect(400);
    });

    it('items vacíos devuelve 400', async () => {
      await request(app.getHttpServer())
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ proveedorId: supplierId, items: [] })
        .expect(400);
    });

    it('cantidadSugerida <= 0 devuelve 400', async () => {
      const product = await createProduct();
      await request(app.getHttpServer())
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          proveedorId: supplierId,
          items: [{ productoId: product.id, cantidadSugerida: 0 }],
        })
        .expect(400);
    });
  });

  describe('POST /api/purchase-orders/assistant', () => {
    it('crea un borrador con origen ASISTENTE', async () => {
      const product = await createProduct();
      const response = await request(app.getHttpServer())
        .post('/api/purchase-orders/assistant')
        .set('Authorization', `Bearer ${operarioToken}`)
        .send({
          proveedorId: supplierId,
          items: [{ productoId: product.id, cantidadSugerida: 5 }],
        })
        .expect(201);

      const order = (response.body as PurchaseOrderResponseBody).data;
      expect(order.estado).toBe(OrdenCompraEstado.BORRADOR);
      expect(order.origen).toBe(OrdenCompraOrigen.ASISTENTE);

      const listResponse = await request(app.getHttpServer())
        .get('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const orders = (listResponse.body as { data: ApiPurchaseOrder[] }).data;
      expect(orders.some((o) => o.id === order.id)).toBe(true);
    });
  });

  describe('GET /api/purchase-orders y /:id', () => {
    it('devuelve 401 sin token', async () => {
      await request(app.getHttpServer())
        .get('/api/purchase-orders')
        .expect(401);
    });

    it('listado devuelve 200 para ADMIN y OPERARIO', async () => {
      const product = await createProduct();
      await createDraft(adminToken, product.id);

      await request(app.getHttpServer())
        .get('/api/purchase-orders')
        .set('Authorization', `Bearer ${operarioToken}`)
        .expect(200);
    });

    it('detalle de una orden existente devuelve 200', async () => {
      const product = await createProduct();
      const order = await createDraft(adminToken, product.id);

      const response = await request(app.getHttpServer())
        .get(`/api/purchase-orders/${order.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect((response.body as PurchaseOrderResponseBody).data.id).toBe(
        order.id,
      );
    });

    it('detalle de una orden inexistente devuelve 404', async () => {
      await request(app.getHttpServer())
        .get('/api/purchase-orders/11111111-1111-4111-8111-111111111111')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/purchase-orders/:id/confirmar', () => {
    it('devuelve 401 sin token', async () => {
      const product = await createProduct();
      const order = await createDraft(adminToken, product.id);
      await request(app.getHttpServer())
        .patch(`/api/purchase-orders/${order.id}/confirmar`)
        .expect(401);
    });

    it('ADMIN confirma un BORRADOR: 200, CONFIRMADA, y el stock del producto no cambia', async () => {
      const product = await createProduct(10);
      const order = await createDraft(adminToken, product.id);

      const response = await request(app.getHttpServer())
        .patch(`/api/purchase-orders/${order.id}/confirmar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect((response.body as PurchaseOrderResponseBody).data.estado).toBe(
        OrdenCompraEstado.CONFIRMADA,
      );

      const productAfter = await prisma.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(productAfter.stock).toBe(10);

      const movements = await prisma.stockMovement.findMany({
        where: { productId: product.id },
      });
      expect(movements).toHaveLength(0);
    });

    it('OPERARIO intenta confirmar: 403', async () => {
      const product = await createProduct();
      const order = await createDraft(adminToken, product.id);

      await request(app.getHttpServer())
        .patch(`/api/purchase-orders/${order.id}/confirmar`)
        .set('Authorization', `Bearer ${operarioToken}`)
        .expect(403);
    });

    it('confirmar una orden ya CONFIRMADA devuelve 409', async () => {
      const product = await createProduct();
      const order = await createDraft(adminToken, product.id);
      await request(app.getHttpServer())
        .patch(`/api/purchase-orders/${order.id}/confirmar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/purchase-orders/${order.id}/confirmar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });
  });

  describe('PATCH /api/purchase-orders/:id/cancelar', () => {
    it('ADMIN cancela un BORRADOR: 200, CANCELADA', async () => {
      const product = await createProduct();
      const order = await createDraft(adminToken, product.id);

      const response = await request(app.getHttpServer())
        .patch(`/api/purchase-orders/${order.id}/cancelar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect((response.body as PurchaseOrderResponseBody).data.estado).toBe(
        OrdenCompraEstado.CANCELADA,
      );
    });

    it('OPERARIO intenta cancelar: 403', async () => {
      const product = await createProduct();
      const order = await createDraft(adminToken, product.id);

      await request(app.getHttpServer())
        .patch(`/api/purchase-orders/${order.id}/cancelar`)
        .set('Authorization', `Bearer ${operarioToken}`)
        .expect(403);
    });

    it('cancelar una orden ya CANCELADA devuelve 409', async () => {
      const product = await createProduct();
      const order = await createDraft(adminToken, product.id);
      await request(app.getHttpServer())
        .patch(`/api/purchase-orders/${order.id}/cancelar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/purchase-orders/${order.id}/cancelar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });
  });
});
