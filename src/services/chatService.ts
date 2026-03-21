// Uses Vite proxy: /agent -> http://localhost:8081
const AGENT_BASE_URL = import.meta.env.VITE_AGENT_BASE_URL || '/agent';

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
