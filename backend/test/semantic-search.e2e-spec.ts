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

interface SemanticSearchResponseBody {
  data: Array<{ id: string; code: string }>;
  message?: string;
}

describe('Semantic search (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let operarioToken: string;
  let categoryId: string;
  let supplierId: string;

  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  let searchResults: Array<{ id: string; score: number }>;

  const adminEmail = 'e2e-semantic-admin@ferreteria.local';
  const operarioEmail = 'e2e-semantic-operario@ferreteria.local';
  const password = 'Sup3rSecret!';

  function makeCode(prefix: string): string {
    return `e2e-sem-${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
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
        name: 'E2E Semantic Admin',
        passwordHash,
        role: Role.ADMIN,
      },
    });
    const operario = await prisma.user.upsert({
      where: { email: operarioEmail },
      update: { passwordHash, role: Role.OPERARIO },
      create: {
        email: operarioEmail,
        name: 'E2E Semantic Operario',
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
    await prisma.product.deleteMany({
      where: { code: { startsWith: 'e2e-sem-' } },
    });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.supplier.deleteMany({ where: { id: supplierId } });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'e2e-semantic-' } },
    });
    await app.close();
  });

  beforeEach(() => {
    searchResults = [];
    fetchMock = jest.fn((url: string) => {
      if (typeof url === 'string' && url.includes('/products/search')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ results: searchResults }),
        });
      }
      // Llamadas del listener de indexación disparadas por el alta de productos
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ indexed: 1 }),
      });
    });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  async function createProduct(name: string, stock = 10, stockMin = 2) {
    const response = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name,
        code: makeCode('prod'),
        description: 'Producto de prueba',
        price: 100,
        stock,
        stockMin,
        categoryId,
        supplierId,
      })
      .expect(201);
    return (response.body as { data: { id: string; code: string } }).data;
  }

  it('recupera un producto por similitud aunque el nombre no coincida literalmente', async () => {
    const latex = await createProduct('Látex Interior Blanco 20L');
    searchResults = [{ id: latex.id, score: 0.87 }];

    const response = await request(app.getHttpServer())
      .get('/api/products/semantic?q=pintura blanca lavable para interior')
      .set('Authorization', `Bearer ${operarioToken}`)
      .expect(200);

    const body = response.body as SemanticSearchResponseBody;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(latex.id);
  });

  it('consulta sin resultados relevantes devuelve data vacía con mensaje claro', async () => {
    searchResults = [];

    const response = await request(app.getHttpServer())
      .get('/api/products/semantic?q=algo sin relación con el catálogo')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as SemanticSearchResponseBody;
    expect(body.data).toEqual([]);
    expect(body.message).toBeTruthy();
  });

  it('un producto dado de baja no aparece en los resultados', async () => {
    const product = await createProduct('Producto a dar de baja');
    await request(app.getHttpServer())
      .delete(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    searchResults = [{ id: product.id, score: 0.95 }];

    const response = await request(app.getHttpServer())
      .get('/api/products/semantic?q=producto de baja')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as SemanticSearchResponseBody;
    expect(body.data.find((p) => p.id === product.id)).toBeUndefined();
  });

  it('accesible para ADMIN y OPERARIO', async () => {
    searchResults = [];
    await request(app.getHttpServer())
      .get('/api/products/semantic?q=cualquier cosa')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/products/semantic?q=cualquier cosa')
      .set('Authorization', `Bearer ${operarioToken}`)
      .expect(200);
  });

  it('sin token responde 401', async () => {
    await request(app.getHttpServer())
      .get('/api/products/semantic?q=algo')
      .expect(401);
  });

  it('consulta vacía responde 400', async () => {
    await request(app.getHttpServer())
      .get('/api/products/semantic?q=')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('servicio de embeddings caído responde 502', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/products/search')) {
        return Promise.reject(new Error('connect ECONNREFUSED'));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
    });

    const response = await request(app.getHttpServer())
      .get('/api/products/semantic?q=pintura')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(502);

    expect((response.body as { error: string }).error).toBeTruthy();
  });
});
