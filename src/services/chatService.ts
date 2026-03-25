import { api } from './api';
import { authService } from './authService';
import type { ApiResponse } from './timetableService';

// Uses Vite proxy: /agent -> http://localhost:8081
const AGENT_BASE_URL = import.meta.env.VITE_AGENT_BASE_URL || '/agent';

export interface ChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSessionPayload {
  sessionId: string;
  title: string;
  messages: ChatMessagePayload[];
}

export interface ChatSessionDto extends ChatSessionPayload {
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatResponse {
  result: string;
}

/**
 * Send a message to the Slozy Agent and get a response.
 * @param prompt - The user's message
 * @param sessionId - Session ID for memory persistence across turns
 */
export async function sendChatMessage(prompt: string, sessionId: string): Promise<string> {
  const response = await fetch(`${AGENT_BASE_URL}/invocations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, session_id: sessionId }),
  });

  if (!response.ok) {
    throw new Error(`Agent error: ${response.status}`);
  }

  const data: ChatResponse = await response.json();
  return data.result;
}

export async function getChatSessions(): Promise<ChatSessionDto[]> {
  const token = authService.getToken();
  if (!token) {
    return [];
  }

  const response = await api.get<ApiResponse<ChatSessionDto[]>>('/chat/sessions', token);
  return response.result ?? [];
}

export async function upsertChatSession(payload: ChatSessionPayload): Promise<ChatSessionDto> {
  const token = authService.getToken();
  if (!token) {
    throw new Error('Missing auth token');
  }

  const response = await api.authPost<ApiResponse<ChatSessionDto>>('/chat/sessions', payload, token);
  return response.result;
}

