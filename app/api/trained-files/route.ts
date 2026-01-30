import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET endpoint to retrieve list of all trained files
 */
export async function GET() {
  try {
    console.log('[Trained Files] Fetching list of trained files')

    // Get all unique filenames from metadata
    const { data, error } = await supabase
      .from('chunks_table')
      .select('metadata')

    if (error) {
      console.error('[Trained Files] Error fetching files:', error)
      return NextResponse.json(
        { error: 'Failed to fetch training files: ' + error.message },
        { status: 500 }
      )
    }

    // Extract unique filenames and count chunks per file
    const fileMap = new Map<string, { filename: string; chunkCount: number; lastUpdated: string }>()
    
    data?.forEach((chunk: any) => {
      const filename = chunk.metadata?.filename
      const uploadedAt = chunk.metadata?.uploaded_at || chunk.metadata?.learned_at
      
      if (filename) {
        const existing = fileMap.get(filename)
        if (existing) {
          existing.chunkCount++
          // Keep the most recent timestamp
          if (uploadedAt && uploadedAt > existing.lastUpdated) {
            existing.lastUpdated = uploadedAt
          }
        } else {
          fileMap.set(filename, {
            filename,
            chunkCount: 1,
            lastUpdated: uploadedAt || new Date().toISOString(),
          })
        }
      }
    })

    // Convert map to array and sort by last updated (most recent first)
    const files = Array.from(fileMap.values()).sort((a, b) => 
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    )

    console.log(`[Trained Files] Found ${files.length} unique files`)

    return NextResponse.json({
      success: true,
      files,
      totalFiles: files.length,
    })
  } catch (error) {
    console.error('[Trained Files] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch training files' },
      { status: 500 }
    )
  }
}
