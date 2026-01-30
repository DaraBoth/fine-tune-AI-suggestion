import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/auth-middleware'
import { generateEmbedding } from '@/lib/openai'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/public/complete-word
 * Public API endpoint for word completion with API key authentication
 * 
 * Headers:
 * - Authorization: Bearer YOUR_API_KEY (required)
 * 
 * Body:
 * - text: string (required) - The current text input
 * - incompleteWord: string (required) - The incomplete word to complete
 * - limit: number (optional) - Number of suggestions (default: 5, max: 10)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // Authenticate the request
  const auth = await authenticateApiKey(request, 'complete-word')
  
  if (!auth.authenticated) {
    return auth.response!
  }

  try {
    const body = await request.json()
    const { text, incompleteWord, limit = 5 } = body

    // Validate input
    if (!text || !incompleteWord) {
      return NextResponse.json(
        { 
          error: 'Bad Request',
          message: 'Both "text" and "incompleteWord" are required',
          example: {
            text: "I love to eat",
            incompleteWord: "app"
          }
        },
        { status: 400 }
      )
    }

    const maxLimit = Math.min(limit, 10)

    // Generate embedding for the context
    const embedding = await generateEmbedding(text)

    // Search for relevant chunks
    const { data, error }:{data: any, error: any} = await supabase.rpc('match_chunks', {
      query_embedding: embedding,
      match_threshold: 0.2,
      match_count: 10,
    } as any)

    if (error) {
      console.error('Error matching chunks:', error)
      return NextResponse.json(
        { 
          error: 'Internal Server Error',
          message: 'Failed to retrieve suggestions'
        },
        { status: 500 }
      )
    }

    // Extract and process suggestions
    const suggestions = new Set<string>()
    const wordPattern = new RegExp(`\\b${incompleteWord}\\w*\\b`, 'gi')

    for (const chunk of data || []) {
      const matches = chunk.content.match(wordPattern)
      if (matches) {
        matches.forEach((match: string) => {
          const normalized = match.toLowerCase()
          if (normalized.startsWith(incompleteWord.toLowerCase()) && 
              normalized !== incompleteWord.toLowerCase()) {
            suggestions.add(match)
          }
        })
      }
      if (suggestions.size >= maxLimit) break
    }

    const result = Array.from(suggestions)
      .slice(0, maxLimit)
      .map(text => ({ text, type: 'word' as const }))

    const responseTime = Date.now() - startTime

    return NextResponse.json(
      {
        success: true,
        suggestions: result,
        count: result.length,
        metadata: {
          responseTime: `${responseTime}ms`,
          apiVersion: '1.0'
        }
      },
      {
        headers: {
          'X-Response-Time': `${responseTime}ms`,
          'X-API-Version': '1.0'
        }
      }
    )

  } catch (error) {
    console.error('Error in public complete-word endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      },
      { status: 500 }
    )
  }
}
