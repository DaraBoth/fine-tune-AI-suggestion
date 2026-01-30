# 🔐 API System Setup Guide

## Quick Setup Instructions

### Step 1: Run Database Migration

Execute the SQL migration to create the required tables:

```bash
# Connect to your Supabase database and run:
psql -h your-db-host -U postgres -d your-database -f supabase/migrations/003_create_api_keys_table.sql
```

Or through Supabase Dashboard:
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/003_create_api_keys_table.sql`
4. Click "Run"

### Step 2: Generate Your First API Key

Use the web interface or API to generate a key:

```bash
curl -X POST http://localhost:3001/api/keys/generate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First API Key",
    "rateLimit": 1000,
    "allowedEndpoints": ["complete-word", "suggest-phrase", "chat"],
    "metadata": {
      "email": "your@email.com"
    }
  }'
```

**Save the returned API key securely!**

### Step 3: Test Your API

```bash
curl -X POST http://localhost:3001/api/public/complete-word \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I love to eat",
    "incompleteWord": "app",
    "limit": 5
  }'
```

## Security Checklist

- ✅ API keys are hashed with SHA-256
- ✅ Rate limiting enabled (configurable per key)
- ✅ Endpoint access control
- ✅ Key expiration support
- ✅ Usage logging and analytics
- ✅ HTTPS required in production
- ✅ Optional encryption for sensitive data

## Production Deployment

1. **Set Environment Variables:**
   ```bash
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-anon-key
   OPENAI_API_KEY=your-openai-key
   ADMIN_PASSWORD=your-secure-admin-password
   ```

2. **Enable HTTPS:** All API requests must use HTTPS in production

3. **Configure CORS:** Adjust CORS settings if needed for your domain

4. **Monitor Usage:** Check the `api_usage_logs` table regularly

5. **Set Up Alerts:** Create alerts for unusual API activity

## API Endpoints Summary

### Management Endpoints (Internal)
- `POST /api/keys/generate` - Generate new API key
- `GET /api/keys/generate` - List all keys
- `PATCH /api/keys/[id]` - Update a key
- `DELETE /api/keys/[id]` - Delete a key

### Public Endpoints (For Third-Party Use)
- `POST /api/public/complete-word` - Word completion
- `POST /api/public/suggest-phrase` - Phrase suggestions
- `POST /api/public/chat` - AI chat

## Rate Limit Configuration

Default limits:
- **Free Tier:** 100 requests/hour
- **Basic Tier:** 1,000 requests/hour
- **Pro Tier:** 10,000 requests/hour
- **Enterprise:** Custom

## Monitoring

Check API usage:
```sql
SELECT 
  ak.name,
  ak.key_prefix,
  COUNT(*) as total_requests,
  AVG(response_time_ms) as avg_response_time,
  COUNT(CASE WHEN status_code >= 400 THEN 1 END) as errors
FROM public_api_usage_logs aul
JOIN public_api_keys ak ON aul.api_key_id = ak.id
WHERE aul.created_at > NOW() - INTERVAL '24 hours'
GROUP BY ak.id, ak.name, ak.key_prefix
ORDER BY total_requests DESC;
```

## Need Help?

Refer to [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for complete API documentation.
