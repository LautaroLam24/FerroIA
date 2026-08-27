import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, sendChatMessage } from '../../api';
import { Button } from '../../components/ui/Button';
import { cn } from '../../components/ui/cn';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { useChatLauncher } from './ChatLauncherContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const UNAVAILABLE_MESSAGE =
  'El asistente no está disponible en este momento. Probá de nuevo más tarde.';

function formatError(error: unknown): string {
  if (error instanceof ApiError && error.status === 502) {
    return UNAVAILABLE_MESSAGE;
  }
  if (error instanceof ApiError) {
    return error.message;
  }
  return 'Ocurrió un error inesperado';
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { pendingRequest, clearPendingRequest } = useChatLauncher();

  useEffect(() => {
    if (!pendingRequest) return;
    setOpen(true);
    setQuestion(pendingRequest.text);
    clearPendingRequest();
  }, [pendingRequest, clearPendingRequest]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView?.({ block: 'end' });
  }, [open, messages, sending]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setQuestion('');

    try {
      const response = await sendChatMessage({
        question: trimmed,
        conversation_id: conversationId,
      });
      setConversationId(response.conversation_id);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.answer },
      ]);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="flex h-128 max-h-[calc(100vh-2rem)] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-md border border-border bg-surface-alt shadow-lg sm:w-96">
          <div className="flex items-center justify-between rounded-t-md bg-primary px-4 py-3 text-white">
            <span className="font-semibold">Asistente</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
              className="rounded-sm px-1 text-lg leading-none hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="text-sm text-text-muted">
                Preguntame sobre políticas de stock, roles o cómo usar el sistema.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {messages.map((message, index) => (
                <p
                  key={index}
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    message.role === 'user'
                      ? 'ml-auto bg-primary text-white'
                      : 'mr-auto bg-surface text-text',
                  )}
                >
                  {message.content}
                </p>
              ))}
              {sending && (
                <p className="mr-auto flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm text-text-muted">
                  <Spinner size="sm" />
                  Escribiendo…
                </p>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <p
              role="alert"
              className="mx-3 mb-2 rounded-md bg-error-soft px-3 py-2 text-sm text-error-soft-text"
            >
              {error}
            </p>
          )}

          <form
            className="flex items-center gap-2 border-t border-border p-3"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <Input
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Escribí tu pregunta…"
              disabled={sending}
              aria-label="Pregunta para el asistente"
            />
            <Button type="submit" disabled={sending || !question.trim()}>
              Enviar
            </Button>
          </form>
        </div>
      ) : (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir asistente"
          className="rounded-full shadow-lg"
        >
          Chat
        </Button>
      )}
    </div>
  );
}
