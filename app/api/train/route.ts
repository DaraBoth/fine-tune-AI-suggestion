import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'
import pdf from 'pdf-parse'

/**
 * Chunk text into smaller pieces for better embedding quality
 */
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = []
  
  // For very short text (less than chunkSize), return it as a single chunk
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
        // Add overlap by taking last few words
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
  
  // Filter out very short chunks but keep anything with at least 3 characters
  return chunks.filter(chunk => chunk.trim().length > 3)
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

    // Chunk the text
    const chunks = chunkText(extractedText, 1000, 200)

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
