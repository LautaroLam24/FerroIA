import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface ChatLauncherRequest {
  text: string;
  token: number;
}

interface ChatLauncherContextValue {
  pendingRequest: ChatLauncherRequest | null;
  openChatWithMessage: (text: string) => void;
  clearPendingRequest: () => void;
}

const ChatLauncherContext = createContext<ChatLauncherContextValue | null>(null);

export function ChatLauncherProvider({ children }: { children: ReactNode }) {
  const [pendingRequest, setPendingRequest] = useState<ChatLauncherRequest | null>(
    null,
  );

  const openChatWithMessage = useCallback((text: string) => {
    setPendingRequest((prev) => ({ text, token: (prev?.token ?? 0) + 1 }));
  }, []);

  const clearPendingRequest = useCallback(() => {
    setPendingRequest(null);
  }, []);

  const value = useMemo(
    () => ({ pendingRequest, openChatWithMessage, clearPendingRequest }),
    [pendingRequest, openChatWithMessage, clearPendingRequest],
  );

  return (
    <ChatLauncherContext.Provider value={value}>
      {children}
    </ChatLauncherContext.Provider>
  );
}

export function useChatLauncher(): ChatLauncherContextValue {
  const context = useContext(ChatLauncherContext);
  if (!context) {
    throw new Error('useChatLauncher debe usarse dentro de ChatLauncherProvider');
  }
  return context;
}
