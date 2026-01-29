import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET endpoint to download the original file from Supabase Storage
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename parameter is required' },
        { status: 400 }
      )
    }

    console.log(`[Download Original] Fetching storage path for file: ${filename}`)

    // Get the storage path from any chunk with this filename
    const { data: chunks, error: queryError } = await supabase
      .from('chunks_table')
      .select('metadata')
      .eq('metadata->>filename', filename)
      .limit(1)

    if (queryError || !chunks || chunks.length === 0) {
      console.error('[Download Original] Error fetching file metadata:', queryError)
      return NextResponse.json(
        { error: 'File not found in database' },
        { status: 404 }
      )
    }

    const metadata = (chunks as any)[0].metadata as any
    const storagePath = metadata?.storage_path

    if (!storagePath) {
      return NextResponse.json(
        { error: 'Original file not available in storage. This file may have been uploaded before the storage feature was added.' },
        { status: 404 }
      )
    }

    console.log(`[Download Original] Downloading file from storage: ${storagePath}`)

    // Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('training-files')
      .download(storagePath)

    if (downloadError || !fileData) {
      console.error('[Download Original] Error downloading file:', downloadError)
      return NextResponse.json(
        { error: 'Failed to download file from storage: ' + downloadError?.message },
        { status: 500 }
      )
    }

    console.log(`[Download Original] Successfully downloaded file: ${filename}`)

    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Return the file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': metadata.file_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('[Download Original] Error:', error)
    return NextResponse.json(
      { error: 'Failed to download original file' },
      { status: 500 }
    )
  }
}
