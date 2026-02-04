import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/embeddings'
import pdf from 'pdf-parse'
import { extractTextFromPDFImages } from '@/lib/ocr'

/**
 * Chunk text by words (word-by-word extraction)
 */
function chunkByWords(text: string): string[] {
  const chunks: string[] = []

  // Split by whitespace and punctuation, keeping meaningful words
  const words = text
    .replace(/[\r\n]+/g, ' ') // Replace newlines with spaces
    .split(/[\s,.!?;:()\[\]{}"']+/) // Split by spaces and punctuation
    .map(w => w.trim())
    .filter(w => w.length > 0)

  for (const word of words) {
    // Skip very short words and common words
    if (word.length >= 2 && !isCommonWord(word.toLowerCase())) {
      chunks.push(word)
    }
  }

  // Remove duplicates
  return Array.from(new Set(chunks))
}

/**
 * Chunk text by sentences (sentence-by-sentence extraction)
 */
function chunkBySentences(text: string): string[] {
  const chunks: string[] = []

  // Split by sentence-ending punctuation (. ! ? and also handle ellipsis, etc.)
  const sentences = text
    .replace(/([.!?])\s+/g, '$1|') // Mark sentence boundaries
    .replace(/\.{3,}/g, '...|') // Handle ellipsis
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  for (const sentence of sentences) {
    // Skip very short sentences
    if (sentence.length >= 3) {
      chunks.push(sentence)
    }
  }

  // Remove duplicates
  return Array.from(new Set(chunks))
}

/**
 * Chunk text into individual sentences and important words/phrases (default/smart mode)
 * This creates more precise autocomplete suggestions
 */
function chunkText(text: string, chunkType: 'word' | 'sentence' | 'smart' = 'smart'): string[] {
  // Use specific chunking strategy if requested
  if (chunkType === 'word') {
    return chunkByWords(text)
  }

  if (chunkType === 'sentence') {
    return chunkBySentences(text)
  }

  // Smart mode: extract sentences, words, and phrases
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
    const chunkTypeParam = formData.get('chunkType') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check file size limit (50MB for larger document training)
    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum limit of 50MB`
        },
        { status: 400 }
      )
    }

    // Parse chunk type (default to 'smart')
    const chunkType = (['word', 'sentence', 'smart'].includes(chunkTypeParam))
      ? chunkTypeParam as 'word' | 'sentence' | 'smart'
      : 'smart'

    console.log(`[Train] Using chunking strategy: ${chunkType}`)
    console.log(`[Train] File size: ${(file.size / (1024 * 1024)).toFixed(1)}MB`)

    // Track OCR statistics
    let ocrStats = {
      imagesProcessed: 0,
      charactersExtracted: 0,
      provider: 'none' as string
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

      console.log('[Train] Extracting text from PDF...')

      // Extract regular text from PDF
      const data = await pdf(buffer)
      extractedText = data.text

      console.log(`[Train] Extracted ${extractedText.length} characters from PDF text`)

      // Extract text from images using OCR
      console.log('[Train] Starting OCR on PDF images...')
      const ocrResult = await extractTextFromPDFImages(buffer)

      // Store OCR stats
      ocrStats = {
        imagesProcessed: ocrResult.imagesProcessed,
        charactersExtracted: ocrResult.charactersExtracted,
        provider: ocrResult.provider
      }

      if (ocrResult.text && ocrResult.text.length > 0) {
        console.log(`[Train] OCR (${ocrResult.provider}) extracted ${ocrResult.charactersExtracted} characters from ${ocrResult.imagesProcessed} images`)
        extractedText += '\n\n' + ocrResult.text
      } else {
        console.log('[Train] No text extracted from images (or no images found)')
      }

      console.log(`[Train] Total extracted text: ${extractedText.length} characters`)
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

    // Chunk the text using the selected strategy
    const chunks = chunkText(extractedText, chunkType)

    console.log(`Extracted text length: ${extractedText.length}`)
    console.log(`Created ${chunks.length} chunks from text using '${chunkType}' strategy`)
    if (chunks.length > 0) {
      console.log(`First chunk preview: ${chunks[0].substring(0, 100)}...`)
    }

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create text chunks' },
        { status: 400 }
      )
    }

    // Process chunks in batches to avoid timeout
    const BATCH_SIZE = 50 // Process 50 chunks at a time
    const TIMEOUT_THRESHOLD = 50000 // 50 seconds (leave 10s buffer for 60s timeout)
    const startTime = Date.now()

    const insertedChunks = []
    let processedCount = 0

    // Process in batches
    for (let batchStart = 0; batchStart < chunks.length; batchStart += BATCH_SIZE) {
      // Check if we're approaching timeout
      const elapsedTime = Date.now() - startTime
      if (elapsedTime > TIMEOUT_THRESHOLD) {
        console.log(`[Train] Approaching timeout after ${elapsedTime}ms, stopping at chunk ${processedCount}/${chunks.length}`)

        return NextResponse.json({
          success: true,
          partial: true,
          message: `Processed ${processedCount} of ${chunks.length} chunks (timeout limit reached). Please re-upload to continue processing remaining chunks.`,
          chunks: insertedChunks.length,
          filename: file.name,
          processed: processedCount,
          total: chunks.length,
          remaining: chunks.length - processedCount,
        })
      }

      const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length)
      const batchChunks = chunks.slice(batchStart, batchEnd)

      console.log(`[Train] Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: chunks ${batchStart + 1}-${batchEnd} of ${chunks.length}`)

      // Process batch chunks in parallel for speed
      const batchPromises = batchChunks.map(async (chunk, batchIndex) => {
        const i = batchStart + batchIndex

        try {
          // Generate embedding using OpenAI
          const embedding = await generateEmbedding(chunk)

          // Categorize chunk type
          const chunkCategory = categorizeChunk(chunk)

          // Insert into Supabase
          const { data, error }: { data: any, error: any } = await supabase
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
                chunk_type: chunkCategory,
                chunk_strategy: chunkType,
                total_chunks: chunks.length,
                characters: chunk.length,
                uploaded_at: new Date().toISOString(),
              },
            } as any)
            .select()
            .single()

          if (error) {
            console.error(`Error inserting chunk ${i + 1}:`, error)
            return null
          }

          return data
        } catch (error) {
          console.error(`Error processing chunk ${i + 1}:`, error)
          return null
        }
      })

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises)
      const successfulInserts = batchResults.filter(r => r !== null)
      insertedChunks.push(...successfulInserts)
      processedCount += batchChunks.length

      console.log(`[Train] Batch complete: ${successfulInserts.length}/${batchChunks.length} successful, total: ${insertedChunks.length}/${chunks.length}`)
    }

    const finalElapsedTime = Date.now() - startTime
    console.log(`[Train] Completed processing ${insertedChunks.length} chunks in ${finalElapsedTime}ms`)

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${insertedChunks.length} out of ${chunks.length} chunks`,
      chunks: insertedChunks.length,
      filename: file.name,
      processingTime: finalElapsedTime,
      ocr: ocrStats, // Include OCR statistics
    })

  } catch (error) {
    console.error('Training error:', error)
    return NextResponse.json(
      { error: 'Failed to process PDF file' },
      { status: 500 }
    )
  }
}
