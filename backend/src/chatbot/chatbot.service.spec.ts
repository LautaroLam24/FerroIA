import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatbotService } from './chatbot.service';

describe('ChatbotService', () => {
  let service: ChatbotService;
  let fetchMock: jest.Mock;
  const originalFetch = global.fetch;

  const userId = 'user-1';

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    const configValues: Record<string, string> = {
      CHATBOT_URL: 'http://localhost:8001',
      CHATBOT_TIMEOUT_MS: '15000',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => configValues[key] },
        },
      ],
    }).compile();

    service = module.get<ChatbotService>(ChatbotService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns the conversation_id and answer on success', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ conversation_id: 'conv-1', answer: 'Hola' }),
    });

    const result = await service.ask(
      { question: '¿qué es el stock mínimo?' },
      userId,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          question: '¿qué es el stock mínimo?',
          conversation_id: undefined,
          user_id: userId,
        }),
      }),
    );
    expect(result).toEqual({ conversation_id: 'conv-1', answer: 'Hola' });
  });

  it('forwards the auth_token when provided (para que la tool del asistente pueda autenticarse)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ conversation_id: 'conv-1', answer: 'Hola' }),
    });

    await service.ask({ question: 'hola' }, userId, 'jwt-del-usuario');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/chat',
      expect.objectContaining({
        body: JSON.stringify({
          question: 'hola',
          conversation_id: undefined,
          user_id: userId,
          auth_token: 'jwt-del-usuario',
        }),
      }),
    );
  });

  it('throws BadGatewayException when the request fails (network error)', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(service.ask({ question: 'hola' }, userId)).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('throws BadGatewayException when the service responds with a non-2xx status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(service.ask({ question: 'hola' }, userId)).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('throws BadRequestException when conversation_id does not exist (404)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    await expect(
      service.ask({ question: 'hola', conversation_id: 'missing' }, userId),
    ).rejects.toThrow(BadRequestException);
  });
});
