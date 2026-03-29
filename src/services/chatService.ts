import { api } from './api';
import { authService } from './authService';
import type { ApiResponse } from './timetableService';

// Uses Vite proxy: /agent -> http://localhost:8081
const AGENT_BASE_URL = import.meta.env.VITE_AGENT_BASE_URL;// || '/agent';

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
 * Send a message to the Slozy Agent and stream the response.
 * @param prompt - The user's message
 * @param sessionId - Session ID for memory persistence across turns
 * @param onChunk - Callback for each token received
 */
export async function streamChatMessage(
  prompt: string,
  sessionId: string,
  onChunk: (chunk: string) => void
): Promise<void> {
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

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process lines (SSE format: "data: { ... }\n\n")
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      try {
        const jsonStr = trimmed.slice(6); // Remove "data: "
        const data = JSON.parse(jsonStr);
        if (data.token) {
          onChunk(data.token);
        }
      } catch (e) {
        console.error('Error parsing SSE chunk:', e, trimmed);
      }
    }
  }
}

/**
 * Send a message to the Slozy Agent and get a response.
 * @param prompt - The user's message
 * @param sessionId - Session ID for memory persistence across turns
 * @deprecated Use streamChatMessage for better user experience
 */
export async function sendChatMessage(prompt: string, sessionId: string): Promise<string> {
  let fullText = '';
  await streamChatMessage(prompt, sessionId, (chunk) => {
    fullText += chunk;
  });
  return fullText;
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

