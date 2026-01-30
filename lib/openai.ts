import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  throw new Error('Missing OpenAI API key')
}

export const openai = new OpenAI({
  apiKey,
})

/**
 * Generate text embedding using OpenAI's text-embedding-3-small model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text, 
  })

  return response.data[0].embedding
}

/**
 * Generate a text completion using OpenAI's GPT model
 * This is used as a fallback when no trained data is available
 * @deprecated Use generateWordCompletion or generatePhraseCompletion instead
 */
export async function generateCompletion(userInput: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are a professional business writing assistant. Provide autocomplete suggestions using clear, professional language appropriate for business and workplace communication. Keep suggestions concise, formal, and contextually relevant. Use proper business terminology and maintain a professional tone throughout.',
      },
      {
        role: 'user',
        content: `Complete this text in a professional business style: "${userInput}"`,
      },
    ],
    max_tokens: 100,
    temperature: 0.1,
  })

  return response.choices[0]?.message?.content?.trim() || ''
}

/**
 * Complete an incomplete word that user is typing
 * Example: "busine" -> "ss" (not "business")
 */
export async function generateWordCompletion(userInput: string, incompleteWord: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `You are a word completion assistant. Return ONLY the missing characters to complete the word, NOT the full word.

Examples:
- User typed "hel" → Return "lo" (not "hello")
- User typed "busine" → Return "ss" (not "business")
- User typed "수정" → Return "" if complete
- Return ONLY completion characters, NO full words, NO explanations`,
      },
      {
        role: 'user',
        content: `Context: "${userInput}"\nIncomplete word: "${incompleteWord}"\n\nReturn ONLY the missing characters to complete "${incompleteWord}". Do not return the full word.`,
      },
    ],
    max_tokens: 20,
    temperature: 0.1,
  })

  const completion = response.choices[0]?.message?.content?.trim() || ''
  // Remove quotes if AI added them
  const cleaned = completion.replace(/['"]/g, '')
  
  // If AI returned the full word instead of just the completion, extract the completion part
  if (cleaned.toLowerCase().startsWith(incompleteWord.toLowerCase()) || 
      cleaned.startsWith(incompleteWord)) {
    return cleaned.substring(incompleteWord.length)
  }
  
  return cleaned
}

/**
 * Suggest the next phrase or sentence after a completed word
 * Example: "I would like to " -> "discuss this matter with you"
 */
export async function generatePhraseSuggestion(userInput: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are an autocomplete assistant. Your ONLY job is to continue the user\'s sentence, NOT to respond to it. DO NOT greet, chat, or answer questions. If user types "Hello", continue with what might come next like "there" or "everyone", NOT respond to the greeting. Return ONLY the next 3-10 words to continue their sentence.',
      },
      {
        role: 'user',
        content: `Continue this text (do not respond to it, just continue): "${userInput}"`,
      },
    ],
    max_tokens: 50,
    temperature: 0.5,
  })

  return response.choices[0]?.message?.content?.trim() || ''
}

/**
 * Generate chat response using OpenAI with optional context from vector database
 */
export async function generateChatResponse(
  userMessage: string,
  context?: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: context
        ? `You are a professional AI assistant with access to a knowledge base. Use the provided context to answer questions accurately and professionally. If the context doesn't contain relevant information, use your general knowledge but mention that it's not from the knowledge base.

Context from knowledge base:
${context}

Provide clear, helpful, and professional responses.`
        : 'You are a professional AI assistant. Provide clear, helpful, and professional responses to questions. Use business-appropriate language and be concise but thorough.',
    },
  ]

  // Add conversation history if provided
  if (conversationHistory && conversationHistory.length > 0) {
    messages.push(...conversationHistory.slice(-10)) // Keep last 10 messages for context
  }

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage,
  })

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages,
    max_tokens: 500,
    temperature: 0.7,
  })

  return response.choices[0]?.message?.content?.trim() || ''
}

/**
 * Generate a smart phrase suggestion using AI Agent pattern with RAG
 * This function receives user input and relevant context from vector DB,
 * then uses AI to generate an intelligent, contextualized suggestion
 */
export async function generateSmartPhraseSuggestion(
  userInput: string, 
  retrievedContext: string[]
): Promise<string> {
  const contextText = retrievedContext.length > 0 
    ? retrievedContext.map((chunk, i) => `[Context ${i + 1}]: ${chunk}`).join('\n\n')
    : 'No specific context available.'

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `You are an autocomplete assistant. Your ONLY job is to CONTINUE the user's text, NOT respond to it.

Rules:
1. DO NOT respond conversationally (no "Hello!", "Sure!", "I can help")
2. DO NOT answer questions - just continue the sentence
3. If user types "Hello", continue with "there", "everyone", "world" - NOT "Hello! How can I help?"
4. Use context from knowledge base to predict what comes NEXT
5. Return ONLY 3-10 words that continue the sentence
6. Match the language and style of the input
7. This is AUTOCOMPLETE, not chat`,
      },
      {
        role: 'user',
        content: `The user is typing: "${userInput}"

Retrieved context from knowledge base:
${contextText}

Continue (don't respond to) the text. Return only what comes next.`,
      },
    ],
    max_tokens: 50,
    temperature: 0.3,
  })

  return response.choices[0]?.message?.content?.trim() || ''
}

/**
 * Generate a smart word completion using AI Agent pattern with RAG
 */
export async function generateSmartWordCompletion(
  userInput: string,
  incompleteWord: string,
  retrievedContext: string[]
): Promise<string> {
  const contextText = retrievedContext.length > 0
    ? retrievedContext.map((chunk, i) => `[Context ${i + 1}]: ${chunk}`).join('\n\n')
    : 'No specific context available.'

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `You are a word completion assistant. Return ONLY the missing part to complete the word, NOT the full word.

Rules:
1. User typed: "hel" - You return: "lo" (not "hello")
2. User typed: "수정" - You return: "" if complete, or missing characters if incomplete
3. Return ONLY the completion characters (what comes after the incomplete word)
4. If the word is already complete, return empty
5. Match the language (English, Korean, Chinese, etc.)
6. NO explanations, NO full words, ONLY the completion part`,
      },
      {
        role: 'user',
        content: `Full text: "${userInput}"
Incomplete word to complete: "${incompleteWord}"

Context from knowledge base:
${contextText}

Return ONLY the missing characters to complete "${incompleteWord}". Do not return the full word.`,
      },
    ],
    max_tokens: 20,
    temperature: 0.1,
  })

  const completion = response.choices[0]?.message?.content?.trim() || ''
  
  // If AI returned the full word instead of just the completion, extract the completion part
  if (completion.toLowerCase().startsWith(incompleteWord.toLowerCase()) || 
      completion.startsWith(incompleteWord)) {
    return completion.substring(incompleteWord.length)
  }
  
  return completion
}
