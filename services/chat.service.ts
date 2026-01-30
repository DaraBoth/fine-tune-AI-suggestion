/**
 * Chat Service
 * Handles AI chat interactions
 */

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
}

export interface ChatResponse {
  response: string
  context?: any[]
}

/**
 * Send a message to the AI chat
 */
export async function sendChatMessage(
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      message,
      conversationHistory 
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to send chat message')
  }

  return response.json()
}
