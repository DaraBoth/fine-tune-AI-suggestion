/**
 * API Keys Service
 * Handles API key generation and management
 */

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  rate_limit: number
  allowed_endpoints: string[]
  created_at: string
  last_used_at?: string
}

export interface GenerateKeyRequest {
  name: string
  rateLimit?: number
  allowedEndpoints?: string[]
}

export interface GenerateKeyResponse {
  success: boolean
  key: string
  keyData: ApiKey
  warning: string
}

/**
 * Generate a new API key
 */
export async function generateApiKey(request: GenerateKeyRequest): Promise<GenerateKeyResponse> {
  const response = await fetch('/api/keys/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to generate API key')
  }

  return response.json()
}

/**
 * List all API keys (without actual key values)
 */
export async function listApiKeys(): Promise<ApiKey[]> {
  const response = await fetch('/api/keys/generate')

  if (!response.ok) {
    throw new Error('Failed to fetch API keys')
  }

  const data = await response.json()
  return data.keys || []
}

/**
 * Update an API key
 */
export async function updateApiKey(
  id: string,
  updates: {
    isActive?: boolean
    rateLimit?: number
    allowedEndpoints?: string[]
    name?: string
  }
): Promise<ApiKey> {
  const response = await fetch(`/api/keys/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update API key')
  }

  const data = await response.json()
  return data.key
}

/**
 * Delete an API key
 */
export async function deleteApiKey(id: string): Promise<void> {
  const response = await fetch(`/api/keys/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete API key')
  }
}
