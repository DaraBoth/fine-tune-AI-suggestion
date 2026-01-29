import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateEmbedding, generatePhraseSuggestion, generateSmartPhraseSuggestion } from '@/lib/openai'

interface MatchResult {
  id: number
  content: string
  metadata: any
  similarity: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid text provided' },
        { status: 400 }
      )
    }

    // Don't process very short queries
    if (text.trim().length < 2) {
      return NextResponse.json({
        suggestion: '',
        matches: [],
      })
    }

    // Generate embedding for the input text
    const embedding = await generateEmbedding(text)

    console.log(`[Phrase Suggestion] Query: "${text}"`)
    console.log(`[Phrase Suggestion] Generated query embedding with ${embedding.length} dimensions`)

    // Query Supabase for similar chunks using the match_chunks function
    const { data, error }:{data: any, error: any} = await supabase.rpc('match_chunks' as any, {
      query_embedding: embedding,
      match_threshold: 0.2, // Lowered threshold for better recall of trained data
      match_count: 5, // Reduced from 10 for faster response
    } as any)

    console.log(`[Phrase Suggestion] Found ${data?.length || 0} matches from trained data`)
    if (data && data.length > 0) {
      console.log(`[Phrase Suggestion] Top match similarity: ${data[0].similarity}, content preview: ${data[0].content.substring(0, 100)}...`)
    }

    if (error) {
      console.error('Error querying chunks:', error)
      return NextResponse.json(
        { error: 'Failed to query database' },
        { status: 500 }
      )
    }

    const matches = data as any[]

    // If no matches found, use OpenAI completion as fallback
    if (!matches || matches.length === 0) {
      console.log('[Phrase Suggestion] No trained data found, using OpenAI phrase suggestion fallback')
      
      try {
        const completion = await generatePhraseSuggestion(text)
        
        return NextResponse.json({
          suggestions: [{
            text: completion,
            source: 'openai-fallback' as const,
          }],
          matches: [],
          type: 'phrase',
        })
      } catch (fallbackError) {
        console.error('Fallback phrase suggestion error:', fallbackError)
        return NextResponse.json({
          suggestions: [],
          matches: [],
          error: 'No trained data available and fallback failed',
        })
      }
    }

    // AI Agent Pattern with RAG:
    // 1. We have the user input (text)
    // 2. We retrieved relevant context from vector DB (matches)
    // 3. Use AI to generate intelligent, contextualized suggestions
    
    console.log('Using AI Agent with RAG - Retrieved chunks:', matches.length)
    
    try {
      // Pass only top 3 context chunks to AI for faster processing
      const contextChunks = matches.slice(0, 3).map(m => m.content)
      const aiSuggestion = await generateSmartPhraseSuggestion(text, contextChunks)

      // Also try to extract direct suggestions from top matches as alternatives
      const directSuggestions = matches
        .slice(0, 2) // Only use top 2 matches for faster processing
        .map(match => {
          const suggestion = generatePhraseSuggestionFromContent(text, match.content)
          return {
            text: suggestion,
            source: 'trained-data' as const,
            similarity: match.similarity,
          }
        })
        .filter(s => s.text && s.text.trim().length > 0 && s.text.length < 200) // Filter out chunks

      // Prioritize AI suggestion, then add direct extractions
      const allSuggestions = [
        {
          text: aiSuggestion,
          source: 'trained-data' as const,
          similarity: matches[0]?.similarity || 0,
        },
        ...directSuggestions
      ].filter((s, index, self) => 
        // Remove duplicates and empty
        s.text && s.text.trim().length > 0 &&
        self.findIndex(t => t.text === s.text) === index
      ).slice(0, 5) // Limit to top 5

      return NextResponse.json({
        suggestions: allSuggestions,
        matches: matches.map(m => ({
          content: m.content.substring(0, 100) + '...',
          similarity: m.similarity,
        })),
        type: 'phrase',
      })
    } catch (aiError) {
      console.error('AI Agent suggestion error:', aiError)
      
      // Fallback to direct extraction only if AI fails
      const suggestions = matches
        .slice(0, 5)
        .map(match => {
          const suggestion = generatePhraseSuggestionFromContent(text, match.content)
          return {
            text: suggestion,
            source: 'trained-data' as const,
            similarity: match.similarity,
          }
        })
        .filter(s => s.text && s.text.trim().length > 0 && s.text.length < 200)

      return NextResponse.json({
        suggestions,
        matches: matches.map(m => ({
          content: m.content.substring(0, 100) + '...',
          similarity: m.similarity,
        })),
        type: 'phrase',
      })
    }

  } catch (error) {
    console.error('Phrase suggestion error:', error)
    return NextResponse.json(
      { error: 'Failed to generate phrase suggestion' },
      { status: 500 }
    )
  }
}

/**
 * Generate a phrase suggestion based on user input and matched content
 */
function generatePhraseSuggestionFromContent(userInput: string, matchedContent: string): string {
  const input = userInput.trim()
  const content = matchedContent.trim()

  // First, check if the content starts with the user input (most direct match)
  if (content.toLowerCase().startsWith(input.toLowerCase())) {
    const continuation = content.substring(input.length).trim()
    if (continuation.length > 0) {
      return continuation
    }
  }

  // For exact character matching (Korean, Chinese, etc.)
  if (content.startsWith(input)) {
    const continuation = content.substring(input.length).trim()
    if (continuation.length > 0) {
      return continuation
    }
  }

  // Split content into sentences
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)

  if (sentences.length === 0) return ''

  // Check each sentence if it starts with the input
  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    
    if (trimmed.toLowerCase().startsWith(input.toLowerCase())) {
      const continuation = trimmed.substring(input.length).trim()
      if (continuation.length > 0) {
        return continuation
      }
    }

    // Exact match for non-ASCII
    if (trimmed.startsWith(input)) {
      const continuation = trimmed.substring(input.length).trim()
      if (continuation.length > 0) {
        return continuation
      }
    }
  }

  // Get the last few words from user input for partial matching
  const inputWords = input.split(/\s+/)
  const lastInputWords = inputWords.slice(-3).join(' ')

  // Find sentences that contain the user's recent words
  for (const sentence of sentences) {
    const trimmed = sentence.trim()

    // Check if sentence contains the last words from input
    const matchIndex = trimmed.toLowerCase().indexOf(lastInputWords.toLowerCase())
    if (matchIndex !== -1) {
      const afterMatch = trimmed.substring(matchIndex + lastInputWords.length).trim()
      if (afterMatch.length > 0) {
        return afterMatch
      }
    }

    // For non-ASCII text, check exact character matching
    const lastWord = inputWords[inputWords.length - 1]
    if (lastWord && !/^[a-zA-Z]+$/.test(lastWord)) {
      if (trimmed.includes(lastWord)) {
        const index = trimmed.indexOf(lastWord)
        const after = trimmed.substring(index + lastWord.length).trim()
        if (after.length > 0) {
          return after
        }
      }
    }
  }

  // If no specific match, return the first sentence
  return sentences[0].trim()
}
