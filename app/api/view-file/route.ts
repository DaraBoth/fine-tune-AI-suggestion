import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET endpoint to retrieve the content of a trained file by reconstructing it from chunks
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

    console.log(`[View File] Fetching chunks for file: ${filename}`)

    // Get all chunks for this filename, ordered by creation
    const { data, error }: { data: any[] | null; error: any } = await supabase
      .from('chunks_table')
      .select('content, metadata, created_at')
      .eq('metadata->>filename', filename)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[View File] Error fetching chunks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch file content: ' + error.message },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Reconstruct the file content from chunks
    // Remove the overlap and join chunks
    const chunks = data.map((chunk: any) => chunk.content)
    const fullContent = chunks.join('\n\n')

    const metadata = data[0].metadata

    console.log(`[View File] Successfully retrieved ${data.length} chunks for ${filename}`)

    return NextResponse.json({
      success: true,
      filename,
      content: fullContent,
      chunkCount: data.length,
      metadata,
      totalCharacters: fullContent.length,
    })
  } catch (error) {
    console.error('[View File] Error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve file content' },
      { status: 500 }
    )
  }
}
