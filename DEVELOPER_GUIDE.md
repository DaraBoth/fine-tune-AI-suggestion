# TypeFlow AI - Developer Guide

> **Comprehensive Technical Documentation for Developers**  
> Version 1.0.0 | Last Updated: February 3, 2026

This guide provides an in-depth understanding of the TypeFlow AI architecture, implementation details, and development workflow for developers who want to study, contribute to, or extend this project.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Core Components](#core-components)
5. [Data Flow](#data-flow)
6. [Database Schema](#database-schema)
7. [API Routes](#api-routes)
8. [Services Layer](#services-layer)
9. [State Management](#state-management)
10. [RAG Implementation](#rag-implementation)
11. [Vector Search](#vector-search)
12. [Authentication & Security](#authentication--security)
13. [UI Components](#ui-components)
14. [Development Workflow](#development-workflow)
15. [Testing & Debugging](#testing--debugging)
16. [Performance Optimization](#performance-optimization)
17. [Deployment](#deployment)

---

## Project Overview

TypeFlow AI is a sophisticated **AI-powered autocomplete system** built with **Retrieval Augmented Generation (RAG)** architecture. It combines:

- **Real-time autocomplete**: Word completion and phrase suggestions
- **RAG-powered chat**: Conversational interface with trained documents
- **Training system**: PDF/text file processing with vector embeddings
- **Public API**: Secure API key system for external integrations
- **Admin dashboard**: File management and analytics

### Key Innovations

1. **Hybrid Suggestion System**: Combines trained data (vector search) with AI fallback
2. **Overlap Detection**: Intelligent deduplication to prevent repeated suggestions
3. **Language Detection**: Auto-detects and filters suggestions by language
4. **Debounced API Calls**: Optimized performance with caching
5. **Auto-Learning**: Accepted AI suggestions are automatically added to training data

---

## Technology Stack

### Frontend
- **Framework**: Next.js 15.1.6 (App Router)
- **UI Library**: React 18.3.1
- **Styling**: TailwindCSS 3.4.17
- **Animations**: Framer Motion 11.15.0
- **Icons**: Lucide React 0.468.0
- **State Management**: Zustand 5.0.2
- **Notifications**: Sonner 2.0.7

### Backend
- **Runtime**: Node.js (Next.js API Routes)
- **Database**: Supabase (PostgreSQL)
- **Vector Storage**: pgvector extension
- **File Storage**: Supabase Storage
- **AI Service**: OpenAI API (GPT-3.5-turbo, text-embedding-3-small)

### Development Tools
- **Language**: TypeScript 5.7.2
- **Linting**: ESLint 9.18.0
- **Package Manager**: npm/yarn

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     TypeFlow AI System                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│  User Input  │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────────────────────────┐
│                   React Components                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   ChatInput  │  │ ChatInterface│  │ TrainingTab  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────┬──────────────┬────────────┬──────────────┘
               │              │            │
               ↓              ↓            ↓
┌──────────────────────────────────────────────────────────┐
│                    Services Layer                         │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐      │
│  │ Autocomplete│ │  Chat Svc   │ │ Training Svc │      │
│  └─────────────┘ └─────────────┘ └──────────────┘      │
└──────────────┬──────────────┬────────────┬──────────────┘
               │              │            │
               ↓              ↓            ↓
┌──────────────────────────────────────────────────────────┐
│                    API Routes                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │/complete │ │ /suggest │ │  /chat   │ │  /train  │   │
│  │  -word   │ │ -phrase  │ │          │ │          │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└──────────────┬──────────────┬────────────┬──────────────┘
               │              │            │
               ↓              ↓            ↓
┌──────────────────────────────────────────────────────────┐
│                   RAG Processing                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  1. Generate Query Embedding (OpenAI)             │  │
│  │  2. Vector Similarity Search (Supabase)           │  │
│  │  3. Retrieve Top Matches                          │  │
│  │  4. AI Processing (GPT-3.5-turbo)                 │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────────────────┐
│                Data Storage Layer                         │
│  ┌──────────────┐           ┌──────────────┐            │
│  │   Supabase   │           │   OpenAI     │            │
│  │  PostgreSQL  │           │     API      │            │
│  │  + pgvector  │           │              │            │
│  └──────────────┘           └──────────────┘            │
└──────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. MainInterface (`components/MainInterface.tsx`)

**Purpose**: Root component that orchestrates the entire application

**Key Features**:
- Tab navigation (Autocomplete, Chat, Training)
- Header with branding and quick links
- Responsive footer
- Container for all main features

**Structure**:
```tsx
export default function MainInterface() {
  return (
    <div className="container mx-auto max-w-4xl">
      {/* Header */}
      {/* Tabs */}
      <Tabs defaultValue="autocomplete">
        <TabsContent value="autocomplete">
          <ChatInput />
        </TabsContent>
        <TabsContent value="chat">
          <ChatInterface />
        </TabsContent>
        <TabsContent value="training">
          <TrainingTab />
        </TabsContent>
      </Tabs>
      {/* Footer */}
    </div>
  )
}
```

---

### 2. ChatInput (`components/ChatInput.tsx`)

**Purpose**: Smart autocomplete input with real-time suggestions

**Core Functionality**:

#### Input State Analysis
```typescript
const analyzeInputState = (text: string) => {
  // Checks if text ends with sentence punctuation
  if (/[.!?]\s*$/.test(text)) {
    return { shouldFetch: true, type: 'phrase' }
  }
  
  // Checks for incomplete word
  const lastWord = text.split(/\s+/).pop()
  if (lastWord && lastWord.length > 0) {
    return { 
      shouldFetch: true, 
      type: 'word', 
      incompleteWord: lastWord 
    }
  }
  
  return { shouldFetch: false, type: null }
}
```

#### Overlap Detection Algorithm
```typescript
function calculateOverlap(input: string, suggestion: string): number {
  const normalizedInput = input.toLowerCase()
  const normalizedSuggestion = suggestion.toLowerCase()
  const maxOverlap = Math.min(input.length, suggestion.length)
  
  // Try different overlap lengths
  for (let i = maxOverlap; i > 0; i--) {
    const suffix = normalizedInput.substring(input.length - i)
    const prefix = normalizedSuggestion.substring(0, i)
    if (suffix === prefix) {
      return i
    }
  }
  return 0
}
```

#### Suggestion Fetching Strategy
1. **Debounced Input**: 250ms delay to avoid excessive API calls
2. **Cache-First**: Check local cache before fetching
3. **Dual-Fetch for Words**: Fetches both word completions and phrase suggestions
4. **Language Filtering**: Only shows suggestions matching detected language

**Key Props & State**:
- `inputValue`: Current text input
- `suggestions[]`: Array of suggestion objects
- `selectedSuggestionIndex`: Keyboard navigation index
- `isLoading`: Loading state
- `detectedLanguage`: Auto-detected input language

---

### 3. ChatInterface (`components/ChatInterface.tsx`)

**Purpose**: RAG-powered conversational interface

**Message Flow**:
1. User sends message
2. Message history sent to `/api/chat`
3. API generates embedding for query
4. Vector search retrieves relevant chunks
5. GPT-3.5-turbo generates response with context
6. Response includes metadata (KB usage, chunk count)

**Key Features**:
- Message history management
- Knowledge base usage indicators
- Animated beam effect when KB is used
- Auto-scroll to latest messages
- Clear chat functionality

**State Management**:
```typescript
// Zustand store integration
const messages = useAppStore((state) => state.chatMessages)
const addMessage = useAppStore((state) => state.addChatMessage)
const clearChat = useAppStore((state) => state.clearChat)
```

---

### 4. TrainingTab (`components/TrainingTab.tsx`)

**Purpose**: Upload and manage training data

**Features**:
1. **PDF Upload**: Drag-and-drop or click to upload
2. **Text Training**: Direct text input training
3. **File Management**: View, download, delete files
4. **Statistics Dashboard**: Real-time analytics
5. **Admin Authentication**: Password-protected actions

**Training Process**:
```
PDF File → Parse Text → Chunk (1000 chars) → 
Generate Embeddings → Store in Supabase → Update Stats
```

**File Management**:
- Multi-select deletion with confirmation
- Download original files
- View file metadata (chunks, date)
- Toast notifications for all operations

---

## Data Flow

### Autocomplete Flow

```
User Types → ChatInput
  ↓
Analyze Input State
  ↓
Debounce (250ms)
  ↓
Check Cache
  ↓ (cache miss)
Fetch Suggestions
  ├─→ /api/complete-word (for incomplete words)
  └─→ /api/suggest-phrase (for phrases)
      ↓
  Generate Query Embedding
      ↓
  Vector Search (Supabase)
      ↓
  If no results → OpenAI Fallback
      ↓
  Return Suggestions with metadata
      ↓
Display in Dropdown
  ↓
User Selects → Accept Suggestion
  ↓
If from AI → Auto-Learn (send to /api/learn)
```

### Chat Flow

```
User Message → ChatInterface
  ↓
Add to Message History
  ↓
POST /api/chat
  ↓
Generate Query Embedding
  ↓
Vector Search (top 5 matches)
  ↓
Build Context from Chunks
  ↓
GPT-3.5-turbo with Context
  ↓
Return Response + Metadata
  ↓
Display with KB Indicator
```

### Training Flow

```
Upload PDF/Text → TrainingTab
  ↓
Admin Password Verification
  ↓
POST /api/train
  ↓
Parse PDF (if applicable)
  ↓
Split into Chunks (1000 chars, 200 overlap)
  ↓
For each chunk:
  ├─→ Generate Embedding (OpenAI)
  ├─→ Store in Supabase
  └─→ Save Original File (Storage)
  ↓
Return Stats
  ↓
Update UI + Toast Notification
```

---

## Database Schema

### `chunks_table`

Primary table for storing text chunks with embeddings.

```sql
CREATE TABLE chunks_table (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(1536),  -- OpenAI embedding dimension
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX ON chunks_table 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for metadata queries
CREATE INDEX ON chunks_table 
USING GIN (metadata);
```

**Metadata Structure**:
```json
{
  "filename": "document.pdf",
  "chunk_index": 0,
  "total_chunks": 50,
  "storage_path": "user-id/filename.pdf",
  "trained_at": "2026-02-03T10:30:00Z"
}
```

### `api_keys`

Stores API keys for public API access.

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  allowed_endpoints TEXT[],
  rate_limit INTEGER DEFAULT 1000,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `api_logs`

Tracks all API usage for analytics.

```sql
CREATE TABLE api_logs (
  id BIGSERIAL PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id),
  endpoint TEXT NOT NULL,
  request_body JSONB,
  response_status INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## API Routes

### Authentication Types

1. **Public Endpoints**: No authentication required
2. **Admin Endpoints**: Require `ADMIN_PASSWORD` verification
3. **API Key Endpoints**: Require valid API key in `Authorization` header

### Autocomplete APIs

#### `POST /api/complete-word`

**Purpose**: Complete incomplete words

**Request**:
```json
{
  "query": "user input text",
  "incompleteWord": "incomp"
}
```

**Response**:
```json
{
  "suggestions": [
    {
      "text": "lete",
      "similarity": 0.92,
      "source": "trained-data",
      "suggestionType": "word"
    }
  ]
}
```

**RAG Process**:
1. Generate embedding for query
2. Search vectors with similarity > 0.7
3. Filter results matching incomplete word
4. Fallback to OpenAI if no results
5. Return top 5 suggestions

#### `POST /api/suggest-phrase`

**Purpose**: Suggest next phrases

**Request**:
```json
{
  "query": "user input text."
}
```

**Response**:
```json
{
  "suggestions": [
    {
      "text": "This is the next phrase",
      "similarity": 0.88,
      "source": "ai-with-context",
      "suggestionType": "phrase"
    }
  ]
}
```

---

### Chat API

#### `POST /api/chat`

**Purpose**: RAG-powered conversational AI

**Request**:
```json
{
  "message": "What is TypeFlow AI?",
  "history": [
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

**Response**:
```json
{
  "response": "TypeFlow AI is...",
  "usedKnowledgeBase": true,
  "contextChunks": 3
}
```

**Implementation**:
```typescript
// 1. Generate embedding
const embedding = await generateEmbedding(message)

// 2. Vector search
const { data: chunks } = await supabase.rpc('match_chunks', {
  query_embedding: embedding,
  match_threshold: 0.7,
  match_count: 5
})

// 3. Build context
const context = chunks.map(c => c.content).join('\n\n')

// 4. GPT-3.5-turbo with context
const completion = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'system', content: `Context:\n${context}` },
    ...history,
    { role: 'user', content: message }
  ]
})
```

---

### Training APIs

#### `POST /api/train`

**Purpose**: Upload and process training files

**Request** (multipart/form-data):
```
file: PDF or text file
password: Admin password
```

**Response**:
```json
{
  "success": true,
  "message": "Successfully trained",
  "chunks": 45,
  "filename": "document.pdf"
}
```

**Processing Steps**:
1. Verify admin password
2. Parse PDF (if PDF file)
3. Split text into chunks:
   - Size: 1000 characters
   - Overlap: 200 characters
4. For each chunk:
   - Generate embedding (OpenAI)
   - Insert into `chunks_table`
5. Save original file to storage
6. Return statistics

#### `POST /api/learn`

**Purpose**: Auto-learn accepted AI suggestions

**Request**:
```json
{
  "text": "accepted suggestion text",
  "context": "user's input before suggestion",
  "source": "openai-fallback"
}
```

**Response**:
```json
{
  "learned": true,
  "text": "accepted suggestion text",
  "reason": "Added to training data"
}
```

**Logic**:
```typescript
// Only learn AI-generated suggestions
if (source !== 'openai-fallback') {
  return { learned: false, reason: 'Already in training data' }
}

// Skip very short text
if (text.length < 10) {
  return { learned: false, reason: 'Text too short' }
}

// Generate embedding and store
const embedding = await generateEmbedding(text)
await supabase.from('chunks_table').insert({
  content: text,
  embedding,
  metadata: { auto_learned: true, context }
})
```

---

### File Management APIs

#### `DELETE /api/forget`

**Purpose**: Delete trained files

**Request**:
```json
{
  "filename": "document.pdf"
}
```

**Implementation**:
```typescript
// 1. Delete chunks from database
const { data } = await supabase
  .from('chunks_table')
  .delete()
  .eq('metadata->>filename', filename)

// 2. Delete file from storage (with timeout)
await supabase.storage
  .from('training-files')
  .remove([storagePath])
```

#### `GET /api/trained-files`

**Purpose**: List all trained files with statistics

**Response**:
```json
{
  "files": [
    {
      "filename": "document.pdf",
      "chunkCount": 45,
      "lastUpdated": "2026-02-03T10:30:00Z"
    }
  ]
}
```

---

## Services Layer

### Autocomplete Service (`services/autocomplete.service.ts`)

Wrapper for autocomplete API calls.

```typescript
export async function completeWord(
  query: string, 
  incompleteWord: string
): Promise<SuggestionResponse> {
  const response = await fetch('/api/complete-word', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, incompleteWord })
  })
  return response.json()
}

export async function suggestPhrase(
  query: string
): Promise<SuggestionResponse> {
  const response = await fetch('/api/suggest-phrase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  })
  return response.json()
}
```

### Chat Service (`services/chat.service.ts`)

Handles chat API communication.

```typescript
export async function sendChatMessage(
  message: string,
  history: ChatMessage[]
): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history })
  })
  return response.json()
}
```

### Training Service (`services/training.service.ts`)

Manages training operations.

```typescript
export async function trainWithFile(
  file: File,
  password: string
): Promise<TrainingResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('password', password)
  
  const response = await fetch('/api/train', {
    method: 'POST',
    body: formData
  })
  return response.json()
}

export async function deleteTrainingFile(
  filename: string
): Promise<void> {
  await fetch('/api/forget', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  })
}
```

---

## State Management

### Zustand Store (`lib/store.ts`)

Global state management using Zustand.

```typescript
interface AppState {
  // Autocomplete state
  autocompleteInput: string
  setAutocompleteInput: (value: string) => void
  
  // Chat state
  chatInput: string
  setChatInput: (value: string) => void
  chatMessages: Message[]
  addChatMessage: (message: Message) => void
  setChatMessages: (messages: Message[]) => void
  clearChat: () => void
  
  // Training state
  trainingUploadStatus: UploadStatus | null
  setTrainingUploadStatus: (status: UploadStatus) => void
}

export const useAppStore = create<AppState>((set) => ({
  autocompleteInput: '',
  setAutocompleteInput: (value) => set({ autocompleteInput: value }),
  
  chatInput: '',
  setChatInput: (value) => set({ chatInput: value }),
  chatMessages: [],
  addChatMessage: (message) => 
    set((state) => ({ 
      chatMessages: [...state.chatMessages, message] 
    })),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  clearChat: () => set({ chatMessages: [] }),
  
  trainingUploadStatus: null,
  setTrainingUploadStatus: (status) => 
    set({ trainingUploadStatus: status })
}))
```

**Benefits**:
- Persists across tab switches
- No prop drilling
- Simple API
- TypeScript support

---

## RAG Implementation

### What is RAG?

**Retrieval Augmented Generation** combines:
1. **Retrieval**: Find relevant documents via vector search
2. **Augmentation**: Add retrieved context to prompt
3. **Generation**: AI generates response with context

### Vector Embeddings

**OpenAI text-embedding-3-small**:
- Dimension: 1536
- Cost: $0.02 / 1M tokens
- Fast and accurate

```typescript
export async function generateEmbedding(
  text: string
): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  })
  return response.data[0].embedding
}
```

### Vector Search Function

PostgreSQL function for similarity search:

```sql
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    chunks_table.id,
    chunks_table.content,
    chunks_table.metadata,
    1 - (chunks_table.embedding <=> query_embedding) AS similarity
  FROM chunks_table
  WHERE 1 - (chunks_table.embedding <=> query_embedding) > match_threshold
  ORDER BY chunks_table.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**Operators**:
- `<=>`: Cosine distance
- `<->`: Euclidean distance
- `<#>`: Inner product

### RAG Pipeline

```typescript
async function ragQuery(query: string) {
  // 1. Generate embedding
  const embedding = await generateEmbedding(query)
  
  // 2. Vector search
  const { data: matches } = await supabase.rpc('match_chunks', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 5
  })
  
  // 3. Extract context
  const context = matches
    .map(m => m.content)
    .join('\n\n')
  
  // 4. AI generation
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `Answer based on this context:\n${context}`
      },
      {
        role: 'user',
        content: query
      }
    ]
  })
  
  return {
    response: completion.choices[0].message.content,
    usedContext: matches.length > 0
  }
}
```

---

## Vector Search

### Similarity Thresholds

- **Autocomplete**: 0.7 (good match required)
- **Chat**: 0.7 (context must be relevant)
- **1.0**: Perfect match
- **0.9+**: Very similar
- **0.7-0.9**: Somewhat similar
- **<0.7**: Not relevant

### Optimization Strategies

1. **Indexing**: IVFFlat index for fast search
2. **Chunking**: Optimal chunk size (1000 chars)
3. **Overlap**: 200 char overlap prevents loss
4. **Caching**: Client-side cache for repeated queries
5. **Batch Processing**: Generate embeddings in batches

### Performance

- **Search Time**: ~50-100ms
- **Embedding Generation**: ~200-300ms
- **Total Latency**: ~300-500ms

---

## Authentication & Security

### Admin Password

Set in `.env`:
```
ADMIN_PASSWORD=YourSecurePassword123
```

**Verification**:
```typescript
// app/api/verify-admin/route.ts
export async function POST(request: NextRequest) {
  const { password } = await request.json()
  const isValid = password === process.env.ADMIN_PASSWORD
  return NextResponse.json({ valid: isValid })
}
```

### API Keys

**Generation**:
```typescript
import crypto from 'crypto'

function generateApiKey(): string {
  return 'tfai_' + crypto.randomBytes(32).toString('hex')
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}
```

**Validation**:
```typescript
// lib/auth-middleware.ts
export async function validateApiKey(
  request: NextRequest
): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  const key = authHeader?.replace('Bearer ', '')
  
  if (!key) return false
  
  const keyHash = hashApiKey(key)
  const { data } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .single()
  
  return !!data
}
```

### Rate Limiting

```typescript
async function checkRateLimit(keyId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 3600000)
  
  const { count } = await supabase
    .from('api_logs')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', keyId)
    .gte('created_at', oneHourAgo.toISOString())
  
  const { data: key } = await supabase
    .from('api_keys')
    .select('rate_limit')
    .eq('id', keyId)
    .single()
  
  return (count || 0) < (key?.rate_limit || 1000)
}
```

---

## UI Components

### Magic UI Components

1. **ShimmerButton**: Animated gradient button
2. **BorderBeam**: Rotating border animation
3. **Particles**: Floating particle effects
4. **DotPattern**: Background pattern overlay
5. **NumberTicker**: Counting animation
6. **Sparkles**: Sparkle animation effect

### Component Structure

```tsx
// components/ui/shimmer-button.tsx
export default function ShimmerButton({
  children,
  shimmerColor = '#ffffff',
  shimmerSize = '0.05em',
  borderRadius = '100px',
  className,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      style={{
        '--spread': '90deg',
        '--shimmer-color': shimmerColor,
        '--radius': borderRadius,
        '--speed': '2s',
        '--cut': shimmerSize,
      } as React.CSSProperties}
      className={cn('shimmer-button', className)}
      {...props}
    >
      {children}
    </button>
  )
}
```

### Responsive Design

**Breakpoints**:
```typescript
const breakpoints = {
  xs: '475px',   // Extra small devices
  sm: '640px',   // Small devices
  md: '768px',   // Medium devices
  lg: '1024px',  // Large devices
  xl: '1280px',  // Extra large devices
  '2xl': '1536px' // 2X large devices
}
```

**Mobile-First Approach**:
```tsx
<div className="text-sm sm:text-base md:text-lg">
  Responsive text
</div>
```

---

## Development Workflow

### Setup

```bash
# Clone repository
git clone https://github.com/DaraBoth/fine-tune-AI-suggestion.git
cd fine-tune-AI-suggestion

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run development server
npm run dev
```

### Environment Variables

```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Admin
ADMIN_PASSWORD=your_admin_password
```

### Database Setup

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Run migrations
\i supabase/migrations/001_create_chunks_table.sql
\i supabase/migrations/002_create_storage_bucket.sql
\i supabase/migrations/003_create_api_keys_table.sql
```

### Project Structure

```
AI-autocomplete/
├── app/
│   ├── api/              # API routes
│   │   ├── chat/
│   │   ├── complete-word/
│   │   ├── suggest-phrase/
│   │   ├── train/
│   │   └── forget/
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/
│   ├── ChatInput.tsx     # Autocomplete input
│   ├── ChatInterface.tsx # Chat interface
│   ├── MainInterface.tsx # Main container
│   ├── TrainingTab.tsx   # Training UI
│   └── ui/               # UI components
├── lib/
│   ├── openai.ts         # OpenAI client
│   ├── supabase.ts       # Supabase client
│   ├── store.ts          # Zustand store
│   └── utils.ts          # Utilities
├── services/
│   ├── autocomplete.service.ts
│   ├── chat.service.ts
│   └── training.service.ts
├── types/
│   └── supabase.ts       # Type definitions
└── supabase/
    ├── migrations/       # SQL migrations
    └── schema.sql        # Database schema
```

---

## Testing & Debugging

### Console Logging Strategy

```typescript
// Autocomplete flow
console.log('[Autocomplete] Fetching suggestions for:', query)
console.log('[Autocomplete] Found matches:', matches.length)
console.log('[Autocomplete] Using AI fallback')

// Chat flow
console.log('[Chat] Processing message:', message)
console.log('[Chat] Found context chunks:', chunks.length)
console.log('[Chat] Using knowledge base:', usedKB)

// Training flow
console.log('[Train] Processing file:', filename)
console.log('[Train] Generated chunks:', chunks.length)
console.log('[Train] Embeddings generated')
```

### Error Handling

```typescript
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  console.error('[Component] Operation failed:', error)
  // Show user-friendly error
  toast.error('Operation failed. Please try again.')
  throw error
}
```

### Network Debugging

Use browser DevTools:
1. **Network Tab**: Monitor API calls
2. **Console**: Check logs
3. **Application**: Inspect localStorage
4. **React DevTools**: Component state

---

## Performance Optimization

### 1. Debouncing

```typescript
const debounceTimerRef = useRef<NodeJS.Timeout>()

const handleInputChange = (value: string) => {
  setInputValue(value)
  
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current)
  }
  
  debounceTimerRef.current = setTimeout(() => {
    fetchSuggestions(value)
  }, 250) // 250ms delay
}
```

### 2. Caching

```typescript
const suggestionCacheRef = useRef<Map<string, Suggestion[]>>(
  new Map()
)

// Check cache first
if (suggestionCacheRef.current.has(query)) {
  return suggestionCacheRef.current.get(query)
}

// Fetch and cache
const suggestions = await fetchSuggestions(query)
suggestionCacheRef.current.set(query, suggestions)
```

### 3. Lazy Loading

```typescript
// Dynamic imports
const Component = dynamic(() => import('./Component'), {
  loading: () => <Spinner />,
  ssr: false
})
```

### 4. Vector Index Optimization

```sql
-- Adjust lists parameter based on data size
CREATE INDEX ON chunks_table 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);  -- Increase for larger datasets
```

### 5. Connection Pooling

Supabase automatically handles connection pooling.

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Environment Variables

Add in Vercel dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `ADMIN_PASSWORD`

### Build Configuration

```json
{
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

### Production Checklist

- [ ] Set strong `ADMIN_PASSWORD`
- [ ] Enable CORS if needed
- [ ] Set up custom domain
- [ ] Monitor API usage
- [ ] Set up error tracking (Sentry)
- [ ] Enable analytics
- [ ] Configure rate limiting
- [ ] Set up backups

---

## Advanced Topics

### Extending the System

#### Adding New Suggestion Types

1. **Create API Route**: `app/api/suggest-custom/route.ts`
2. **Update Service**: Add function in `services/autocomplete.service.ts`
3. **Modify ChatInput**: Add new fetch logic
4. **Update Types**: Define new suggestion type

#### Custom Embeddings

```typescript
// Use different embedding model
const response = await openai.embeddings.create({
  model: 'text-embedding-ada-002', // or other models
  input: text
})
```

#### Multi-Model Support

```typescript
// Switch between GPT models
const models = {
  fast: 'gpt-3.5-turbo',
  powerful: 'gpt-4',
  economical: 'gpt-3.5-turbo-0125'
}

const completion = await openai.chat.completions.create({
  model: models.fast,
  messages: messages
})
```

### Monitoring & Analytics

```typescript
// Track suggestion acceptance rate
const trackSuggestionAccepted = (suggestion: Suggestion) => {
  analytics.track('suggestion_accepted', {
    source: suggestion.source,
    similarity: suggestion.similarity,
    type: suggestion.suggestionType
  })
}

// Track API latency
const startTime = Date.now()
await apiCall()
const latency = Date.now() - startTime
console.log(`[Performance] API latency: ${latency}ms`)
```

---

## Troubleshooting

### Common Issues

#### 1. Embeddings Not Generating

**Symptom**: Training fails with OpenAI error

**Solution**:
- Check `OPENAI_API_KEY` is valid
- Verify API credits available
- Check rate limits

#### 2. Vector Search Returns No Results

**Symptom**: Always falls back to AI

**Solution**:
- Lower similarity threshold (0.6 instead of 0.7)
- Check if embeddings are stored
- Verify index is created

#### 3. Storage Timeout

**Symptom**: `504 Gateway Timeout` on file delete

**Solution**:
- Already handled with timeout protection
- Files will be deleted from DB, storage may remain
- Manually clean up storage periodically

#### 4. CORS Errors

**Symptom**: API calls blocked by CORS

**Solution**:
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,DELETE' }
        ]
      }
    ]
  }
}
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Principles

1. **Type Safety**: Always use TypeScript
2. **Error Handling**: Catch and log all errors
3. **User Feedback**: Show toast notifications
4. **Performance**: Optimize queries and cache results
5. **Documentation**: Comment complex logic
6. **Testing**: Test edge cases

---

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [pgvector Guide](https://github.com/pgvector/pgvector)

### Related Projects
- [LangChain](https://github.com/hwchase17/langchain)
- [ChromaDB](https://github.com/chroma-core/chroma)
- [Pinecone](https://www.pinecone.io)

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Support

- **GitHub Issues**: Report bugs or request features
- **Discussions**: Ask questions and share ideas
- **Buy Me a Coffee**: [Support the project](https://buymeacoffee.com/daraboth)

---

**Built with ❤️ by KOSIGN Global Biz Center**

Last Updated: February 3, 2026
