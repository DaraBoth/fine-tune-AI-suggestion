/**
 * Autocomplete Service
 * Handles word completion and phrase suggestion API calls
 */

export interface Suggestion {
  text: string
  source: 'trained-data' | 'openai-fallback' | 'ai-with-context'
  similarity?: number
  suggestionType?: 'word' | 'phrase'
}

export interface AutocompleteResponse {
  suggestions: Suggestion[]
  matches?: any[]
  type?: 'word' | 'phrase'
  error?: string
}

/**
 * Complete a word based on context and incomplete word
 */
export async function completeWord(
  text: string,
  incompleteWord: string
): Promise<AutocompleteResponse> {
  const response = await fetch('/api/complete-word', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, incompleteWord }),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch word completion')
  }

  return response.json()
}

/**
 * Get phrase suggestions based on context
 */
export async function suggestPhrase(text: string): Promise<AutocompleteResponse> {
  const response = await fetch('/api/suggest-phrase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch phrase suggestion')
  }

  return response.json()
}

/**
 * Auto-learn from user-accepted suggestions
 */
export async function learnFromAcceptedSuggestion(
  text: string,
  context: string,
  source: string
): Promise<{ learned: boolean; reason?: string; chunks?: number; text?: string }> {
  const response = await fetch('/api/learn', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, context, source }),
  })

  if (!response.ok) {
    throw new Error('Failed to learn from suggestion')
  }

  return response.json()
}
