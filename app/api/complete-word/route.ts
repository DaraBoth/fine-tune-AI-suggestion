import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateEmbedding, generateWordCompletion, generateSmartWordCompletion } from '@/lib/openai'

interface MatchResult {
  id: number
  content: string
  metadata: any
  similarity: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, incompleteWord } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid text provided' },
        { status: 400 }
      )
    }

    if (!incompleteWord || typeof incompleteWord !== 'string') {
      return NextResponse.json(
        { error: 'Invalid incomplete word provided' },
        { status: 400 }
      )
    }

    // Generate embedding for the full context
    const embedding = await generateEmbedding(text)

    console.log(`[Word Completion] Query: "${text}", Incomplete word: "${incompleteWord}"`)
    console.log(`[Word Completion] Generated query embedding with ${embedding.length} dimensions`)

    // Query Supabase for similar chunks using the match_chunks function
    const { data, error } = await supabase.rpc('match_chunks' as any, {
      query_embedding: embedding,
      match_threshold: 0.2, // Lowered threshold for better recall of trained data
      match_count: 5, // Reduced from 10 for faster response
    } as any)

    if (error) {
      console.error('Error querying chunks:', error)
      return NextResponse.json(
        { error: 'Failed to query database' },
        { status: 500 }
      )
    }

    const matches = data as any[]

    console.log(`[Word Completion] Found ${matches?.length || 0} matches from trained data`)
    if (matches && matches.length > 0) {
      console.log(`[Word Completion] Top match similarity: ${matches[0].similarity}, content preview: ${matches[0].content.substring(0, 100)}...`)
    }

    // If no matches found, use OpenAI completion as fallback
    if (!matches || matches.length === 0) {
      console.log('[Word Completion] No trained data found, using OpenAI word completion fallback')
      
      try {
        const completion = await generateWordCompletion(text, incompleteWord)
        
        return NextResponse.json({
          suggestions: [{
            text: completion,
            source: 'openai-fallback' as const,
          }],
          matches: [],
          type: 'word',
        })
      } catch (fallbackError) {
        console.error('Fallback completion error:', fallbackError)
        return NextResponse.json({
          suggestions: [],
          matches: [],
          error: 'No trained data available and fallback failed',
        })
      }
    }

    // AI Agent Pattern with RAG:
    // 1. We have the user input (text) and incomplete word
    // 2. We retrieved relevant context from vector DB (matches)
    // 3. Use AI to generate intelligent word completions
    
    console.log('Using AI Agent with RAG for word completion - Retrieved chunks:', matches.length)
    
    try {
      // Pass only top 3 context chunks to AI for faster processing
      const contextChunks = matches.slice(0, 3).map(m => m.content)
      const aiCompletion = await generateSmartWordCompletion(text, incompleteWord, contextChunks)

      // Also try to extract direct completions from top matches as alternatives
      const directCompletions = matches
        .slice(0, 2) // Only use top 2 matches for faster processing
        .map(match => {
          const completion = findWordCompletion(text, incompleteWord, match.content)
          return {
            text: completion,
            source: 'trained-data' as const,
            similarity: match.similarity,
          }
        })
        .filter(s => s.text && s.text.trim().length > 0 && s.text.length < 50) // Word completions should be short

      // Separate AI-generated from direct extractions
      const aiSuggestions = aiCompletion && aiCompletion.trim().length > 0 ? [{
        text: aiCompletion,
        source: 'ai-with-context' as const,
        similarity: matches[0]?.similarity || 0,
      }] : []
      
      // Combine: direct extractions first (pure trained data), then AI
      const allSuggestions = [
        ...directCompletions, // These are pure trained-data
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
        type: 'word',
      })
    } catch (aiError) {
      console.error('AI Agent word completion error:', aiError)
      
      // Fallback to direct pattern matching only if AI fails
      const suggestions = matches
        .slice(0, 5)
        .map(match => {
          const completion = findWordCompletion(text, incompleteWord, match.content)
          return {
            text: completion,
            source: 'trained-data' as const,
            similarity: match.similarity,
          }
        })
        .filter(s => s.text && s.text.trim().length > 0 && s.text.length < 50)

      return NextResponse.json({
        suggestions,
        matches: matches.map(m => ({
          content: m.content.substring(0, 100) + '...',
          similarity: m.similarity,
        })),
        type: 'word',
      })
    }

  } catch (error) {
    console.error('Word completion error:', error)
    return NextResponse.json(
      { error: 'Failed to generate word completion' },
      { status: 500 }
    )
  }
}

/**
 * Find a word completion from matched content
 * Returns only the completion part (not the full word)
 */
function findWordCompletion(text: string, incompleteWord: string, matchedContent: string): string {
  const words = matchedContent.split(/\s+/)
  
  // Find words in content that start with the incomplete word (case-insensitive for ASCII, exact for others)
  for (const word of words) {
    const cleanWord = word.replace(/[.,!?;:'"]/g, '')
    
    // Skip if the word is exactly the same as incomplete word (nothing to complete)
    if (cleanWord.toLowerCase() === incompleteWord.toLowerCase() || 
        cleanWord === incompleteWord) {
      continue
    }
    
    // For ASCII text, use case-insensitive matching
    if (/^[a-zA-Z]+$/.test(incompleteWord)) {
      if (cleanWord.toLowerCase().startsWith(incompleteWord.toLowerCase()) && 
          cleanWord.length > incompleteWord.length) {
        // Return only the completion part
        return cleanWord.substring(incompleteWord.length)
      }
    } 
    // For non-ASCII (Korean, Chinese, etc.), use exact prefix matching
    else {
      if (cleanWord.startsWith(incompleteWord) && cleanWord.length > incompleteWord.length) {
        // Return only the completion part
        return cleanWord.substring(incompleteWord.length)
      }
    }
  }
  
  // If no exact match found in words, look for the continuation in content
  // But only if the matched content is not just the incomplete word itself
  const trimmedContent = matchedContent.trim()
  if (trimmedContent.toLowerCase() === incompleteWord.toLowerCase() || 
      trimmedContent === incompleteWord) {
    return '' // Nothing to complete
  }
  
  const contentLower = matchedContent.toLowerCase()
  const incompleteLower = incompleteWord.toLowerCase()
  const index = contentLower.indexOf(incompleteLower)
  
  if (index !== -1) {
    // Find the next word boundary
    const afterIncomplete = matchedContent.substring(index + incompleteWord.length)
    const nextWordMatch = afterIncomplete.match(/^\S+/)
    if (nextWordMatch && nextWordMatch[0].length > 0) {
      // Return just the completion part
      return nextWordMatch[0]
    }
  }
  
  // If no match found, return empty
  return ''
}
