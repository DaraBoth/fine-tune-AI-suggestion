import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'
import pdf from 'pdf-parse'

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check if this is a manual training file (should be appended)
    const isManualTraining = file.name === 'manual-training.txt'
    
    // If it's manual training, get existing content first (before deleting)
    let existingManualContent = ''
    if (isManualTraining) {
      console.log('[Train] Checking for existing manual training data...')
      
      const { data: existingChunks } = await supabase
        .from('chunks_table')
        .select('content')
        .eq('metadata->>filename', file.name)
        .order('metadata->>chunk_index', { ascending: true })
      
      if (existingChunks && existingChunks.length > 0) {
        existingManualContent = existingChunks.map((c: any) => c.content).join('\n\n')
        console.log(`[Train] Found existing content: ${existingManualContent.length} characters`)
        
        // Delete old chunks so we can re-chunk the combined content
        await supabase
          .from('chunks_table')
          .delete()
          .eq('metadata->>filename', file.name)
      }
    }

    // Upload original file to Supabase Storage first
    const fileBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(fileBuffer)
    
    const timestamp = new Date().getTime()
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storageFilename = `${timestamp}-${sanitizedFilename}`
    
    console.log(`Uploading original file to storage: ${storageFilename}`)
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('training-files')
      .upload(storageFilename, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })
    
    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError)
      // Continue processing even if upload fails, but log the error
    } else {
      console.log('File uploaded successfully to storage:', uploadData.path)
    }

    let extractedText = ''

    // Handle PDF files
    if (file.type === 'application/pdf') {
      // Use the already loaded buffer
      
      // Extract text from PDF
      const data = await pdf(buffer)
      extractedText = data.text
    } 
    // Handle plain text files
    else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const newText = await file.text()
      
      // If manual training, append to existing content
      if (isManualTraining && existingManualContent) {
        extractedText = existingManualContent + '\n\n' + newText
        console.log('[Train] Appended new content to existing manual training data')
      } else {
        extractedText = newText
      }
    } 
    // Unsupported file type
    else {
      return NextResponse.json(
        { error: 'Only PDF and text files are supported' },
        { status: 400 }
      )
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text could be extracted from the file' },
        { status: 400 }
      )
    }

    // Chunk the text into sentences and phrases
    const chunks = chunkText(extractedText)

    console.log(`Extracted text length: ${extractedText.length}`)
    console.log(`Created ${chunks.length} chunks from text`)
    if (chunks.length > 0) {
      console.log(`First chunk preview: ${chunks[0].substring(0, 100)}...`)
    }

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create text chunks' },
        { status: 400 }
      )
    }

    // Process each chunk: generate embedding and insert into database
    const insertedChunks = []
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      try {
        // Generate embedding using OpenAI
        const embedding = await generateEmbedding(chunk)
        
        console.log(`Generated embedding for chunk ${i + 1}/${chunks.length}, dimension: ${embedding.length}`)
        
        // Categorize chunk type
        const chunkType = categorizeChunk(chunk)
        
        // Insert into Supabase
        const { data, error }:{data: any, error: any} = await supabase
          .from('chunks_table')
          .insert({
            content: chunk,
            embedding: embedding,
            metadata: {
              filename: file.name,
              storage_path: uploadData?.path || null,
              file_type: file.type,
              file_size: file.size,
              chunk_index: i,
              chunk_type: chunkType,
              total_chunks: chunks.length,
              characters: chunk.length,
              uploaded_at: new Date().toISOString(),
            },
          } as any)
          .select()
          .single()

        if (error) {
          console.error('Error inserting chunk:', error)
          continue
        }

        console.log(`Successfully inserted chunk ${i + 1}/${chunks.length} with ID: ${data?.id}`)
        insertedChunks.push(data)
      } catch (error) {
        console.error('Error processing chunk:', error)
        continue
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${insertedChunks.length} out of ${chunks.length} chunks`,
      chunks: insertedChunks.length,
      filename: file.name,
    })

  } catch (error) {
    console.error('Training error:', error)
    return NextResponse.json(
      { error: 'Failed to process PDF file' },
      { status: 500 }
    )
  }
}
