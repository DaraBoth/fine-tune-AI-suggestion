import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * PATCH /api/keys/[id]
 * Update an API key (activate/deactivate, change rate limit, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { isActive, rateLimit, allowedEndpoints, name } = body

    const updates: any = {}
    if (typeof isActive === 'boolean') updates.is_active = isActive
    if (rateLimit) updates.rate_limit = rateLimit
    if (allowedEndpoints) updates.allowed_endpoints = allowedEndpoints
    if (name) updates.name = name

    const { data, error }:{data: any, error: any} = await (supabase
      .from('public_api_keys') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update API key: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      key: data,
    })

  } catch (error) {
    console.error('Error updating API key:', error)
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/keys/[id]
 * Delete an API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabase
      .from('public_api_keys')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete API key: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully',
    })

  } catch (error) {
    console.error('Error deleting API key:', error)
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    )
  }
}
