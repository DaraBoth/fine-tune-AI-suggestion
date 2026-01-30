import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/verify-admin
 * Verify admin password for sensitive operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    // Get admin password from environment variable
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      console.error('[Verify Admin] ADMIN_PASSWORD not configured in environment')
      return NextResponse.json(
        { error: 'Admin password not configured' },
        { status: 500 }
      )
    }

    // Compare passwords (use constant-time comparison in production)
    const isValid = password === adminPassword

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password verified',
    })

  } catch (error) {
    console.error('Error verifying admin password:', error)
    return NextResponse.json(
      { error: 'Failed to verify password' },
      { status: 500 }
    )
  }
}
