import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * DELETE endpoint to remove trained data by filename
 * This allows users to "forget" specific training files
 */
export async function DELETE(request: NextRequest) {
  try {
    const { filename } = await request.json()

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      )
    }

    console.log(`[Forget] Attempting to delete chunks for file: ${filename}`)

    // Delete all chunks with matching filename in metadata
    const { data, error } = await supabase
      .from('chunks_table')
      .delete()
      .eq('metadata->>filename', filename)
      .select()

    if (error) {
      console.error('[Forget] Error deleting chunks:', error)
      return NextResponse.json(
        { error: 'Failed to delete chunks: ' + error.message },
        { status: 500 }
      )
    }

    const deletedCount = data?.length || 0
    console.log(`[Forget] Successfully deleted ${deletedCount} chunks for file: ${filename}`)

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} chunks from "${filename}"`,
      deletedCount,
      filename,
    })
  } catch (error) {
    console.error('[Forget] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete training data' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to retrieve list of all trained files
 */
export async function GET() {
  try {
    console.log('[Forget] Fetching list of trained files')

    // Get all unique filenames from metadata
    const { data, error } = await supabase
      .from('chunks_table')
      .select('metadata')

    if (error) {
      console.error('[Forget] Error fetching files:', error)
      return NextResponse.json(
        { error: 'Failed to fetch training files: ' + error.message },
        { status: 500 }
      )
    }

    // Extract unique filenames and count chunks per file
    const fileMap = new Map<string, { filename: string; chunkCount: number; lastUpdated: string }>()
    
    data?.forEach((row: any) => {
      const metadata = row.metadata
      if (metadata?.filename) {
        const existing = fileMap.get(metadata.filename)
        if (existing) {
          existing.chunkCount++
        } else {
          fileMap.set(metadata.filename, {
            filename: metadata.filename,
            chunkCount: 1,
            lastUpdated: metadata.uploadedAt || new Date().toISOString(),
          })
        }
      }
    })

    const files = Array.from(fileMap.values()).sort((a, b) => 
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    )

    console.log(`[Forget] Found ${files.length} unique training files`)

    return NextResponse.json({
      success: true,
      files,
      totalFiles: files.length,
    })
  } catch (error) {
    console.error('[Forget] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch training files' },
      { status: 500 }
    )
  }
}
