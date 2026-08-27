import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatWidget } from './ChatWidget';
import { ChatLauncherProvider, useChatLauncher } from './ChatLauncherContext';

const { sendChatMessage } = vi.hoisted(() => ({
  sendChatMessage: vi.fn(),
}));

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual,
    sendChatMessage,
  };
});

function renderWidget(): void {
  render(
    <ChatLauncherProvider>
      <ChatWidget />
    </ChatLauncherProvider>,
  );
}

function OpenChatButton() {
  const { openChatWithMessage } = useChatLauncher();
  return (
    <button type="button" onClick={() => openChatWithMessage('Hola desde reposición')}>
      Pedir borrador
    </button>
  );
}

describe('ChatWidget', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('abre el panel y envía un mensaje mostrando burbujas diferenciadas por rol', async () => {
    sendChatMessage.mockResolvedValue({
      conversation_id: 'conv-1',
      answer: 'Respuesta del asistente',
    });

    renderWidget();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir asistente' }));
    fireEvent.change(screen.getByLabelText('Pregunta para el asistente'), {
      target: { value: '¿Cuánto stock hay?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    const userBubble = screen.getByText('¿Cuánto stock hay?');
    expect(userBubble.className).toContain('bg-primary');

    await waitFor(() => {
      expect(screen.getByText('Respuesta del asistente')).toBeTruthy();
    });
    const assistantBubble = screen.getByText('Respuesta del asistente');
    expect(assistantBubble.className).toContain('bg-surface');
    expect(assistantBubble.className).not.toContain('bg-primary');
  });

  it('muestra el indicador de "escribiendo…" mientras espera la respuesta', async () => {
    let resolveResponse: (value: { conversation_id: string; answer: string }) => void = () => {};
    sendChatMessage.mockReturnValue(
      new Promise((resolve) => {
        resolveResponse = resolve;
      }),
    );

    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir asistente' }));
    fireEvent.change(screen.getByLabelText('Pregunta para el asistente'), {
      target: { value: 'Pregunta' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(screen.getByText('Escribiendo…')).toBeTruthy();
    expect(
      (screen.getByLabelText('Pregunta para el asistente') as HTMLInputElement).disabled,
    ).toBe(true);

    resolveResponse({ conversation_id: 'conv-2', answer: 'Listo' });

    await waitFor(() => {
      expect(screen.queryByText('Escribiendo…')).toBeNull();
    });
  });

  it('muestra un aviso amable y persistente cuando el servicio responde 502', async () => {
    const { ApiError } = await import('../../api');
    sendChatMessage.mockRejectedValue(new ApiError(502, 'Bad Gateway'));

    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir asistente' }));
    fireEvent.change(screen.getByLabelText('Pregunta para el asistente'), {
      target: { value: 'Pregunta' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'El asistente no está disponible en este momento. Probá de nuevo más tarde.',
        ),
      ).toBeTruthy();
    });
    expect(screen.getByText('Pregunta')).toBeTruthy();
  });

  it('se abre y precarga el mensaje al recibir un pedido desde el ChatLauncherContext', () => {
    render(
      <ChatLauncherProvider>
        <OpenChatButton />
        <ChatWidget />
      </ChatLauncherProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pedir borrador' }));

    expect(
      (screen.getByLabelText('Pregunta para el asistente') as HTMLInputElement).value,
    ).toBe('Hola desde reposición');
  });
});
