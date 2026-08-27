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

interface ChatResponseBody {
  data: { conversation_id: string; answer: string };
}

describe('Chatbot (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let operarioToken: string;

  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  const operarioEmail = 'e2e-chatbot-operario@ferreteria.local';
  const password = 'Sup3rSecret!';

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
    const operario = await prisma.user.upsert({
      where: { email: operarioEmail },
      update: { passwordHash, role: Role.OPERARIO },
      create: {
        email: operarioEmail,
        name: 'E2E Chatbot Operario',
        passwordHash,
        role: Role.OPERARIO,
      },
    });

    operarioToken = await jwtService.signAsync({
      sub: operario.id,
      email: operario.email,
      role: Role.OPERARIO,
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: operarioEmail } });
    await app.close();
  });

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('primera pregunta sin conversation_id crea una conversación nueva (200)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          conversation_id: 'conv-nueva-1234',
          answer:
            'Podés registrar una entrada de stock desde la sección Stock.',
        }),
    });

    const response = await request(app.getHttpServer())
      .post('/api/chatbot')
      .set('Authorization', `Bearer ${operarioToken}`)
      .send({ question: '¿cómo registro una entrada de stock?' })
      .expect(200);

    const body = response.body as ChatResponseBody;
    expect(body.data.conversation_id).toBe('conv-nueva-1234');
    expect(body.data.answer).toBeTruthy();

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sentBody = JSON.parse(options.body as string) as {
      conversation_id?: string;
      auth_token?: string;
    };
    expect(sentBody.conversation_id).toBeUndefined();
    expect(sentBody.auth_token).toBe(operarioToken);
  });

  it('segunda pregunta con el mismo conversation_id reutiliza el historial', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            conversation_id: 'conv-hilo-5678',
            answer: 'Solo el rol ADMIN puede dar de baja un producto.',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            conversation_id: 'conv-hilo-5678',
            answer: 'Lo puede hacer un usuario con rol ADMIN.',
          }),
      });

    const first = await request(app.getHttpServer())
      .post('/api/chatbot')
      .set('Authorization', `Bearer ${operarioToken}`)
      .send({ question: '¿quién puede dar de baja un producto?' })
      .expect(200);

    const firstBody = first.body as ChatResponseBody;

    const second = await request(app.getHttpServer())
      .post('/api/chatbot')
      .set('Authorization', `Bearer ${operarioToken}`)
      .send({
        question: '¿y eso quién puede hacerlo?',
        conversation_id: firstBody.data.conversation_id,
      })
      .expect(200);

    const secondBody = second.body as ChatResponseBody;
    expect(secondBody.data.conversation_id).toBe(
      firstBody.data.conversation_id,
    );
    expect(secondBody.data.answer).toMatch(/ADMIN/);

    const [, secondOptions] = fetchMock.mock.calls[1] as [string, RequestInit];
    const secondSentBody = JSON.parse(secondOptions.body as string) as {
      conversation_id?: string;
    };
    expect(secondSentBody.conversation_id).toBe('conv-hilo-5678');
  });

  it('pregunta fuera de contexto responde que no tiene esa información', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          conversation_id: 'conv-fuera-contexto',
          answer: 'No cuento con esa información en el contexto disponible.',
        }),
    });

    const response = await request(app.getHttpServer())
      .post('/api/chatbot')
      .set('Authorization', `Bearer ${operarioToken}`)
      .send({ question: '¿qué tiempo hace mañana?' })
      .expect(200);

    const body = response.body as ChatResponseBody;
    expect(body.data.answer.toLowerCase()).toContain(
      'no cuento con esa información',
    );
  });

  it('servicio Python caído responde 502 con error claro', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const response = await request(app.getHttpServer())
      .post('/api/chatbot')
      .set('Authorization', `Bearer ${operarioToken}`)
      .send({ question: 'hola' })
      .expect(502);

    const body = response.body as { error: string };
    expect(body.error).toBeTruthy();
    expect(body.error).not.toMatch(/ECONNREFUSED/);
  });

  it('conversation_id inexistente responde 400', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    await request(app.getHttpServer())
      .post('/api/chatbot')
      .set('Authorization', `Bearer ${operarioToken}`)
      .send({ question: 'hola', conversation_id: 'no-existe' })
      .expect(400);
  });

  it('sin token responde 401', async () => {
    await request(app.getHttpServer())
      .post('/api/chatbot')
      .send({ question: 'hola' })
      .expect(401);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('pregunta vacía responde 400', async () => {
    await request(app.getHttpServer())
      .post('/api/chatbot')
      .set('Authorization', `Bearer ${operarioToken}`)
      .send({ question: '' })
      .expect(400);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
