import { http } from './http';

export interface ChatRequestInput {
  question: string;
  conversation_id?: string;
}

export interface ChatResponse {
  conversation_id: string;
  answer: string;
}

export function sendChatMessage(input: ChatRequestInput): Promise<ChatResponse> {
  return http.post<ChatResponse>('/chatbot', input);
}
