import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    // Get total number of chunks
    const { count: totalChunks, error: countError } = await supabase
      .from('chunks_table')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Error counting chunks:', countError)
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      )
    }

    // Get unique files trained and calculate total characters
    const { data: uniqueFiles, error: filesError } = await supabase
      .from('chunks_table')
      .select('metadata, content')

    if (filesError) {
      console.error('Error fetching chunks:', filesError)
    }

    const fileNames = new Set<string>()
    let totalCharacters = 0
    
    if (uniqueFiles) {
      uniqueFiles.forEach((chunk: any) => {
        if (chunk.metadata?.filename) {
          fileNames.add(chunk.metadata.filename)
        }
        // Calculate from actual content length
        if (chunk.content) {
          totalCharacters += chunk.content.length
        }
      })
    }

    // Get most recent training
    const { data: latestChunk, error: latestError } = await supabase
      .from('chunks_table')
      .select('metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let lastTrainingDate: string | null = null
    let lastTrainingFile: string | null = null
    
    if (!latestError && latestChunk) {
      lastTrainingDate = (latestChunk as any).created_at
      lastTrainingFile = (latestChunk as any).metadata?.filename
    }

    return NextResponse.json({
      totalChunks: totalChunks || 0,
      totalFiles: fileNames.size,
      totalCharacters,
      files: Array.from(fileNames),
      lastTrainingDate,
      lastTrainingFile,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error('Training stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch training statistics' },
      { status: 500 }
    )
  }
}
