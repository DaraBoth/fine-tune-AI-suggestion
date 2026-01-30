import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'

/**
 * POST /api/learn
 * Auto-learn from user-accepted suggestions
 * This endpoint checks if the accepted text is new and adds it to the knowledge base
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, context, source } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid text provided' },
        { status: 400 }
      )
    }

    // Don't learn from very short text (less than 3 characters)
    if (text.trim().length < 3) {
      return NextResponse.json({ 
        learned: false, 
        reason: 'Text too short' 
      })
    }

    // Only learn from AI-generated suggestions (not from already trained data)
    if (source !== 'openai-fallback') {
      return NextResponse.json({ 
        learned: false, 
        reason: 'Already in training data' 
      })
    }

    // Generate embedding for the accepted text
    const embedding = await generateEmbedding(text)

    // Check if similar content already exists in the database
    const { data: existingMatches }:{[key: string]: any} = await supabase.rpc('match_chunks' as any, {
      query_embedding: embedding,
      match_threshold: 0.95, // Very high threshold to avoid duplicates
      match_count: 1,
    } as any)

    // If very similar content exists, don't add it again
    if (existingMatches && existingMatches.length > 0 && existingMatches[0].similarity > 0.95) {
      console.log('[Learn] Similar content already exists, skipping:', text.substring(0, 50))
      return NextResponse.json({ 
        learned: false, 
        reason: 'Similar content exists',
        similarity: existingMatches[0].similarity
      })
    }

    // Get existing auto-learned content
    const { data: existingChunks } = await supabase
      .from('chunks_table')
      .select('content')
      .eq('metadata->>filename', 'auto-learned.txt')
      .order('created_at', { ascending: true })

    let existingContent = ''
    if (existingChunks && existingChunks.length > 0) {
      existingContent = existingChunks.map((c: any) => c.content).join('\n\n')
      
      // Delete old chunks so we can re-chunk the combined content
      await supabase
        .from('chunks_table')
        .delete()
        .eq('metadata->>filename', 'auto-learned.txt')
    }

    // Combine existing content with new text
    const combinedContent = existingContent 
      ? `${existingContent}\n\n${text}` 
      : text

    // Chunk the combined content
    const chunks = chunkText(combinedContent)
    console.log('[Learn] Generated', chunks.length, 'chunks from auto-learned content')

    // Generate embeddings and insert chunks
    const chunkInserts = []
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const chunkEmbedding = await generateEmbedding(chunk)
      const chunkType = categorizeChunk(chunk)
      
      chunkInserts.push({
        content: chunk,
        embedding: chunkEmbedding,
        metadata: {
          filename: 'auto-learned.txt',
          chunk_index: i,
          chunk_type: chunkType,
          total_chunks: chunks.length,
          source_type: 'auto-learned',
          learned_at: new Date().toISOString(),
          original_context: context || ''
        },
      })
    }

    const { error: insertError } = await supabase
      .from('chunks_table')
      .insert(chunkInserts as any)

    if (insertError) {
      console.error('Error inserting auto-learned chunks:', insertError)
      return NextResponse.json(
        { error: 'Failed to save learned content' },
        { status: 500 }
      )
    }

    console.log('[Learn] Successfully learned new content:', text.substring(0, 100))

    return NextResponse.json({
      learned: true,
      chunks: chunks.length,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    })

  } catch (error) {
    console.error('Error in auto-learn:', error)
    return NextResponse.json(
      { error: 'Failed to process learning request' },
      { status: 500 }
    )
  }
}

/**
 * Chunk text into individual sentences and important words/phrases
 * This creates more precise autocomplete suggestions
 */
function chunkText(text: string): string[] {
  const chunks: string[] = []
  
  // Split into sentences (keeping the punctuation)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || []
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    
    // Skip very short or empty sentences
    if (trimmed.length < 3) continue
    
    // Add the complete sentence as a chunk
    chunks.push(trimmed)
    
    // Extract important words and phrases from the sentence
    // Remove punctuation and split into words
    const words = trimmed
      .replace(/[^\w\s'-]/g, '') // Keep hyphens and apostrophes
      .split(/\s+/)
      .filter(word => word.length > 0)
    
    // Add individual significant words (length >= 4)
    for (const word of words) {
      if (word.length >= 4 && !isCommonWord(word.toLowerCase())) {
        chunks.push(word)
      }
    }
    
    // Add 2-3 word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const twoWordPhrase = words[i] + ' ' + words[i + 1]
      if (twoWordPhrase.length >= 8) {
        chunks.push(twoWordPhrase)
      }
      
      if (i < words.length - 2) {
        const threeWordPhrase = words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]
        if (threeWordPhrase.length >= 12) {
          chunks.push(threeWordPhrase)
        }
      }
    }
  }
  
  // Remove duplicates while preserving order
  return Array.from(new Set(chunks))
}

/**
 * Check if a word is too common to be useful for autocomplete
 */
function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
    'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
    'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
    'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than',
    'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
    'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even',
    'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is',
    'was', 'are', 'been', 'has', 'had', 'were', 'said', 'did', 'am', 'very'
  ])
  
  return commonWords.has(word)
}

/**
 * Categorize chunk type for better matching
 */
function categorizeChunk(text: string): 'word' | 'phrase' | 'sentence' {
  const trimmed = text.trim()
  const wordCount = trimmed.split(/\s+/).length
  const hasPunctuation = /[.!?]$/.test(trimmed)
  
  if (wordCount === 1) {
    return 'word'
  } else if (wordCount <= 3 && !hasPunctuation) {
    return 'phrase'
  } else {
    return 'sentence'
  }
}

