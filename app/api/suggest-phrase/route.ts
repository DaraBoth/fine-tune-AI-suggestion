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

    // Extract last word for literal boost
    const words = text.trim().split(/\s+/)
    const lastWord = words[words.length - 1] || ''

    // Query Supabase for similar chunks using high-speed hybrid search
    const { data: qData, error } = await supabase.rpc('match_chunks_hybrid' as any, {
      query_embedding: embedding,
      literal_query: lastWord,
      match_threshold: 0.15,
      match_count: 8,
    } as any)

    if (error) {
      console.error('Error querying chunks:', error)
      return NextResponse.json(
        { error: 'Failed to query database' },
        { status: 500 }
      )
    }

    interface HybridMatch {
      id: number
      content: string
      metadata: Record<string, unknown>
      similarity: number
    }

    const matches = (qData as unknown as HybridMatch[]) || []

    console.log(`[Phrase Suggestion] Found ${matches.length} matches using Hybrid Search`)

    // If no matches found, use OpenAI completion as fallback
    if (!matches || matches.length === 0) {
      console.log('[Phrase Suggestion] No matches, using OpenAI fallback')

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
        return NextResponse.json({ suggestions: [], matches: [], error: 'Fallback failed' })
      }
    }

    interface Suggestion {
      text: string
      source: 'trained-data' | 'ai-with-context'
      similarity: number
      isLiteral?: boolean
    }

    // Hybrid Suggestion Logic:
    try {
      // 1. Extract direct suggestions from the matches
      const directSuggestions: Suggestion[] = matches
        .map(match => {
          const suggestion = generatePhraseSuggestionFromContent(text, match.content)
          const isLiteral = match.similarity > 1.0
          return {
            text: suggestion,
            source: 'trained-data' as const,
            similarity: isLiteral ? Math.min(0.99, match.similarity - 1.0) : match.similarity,
            isLiteral
          }
        })
        .filter(s => s.text && s.text.trim().length > 0 && s.text.length < 200)

      // 2. Fast-Path: If we have multiple high-quality literal matches, we can skip AI
      const strongLiteralMatches = directSuggestions.filter(s => s.isLiteral)

      let aiSuggestions: Suggestion[] = []

      if (strongLiteralMatches.length < 2) {
        // Pass top 5 context chunks to AI for better pattern recognition
        const contextChunks = matches.slice(0, 5).map(m => m.content)
        const aiSuggestion = await generateSmartPhraseSuggestion(text, contextChunks)

        if (aiSuggestion && aiSuggestion.trim().length > 0) {
          aiSuggestions = [{
            text: aiSuggestion,
            source: 'ai-with-context',
            similarity: matches[0]?.similarity > 1.0 ? matches[0].similarity - 1.0 : matches[0]?.similarity || 0,
          }]
        }
      }

      // Combine suggestions: AI first (if exists), then literals, then other trained data
      const allSuggestions = [
        ...aiSuggestions,
        ...directSuggestions
      ].filter((s, index, self) =>
        s.text && s.text.trim().length > 0 &&
        self.findIndex(t => t.text === s.text) === index
      ).slice(0, 5)

      return NextResponse.json({
        suggestions: allSuggestions,
        matches: matches.slice(0, 3).map((m: any) => ({
          content: m.content.substring(0, 100) + '...',
          similarity: m.similarity > 1.0 ? m.similarity - 1.0 : m.similarity,
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
 * Intelligently predicts what the user is likely to type next
 */
function generatePhraseSuggestionFromContent(userInput: string, matchedContent: string): string {
  const input = userInput.trim()
  const content = matchedContent.trim()

  // Get the last few words from user input for context matching
  const inputWords = input.split(/\s+/)
  const lastWord = inputWords[inputWords.length - 1]
  const lastTwoWords = inputWords.slice(-2).join(' ')
  const lastThreeWords = inputWords.slice(-3).join(' ')
  const lastFourWords = inputWords.slice(-4).join(' ')

  // Strategy 1: Find exact phrase matches and return what comes after
  // Try matching with last 4, 3, 2, then 1 word for best context
  for (const searchPhrase of [lastFourWords, lastThreeWords, lastTwoWords, lastWord]) {
    if (!searchPhrase || searchPhrase.length < 2) continue

    const searchLower = searchPhrase.toLowerCase()
    const contentLower = content.toLowerCase()

    // Find all occurrences of the phrase
    let index = contentLower.indexOf(searchLower)

    if (index !== -1) {
      // Found the phrase, extract what comes after
      const afterIndex = index + searchPhrase.length
      let continuation = content.substring(afterIndex).trim()

      // Remove leading punctuation but keep it if it's part of the sentence
      continuation = continuation.replace(/^[.,;:!?]\s*/, '')

      // Get up to 15 words or until sentence end
      const words = continuation.split(/\s+/)
      const maxWords = 15
      let result = words.slice(0, maxWords).join(' ')

      // If we have a natural sentence ending, cut there
      const sentenceEnd = result.match(/^[^.!?]*[.!?]/)
      if (sentenceEnd) {
        result = sentenceEnd[0]
      }

      if (result.length > 3) {
        return result
      }
    }
  }

  // Strategy 2: Stricter pattern matching
  // Ensure the query matches the content, and return subsequent text
  // Prioritize matches that align with the end of the query
  const searchLower = input.toLowerCase()
  const contentLower = content.toLowerCase()

  let index = contentLower.indexOf(searchLower)

  if (index !== -1) {
    // Found the exact phrase
    const afterIndex = index + input.length
    const continuation = content.substring(afterIndex).trim()

    // Clean up punctuation
    const cleaned = continuation.replace(/^[.,;:!?]\s*/, '')

    if (cleaned.length > 1) {
      // Return reasonable length continuation
      const words = cleaned.split(/\s+/)
      const maxWords = 15
      let result = words.slice(0, maxWords).join(' ')

      const sentenceEnd = result.match(/^[^.!?]*[.!?]/)
      if (sentenceEnd) {
        result = sentenceEnd[0]
      }

      return result
    }
  }

  // Strategy 3: Fallback - use last word if it's unique enough (only if input is multi-word)
  if (inputWords.length > 1 && lastWord.length > 2) {
    const lastWordLower = lastWord.toLowerCase()
    index = contentLower.indexOf(lastWordLower)

    if (index !== -1) {
      // Check if this recurrence of lastWord is actually a continuation of our input
      // This effectively checks: does matchedContent contain "PreviousWord LastWord"?
      const prevWord = inputWords[inputWords.length - 2].toLowerCase()
      const checkContext = prevWord + " " + lastWordLower

      if (contentLower.includes(checkContext)) {
        const afterIndex = contentLower.indexOf(checkContext) + checkContext.length
        let continuation = content.substring(afterIndex).trim()
        continuation = continuation.replace(/^[.,;:!?]\s*/, '')
        if (continuation.length > 1) {
          const words = continuation.split(/\s+/)
          return words.slice(0, 10).join(' ')
        }
      }
    }
  }

  return ''
}
