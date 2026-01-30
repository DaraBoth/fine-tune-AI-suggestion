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

      // Separate AI-generated from direct extractions
      const aiSuggestions = aiSuggestion && aiSuggestion.trim().length > 0 ? [{
        text: aiSuggestion,
        source: 'ai-with-context' as const,
        similarity: matches[0]?.similarity || 0,
      }] : []
      
      // Combine: direct extractions first (pure trained data), then AI
      const allSuggestions = [
        ...directSuggestions, // These are pure trained-data
        ...aiSuggestions      // This is AI-generated with context
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
 * Returns only the completion part (not including what user already typed)
 */
function generatePhraseSuggestionFromContent(userInput: string, matchedContent: string): string {
  const input = userInput.trim()
  const content = matchedContent.trim()

  // Get the last few words from user input for context matching
  const inputWords = input.split(/\s+/)
  const lastWord = inputWords[inputWords.length - 1]
  const lastTwoWords = inputWords.slice(-2).join(' ')
  const lastThreeWords = inputWords.slice(-3).join(' ')

  // Strategy 1: Find the last word(s) in the content and return what comes after
  // Try matching with last 3 words, then 2 words, then 1 word
  for (const searchPhrase of [lastThreeWords, lastTwoWords, lastWord]) {
    if (!searchPhrase) continue
    
    const searchLower = searchPhrase.toLowerCase()
    const contentLower = content.toLowerCase()
    
    const index = contentLower.indexOf(searchLower)
    if (index !== -1) {
      // Found the phrase, return what comes after it
      const afterIndex = index + searchPhrase.length
      const continuation = content.substring(afterIndex).trim()
      
      // Remove leading punctuation if any
      const cleanContinuation = continuation.replace(/^[.,;:!?]\s*/, '')
      
      if (cleanContinuation.length > 0) {
        return cleanContinuation
      }
    }
  }

  // Strategy 2: If content is a complete sentence/phrase, check if it extends user input
  if (content.toLowerCase().includes(input.toLowerCase())) {
    const index = content.toLowerCase().indexOf(input.toLowerCase())
    if (index !== -1) {
      const continuation = content.substring(index + input.length).trim()
      const cleanContinuation = continuation.replace(/^[.,;:!?]\s*/, '')
      if (cleanContinuation.length > 0) {
        return cleanContinuation
      }
    }
  }

  // Strategy 3: Return the entire content if it's a short phrase/word (might be a continuation)
  // But only if it doesn't start with what user already typed
  if (content.length < 50 && !content.toLowerCase().startsWith(input.toLowerCase())) {
    return content
  }

  // No good match found
  return ''
}
