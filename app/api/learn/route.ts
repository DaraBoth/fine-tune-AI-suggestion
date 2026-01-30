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
      
      chunkInserts.push({
        content: chunk,
        embedding: chunkEmbedding,
        metadata: {
          filename: 'auto-learned.txt',
          chunk_index: i,
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
 * Chunk text into smaller pieces for better embedding quality
 */
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = []
  
  if (text.trim().length <= chunkSize) {
    return [text.trim()]
  }
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  let currentChunk = ''
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    
    if ((currentChunk + trimmed).length < chunkSize) {
      currentChunk += (currentChunk ? '. ' : '') + trimmed
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.')
        const words = currentChunk.split(' ')
        const overlapWords = words.slice(-Math.min(overlap, words.length))
        currentChunk = overlapWords.join(' ') + '. ' + trimmed
      } else {
        currentChunk = trimmed
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk + '.')
  }
  
  return chunks.filter(chunk => chunk.trim().length > 3)
}
