# ✨ TypeFlow AI - Intelligent Autocomplete with RAG & Magic UI

> **Version 1.0.0** | *Last Updated: February 3, 2026*

A cutting-edge Next.js application featuring AI-powered autocomplete with Retrieval Augmented Generation (RAG), interactive chat interface, real-time training analytics, and stunning Magic UI components. Train your AI with PDF and text files, chat with your trained data, and experience intelligent word completion and phrase suggestions powered by OpenAI embeddings and Supabase vector search.

[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=flat-square&logo=github)](https://github.com/DaraBoth/fine-tune-AI-suggestion)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Support-FFDD00?style=flat-square&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/daraboth)
![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.0.0-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-2.49.2-green?style=flat-square&logo=supabase)
![OpenAI](https://img.shields.io/badge/OpenAI-4.77.0-purple?style=flat-square&logo=openai)
![Magic UI](https://img.shields.io/badge/Magic%20UI-Components-ff69b4?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-success?style=flat-square)

## ✨ Features

### 🤖 AI-Powered Suggestions
- **Dual-Mode Autocomplete**: Smart word completion and intelligent phrase suggestions
- **RAG Architecture**: AI Agent processes vector search results for context-aware suggestions
- **Multi-Language Support**: English, Chinese, and Korean language detection and filtering
- **Real-time Suggestions**: Debounced API calls for smooth, responsive UX

### 💬 Interactive Chat Interface
- **RAG-Powered Chat**: Chat with your trained documents using vector search
- **Context-Aware Responses**: GPT-3.5-turbo processes relevant chunks for accurate answers
- **Knowledge Base Indicators**: Visual badges showing when trained data is used
- **Persistent Chat History**: Chat state saved across tab switches with Zustand
- **Auto-scroll**: Smooth scrolling to latest messages

### 🔐 Public API System
- **Secure API Keys**: SHA-256 hashed keys with Bearer token authentication
- **Rate Limiting**: Configurable request limits per API key (default: 1000/hour)
- **Access Control**: Endpoint-level permissions and optional key expiration
- **Usage Analytics**: Track all API requests with detailed logs
- **Full Documentation**: Complete API docs with code examples in multiple languages

### 🎨 Magic UI Components
- **ShimmerButton**: Animated gradient buttons with shimmer effects
- **NumberTicker**: Smooth counting animations starting from 0 with unique keys for re-animation
- **BorderBeam**: Animated border effects on cards with staggered delays
- **Sparkles**: Dynamic sparkle animations for headings
- **Toast Notifications**: Beautiful stacking toasts with loading states for file operations

### 📊 Training & Analytics
- **PDF & Text Training**: Upload PDF files (up to 50MB each) or train directly from input text
- **OCR Support**: Automatic text extraction from images in PDFs (scanned documents, screenshots, diagrams)
- **Consolidated Manual Training**: All text-based training saved to single file
- **File Management**: Multi-select delete with confirmation and toast notifications
- **Real-time Statistics**: Live updates with animated number counters
- **Training Dashboard**: Track total chunks, files trained, characters processed, and last training date
- **Persistent State**: Training status preserved across tab switches with Zustand
- **Auto-refresh**: Statistics update automatically after successful uploads

### ⌨️ Advanced UX
- **Dropdown Suggestions**: Google-style suggestion list with similarity scores
- **Keyboard Navigation**: Arrow keys, Tab/Enter, number keys (1-5), and Escape
- **Source Badges**: Visual indicators for trained data vs AI-generated suggestions
- **Language Detection**: Automatic language detection with mismatch warnings
- **Copy to Clipboard**: One-click text copying with visual feedback

## 🏗️ Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript 5.7.2
- **Styling**: Tailwind CSS 3.4.17 + shadcn/ui + Magic UI
- **State Management**: Zustand 5.0.2 with localStorage persistence
- **Database**: Supabase 2.49.2 (PostgreSQL with pgvector)
- **AI Providers**: 
  - **OpenAI API 4.77.0** (text-embedding-3-small + GPT-3.5-turbo)
  - **Google Gemini** (text-embedding-004 + gemini-1.5-flash) - FREE tier available!
- **PDF Processing**: pdf-parse 1.1.1 + pdfjs-dist (image extraction)
- **OCR**: Tesseract.js 7.0.0 (optical character recognition)
- **Animations**: Framer Motion 11.15.0
- **File Upload**: react-dropzone 14.3.5
- **UI Components**: Radix UI (Tabs, Slot) + Lucide React 0.468.0

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18 or higher)
2. **Supabase Account** (free tier works)
3. **AI Provider API Key** (choose one or both):
   - **OpenAI API Key** (paid, high quality) - Get from [platform.openai.com](https://platform.openai.com/api-keys)
   - **Google Gemini API Key** (FREE tier available!) - Get from [makersuite.google.com](https://makersuite.google.com/app/apikey)
4. **(Optional)** For Public API: Run API tables migration for third-party access

> 💡 **New!** Gemini offers a generous free tier with 15 requests/minute and 1M tokens/day - perfect for getting started without any costs!

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
# Clone from GitHub
git clone https://github.com/DaraBoth/fine-tune-AI-suggestion.git
cd fine-tune-AI-suggestion

# Install dependencies
npm install
```

### 2. Set Up Supabase Database

#### Create the chunks_table (Required)

Run the following SQL in your Supabase SQL Editor:

> **Note:** The embedding dimension should match your AI provider:
> - OpenAI (text-embedding-3-small): 1536 dimensions
> - Google Gemini (text-embedding-004): 768 dimensions
> 
> The system automatically handles dimension matching. Use 1536 for maximum compatibility (both providers supported).

```sql
-- Enable the pgvector extension
create extension if not exists vector;

-- Create the chunks_table (1536 dimensions supports both OpenAI and Gemini)
create table chunks_table (
  id bigserial primary key,
  content text not null,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create an index on the embedding column for faster similarity search
create index on chunks_table using ivfflat (embedding vector_cosine_ops)
with (lists = 100);
```

#### Create the match_chunks Function

This function performs similarity search using cosine distance:

```sql
create or replace function match_chunks (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    chunks_table.id,
    chunks_table.content,
    chunks_table.metadata,
    1 - (chunks_table.embedding <=> query_embedding) as similarity
  from chunks_table
  where 1 - (chunks_table.embedding <=> query_embedding) > match_threshold
  order by chunks_table.embedding <=> query_embedding
  limit match_count;
$$;
```

#### Enable Supabase Realtime

Enable realtime updates for the chunks_table:

1. Go to **Database → Replication** in Supabase Dashboard
2. Enable replication for `chunks_table`

#### (Optional) Set Up Public API Tables

If you want to enable the public API for third-party developers:

```bash
# Run the API migration in Supabase SQL Editor
# File: supabase/migrations/003_create_api_keys_table.sql
```

This creates `public_api_keys` and `public_api_usage_logs` tables for secure API access.

See [API_SETUP.md](API_SETUP.md) for complete API setup instructions.

Enable realtime for the chunks_table:

```sql
-- Enable realtime for training statistics
alter publication supabase_realtime add table chunks_table;
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# AI Provider Selection (choose 'openai' or 'gemini')
AI_PROVIDER=gemini

# OpenAI Configuration (optional if using Gemini)
OPENAI_API_KEY=your-openai-api-key

# Google Gemini Configuration (FREE tier available!)
GEMINI_API_KEY=your-gemini-api-key

# OCR Provider Configuration
# Choose: 'tesseract' (default, free, local), 'gemini' (free, cloud), or 'openai' (paid, highest quality)
# Gemini Vision: FREE with 15 RPM, great accuracy
# OpenAI Vision: Paid but highest accuracy
# Tesseract: FREE, local processing, good for simple text
OCR_PROVIDER=gemini

# Admin Security
ADMIN_PASSWORD=your-secure-admin-password-here
```

**AI Provider Setup:**

The system supports two AI providers - you can choose either one or configure both for automatic fallback:

**Option 1: Google Gemini (Recommended for Free Tier)**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Set `AI_PROVIDER=gemini` in your `.env.local`
4. Add your `GEMINI_API_KEY`
5. Free tier includes:
   - 15 requests per minute
   - 1 million tokens per day
   - Models: text-embedding-004 (768d), gemini-1.5-flash

**Option 2: OpenAI (Higher Quality, Paid)**
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Navigate to API Keys
3. Create a new secret key
4. Set `AI_PROVIDER=openai` in your `.env.local`
5. Add your `OPENAI_API_KEY`
6. Models: text-embedding-3-small (1536d), gpt-3.5-turbo

**Supabase Credentials:**
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy the Project URL and anon/public key

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage Guide

### Training the AI

#### Method 1: Upload PDF Files
1. Click on the **Train Your AI** tab
2. Drag and drop PDF files or click to browse (up to 50MB each)
3. The system will:
   - Extract text from the PDF using pdf-parse
   - Split into manageable chunks (1000 chars with 200 char overlap)
   - Generate embeddings for each chunk using OpenAI (text-embedding-3-small)
   - Store chunks with metadata in Supabase
4. Watch the statistics update with animated number counters

#### Method 2: Train from Input Text (Consolidated)
1. Type or paste text in the **Smart Suggestion** input area
2. Click the **Teach AI** button (purple gradient)
3. The text will be:
   - Added to a single `manual-training.txt` file
   - Appended to any existing manual training content
   - Re-chunked and re-embedded automatically
4. Perfect for quick training with specific phrases
5. All manual training appears as one file in your training list

### Managing Trained Files

1. View all trained files in the **Training** tab
2. Each file shows:
   - File name, chunk count, and last updated date
   - View, Download, and Delete buttons
3. **Multi-Select Delete**:
   - Check boxes to select multiple files
   - Click "Delete (N)" button to remove selected files
   - Each deletion shows a toast notification with progress
   - Toasts stack when deleting multiple files
4. **View File**: Click eye icon to preview file content
5. **Download File**: Click download icon to save original file

### Using Smart Suggestions

1. Navigate to the **Smart Suggestion** tab
2. Start typing in the input field
3. The system will:
   - **Word Completion**: If typing mid-word, suggests completions
   - **Phrase Suggestion**: If after a space, suggests next phrases
4. View multiple suggestions in the dropdown:
   - **Similarity %**: See how relevant each suggestion is
   - **Source Badge**: Green (Trained Data) or Purple (AI Generated)
5. Accept suggestions:
   - **Arrow Keys**: Navigate through suggestions
   - **Tab/Enter**: Accept selected suggestion
   - **1-5 Keys**: Quick select by number
   - **Escape**: Close suggestions
6. Click **Copy** (teal gradient) to copy text to clipboard

### Chat with Your Data

1. Navigate to the **Chat with AI** tab
2. Type questions or messages related to your trained content
3. The AI will:
   - Search your trained documents using vector similarity
   - Use top relevant chunks as context
   - Generate responses using GPT-3.5-turbo
4. Look for the knowledge base indicator (green badge) on AI responses
5. Chat history is automatically saved and persists across sessions
6. Click **Clear Chat** to start a fresh conversation

### Real-time Training Analytics

The dashboard shows live statistics with animated counters:
- **Total Chunks**: Number of text chunks stored (animated from 0)
- **Files Trained**: Count of trained PDF files
- **Total Characters**: Total characters processed with decimal animation (K format)
- **Last Training**: Date and time of most recent training

Statistics automatically refresh after successful uploads with smooth number animations!

## 🎨 Magic UI Components

### Shimmer Buttons
Animated gradient buttons with shimmer effects:
- **Teach AI**: Purple to blue gradient
- **Copy**: Emerald to teal gradient
- **Upload PDF**: Blue to indigo gradient

### Number Tickers
Smooth counting animations that:
- Start from 0 on every update (using unique keys)
- Animate to actual values when data loads
- Support decimal places for characters count (K format)
- Re-animate when values change using key-based remounting

### Border Beam
Animated colored beams that travel around card borders with staggered delays

### Sparkles
Dynamic sparkle effects on:
- "Smart Suggestion" heading
- "Train Your AI" heading

## 📁 Project Structure

```
typeflow-ai/
├── app/
│   ├── api/
│   │   ├── complete-word/
│   │   │   └── route.ts          # Word completion with RAG
│   │   ├── suggest-phrase/
│   │   │   └── route.ts          # Phrase suggestion with RAG
│   │   ├── train/
│   │   │   └── route.ts          # PDF/text upload & training (fixed TypeScript errors)
│   │   ├── training-stats/
│   │   │   └── route.ts          # Training statistics (fixed TypeScript errors)
│   │   ├── chat/
│   │   │   └── route.ts          # RAG-powered chat with trained data
│   │   └── suggest/
│   │       └── route.ts          # Legacy suggestion endpoint
│   ├── layout.tsx                # Root layout with dark theme
│   ├── page.tsx                  # Home page with 3-tab interface
│   └── globals.css               # Global styles + Magic UI animations
├── components/
│   ├── ui/                       # shadcn/ui + Magic UI components
│   │   ├── shimmer-button.tsx    # Animated gradient buttons
│   │   ├── number-ticker.tsx     # Counting animations with framer-motion
│   │   ├── border-beam.tsx       # Animated card borders
│   │   ├── sparkles.tsx          # Dynamic sparkle effects
│   │   ├── tabs.tsx              # Radix UI tabs component
│   │   ├── button.tsx            # Base button component
│   │   ├── card.tsx              # Card components
│   │   └── textarea.tsx          # Textarea component
│   ├── ChatInput.tsx             # Smart suggestion input with dropdown
│   ├── TrainingTab.tsx           # Training interface with animated analytics
│   ├── ChatInterface.tsx         # RAG-powered chat interface
│   └── MainInterface.tsx         # Tab container (Smart Suggestion, Chat, Train)
├── lib/
│   ├── openai.ts                 # OpenAI utilities (embeddings + chat)
│   ├── supabase.ts               # Supabase client configuration
│   ├── store.ts                  # Zustand state management with persistence
│   ├── language-detector.ts      # Multi-language detection (EN, ZH, KO)
│   └── utils.ts                  # Utility functions (cn helper)
├── types/
│   └── supabase.ts               # Database type definitions
├── supabase/
│   ├── schema.sql                # Complete database schema
│   ├── fix-dimensions.sql        # Vector dimension fixes
│   └── migrations/
│       └── 001_create_chunks_table.sql
├── .env.local                    # Environment variables (not in git)
├── .env.example                  # Environment variables template
├── tailwind.config.ts            # Tailwind + Magic UI animations config
├── next.config.js                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies (v1.0.0)
└── README.md                     # This file
```

## 🔧 API Routes

### POST /api/complete-word

Generates word completions using RAG pattern.

**Request:**
```json
{
  "text": "What do you mea",
  "incompleteWord": "mea"
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "text": "mean",
      "source": "trained-data",
      "similarity": 0.89
    },
    {
      "text": "measure",
      "source": "ai-generated",
      "similarity": 0.76
    }
  ],
  "type": "word"
}
```

### POST /api/suggest-phrase

Generates phrase suggestions using RAG pattern.

**Request:**
```json
{
  "text": "The quick brown "
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "text": "fox jumps over the lazy dog",
      "source": "trained-data",
      "similarity": 0.91
    },
    {
      "text": "cat sleeps on the mat",
      "source": "ai-generated"
    }
  ],
  "type": "phrase"
}
```

### POST /api/chat

RAG-powered chat with trained documents.

**Request:**
```json
{
  "message": "What is machine learning?",
  "history": [
    {
      "role": "user",
      "content": "Previous question"
    },
    {
      "role": "assistant",
      "content": "Previous answer"
    }
  ]
}
```

**Response:**
```json
{
  "response": "Machine learning is...",
  "usedKnowledgeBase": true,
  "contextChunks": 5
}
```

### POST /api/train

Processes and stores PDF/text content.

**Request:**
```
Content-Type: multipart/form-data
file: [PDF or text file]
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully processed 50 out of 50 chunks",
  "chunks": 50,
  "filename": "document.pdf"
}
```

### GET /api/training-stats

Retrieves training statistics.

**Response:**
```json
{
  "totalChunks": 209,
  "totalFiles": 3,
  "totalCharacters": 734700,
  "files": ["document1.pdf", "document2.pdf", "notes.txt"],
  "lastTrainingDate": "2026-01-29T11:53:00.000Z",
  "lastTrainingFile": "notes.txt"
}
```

## 🚨 Troubleshooting

### "Missing Supabase environment variables"
- Ensure `.env.local` exists and contains valid Supabase credentials
- Restart the development server after adding variables

### "Failed to query database" or Table Errors
- The table is named `chunks_table`, not `chunks`
- Verify the `match_chunks` function exists in Supabase SQL Editor
- Check that the pgvector extension is enabled
- Ensure the chunks_table has the correct schema with vector(1536)
- Run the schema.sql file in your Supabase project

### TypeScript Build Errors
- **Fixed**: Removed syntax errors in training-stats/route.ts (`chunk:any` → `(chunk: any)`)
- **Fixed**: Added type assertions to prevent Supabase `never` type issues
- Run `npm run build` to verify all TypeScript errors are resolved

### NumberTicker Animation Not Working
- **Fixed**: Added unique `key` props based on stat values to force component remount
- **Fixed**: Set `loadingStats = true` at start of fetch to show 0 before animation
- Ensure framer-motion@11.15.0 is installed
- Verify Tailwind config includes Magic UI animations

### "No text content found in PDF"
- The PDF might be scanned images without OCR
- Try a text-based PDF instead
- Check the pdf-parse@1.1.1 library compatibility

### Suggestions not appearing
- Make sure you've uploaded at least one PDF or trained text
- Check that OpenAI API key is valid and has credits
- Verify the similarity threshold (0.3) isn't too high
- Check browser console for API errors
- Ensure OPENAI_API_KEY is set in .env.local

### Chat responses not using trained data
- Upload training data in the "Train Your AI" tab first
- Check that chunks are being stored (view training statistics)
- Look for the green "Knowledge Base" badge on responses
- Lower the similarity threshold if needed (default: 0.3)

### Statistics showing 0 or not updating
- Check that Supabase credentials are correct
- Verify chunks_table exists and has data
- Statistics auto-refresh after uploads with animated counters
- Check browser console for fetch errors

## 🎯 Customization

### Adjust Chunk Size

Edit [app/api/train/route.ts](app/api/train/route.ts):

```typescript
const chunks = chunkText(text, 1000, 200) // size: 1000, overlap: 200
```

### Change Similarity Threshold

Edit [app/api/complete-word/route.ts](app/api/complete-word/route.ts) or [app/api/suggest-phrase/route.ts](app/api/suggest-phrase/route.ts):

```typescript
match_threshold: 0.3,  // Lower = more matches (0.0 - 1.0)
match_count: 10,       // Number of results to fetch
```

### Modify Debounce Time

Edit [components/ChatInput.tsx](components/ChatInput.tsx):

```typescript
debounceTimerRef.current = setTimeout(() => {
  fetchSuggestion(value)
}, 1000) // milliseconds - reduce for faster suggestions
```

### Customize Magic UI Animations

Edit [tailwind.config.ts](tailwind.config.ts) to adjust:
- Border beam speed: `duration` in keyframes
- Shimmer animation: `--speed` variable
- Sparkle density: `density` prop in component

### Add More Languages

Edit [lib/language-detector.ts](lib/language-detector.ts):

```typescript
export function detectLanguage(text: string): Language {
  // Add new language detection patterns
  if (/[your-pattern]/.test(text)) return 'your-lang'
  // ...
}
```

## 📊 Database Schema

### chunks_table

| Column     | Type                | Description                           |
|------------|---------------------|---------------------------------------|
| id         | bigserial (PK)      | Auto-incrementing primary key         |
| content    | text                | The actual text chunk                 |
| embedding  | vector(1536)        | OpenAI embedding (text-embedding-3-small) |
| metadata   | jsonb               | Contains: filename, chunk_index, total_chunks, characters, uploaded_at |
| created_at | timestamp           | Creation timestamp with timezone      |

### metadata Structure

```json
{
  "filename": "document.pdf",
  "chunk_index": 5,
  "total_chunks": 50,
  "characters": 1000,
  "uploaded_at": "2026-01-29T11:08:00.000Z"
}
```

## 🧠 RAG Architecture

TypeFlow AI uses a sophisticated Retrieval Augmented Generation pattern:

1. **Vector Search**: User input is embedded and searched against training data
2. **Context Retrieval**: Top 10 similar chunks are retrieved (threshold: 0.3)
3. **AI Agent Processing**: GPT-3.5-turbo processes chunks to generate intelligent suggestions
4. **Fallback Strategy**: Direct chunk extraction provides backup suggestions
5. **Deduplication**: Ensures unique suggestions with similarity scoring

This approach prevents raw chunk display (common in basic vector search) and provides contextually relevant, natural-sounding suggestions.

## 🔒 Security Notes

- API keys are stored in environment variables (never commit `.env.local`)
- Supabase Row Level Security (RLS) is enabled for API key tables
- File upload size is limited by Next.js (adjust in `next.config.js` if needed)
- No user authentication required for basic features - **add auth for production**
- OpenAI API calls are made server-side to protect API keys
- Public API endpoints use Bearer token authentication
- API keys are hashed with SHA-256 before storage
- Rate limiting enabled for API endpoints (configurable per key)
- Consider implementing user authentication for production use

## 🌐 Public API

TypeFlow AI includes a complete public API system for third-party integration:

- **Secure Authentication**: Bearer token with SHA-256 hashed API keys
- **Rate Limiting**: Configurable per-key limits (default: 1000 requests/hour)
- **Access Control**: Endpoint-level permissions and key expiration
- **Usage Analytics**: Comprehensive logging and monitoring
- **Full Documentation**: See [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

### Quick API Setup

1. Run the API migration: `supabase/migrations/003_create_api_keys_table.sql`
2. Generate an API key: `POST /api/keys/generate`
3. Use the key: `Authorization: Bearer YOUR_API_KEY`
4. See [API_SETUP.md](API_SETUP.md) for complete instructions

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

```env
SUPABASE_URL=your-production-supabase-url
SUPABASE_ANON_KEY=your-production-anon-key
OPENAI_API_KEY=your-openai-api-key
ADMIN_PASSWORD=your-secure-production-password
```

## ☕ Support the Project

If you find this project helpful, consider supporting its development:

<a href="https://buymeacoffee.com/daraboth" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50" />
</a>

Your support helps maintain and improve this open-source project! ❤️

## 🤝 Contributing

Contributions are welcome! This is an **open-source project** available on GitHub.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

**Repository**: [https://github.com/DaraBoth/fine-tune-AI-suggestion](https://github.com/DaraBoth/fine-tune-AI-suggestion)

## 📧 Support

If you encounter any issues or have questions:
- 📖 Check [QUICKSTART.md](QUICKSTART.md) for setup help
- 🔌 Review [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for API usage
- 🐛 Open an issue on [GitHub](https://github.com/DaraBoth/fine-tune-AI-suggestion/issues)
- 💬 Start a discussion for general questions

## ⭐ Show Your Support

If you like this project, please give it a ⭐ on [GitHub](https://github.com/DaraBoth/fine-tune-AI-suggestion)!

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Built with ❤️ by [DaraBoth](https://github.com/DaraBoth)**

**TypeFlow AI v1.0.0** - Where Intelligence Meets Beautiful Design

🔗 **Links:**
- 🌟 [GitHub Repository](https://github.com/DaraBoth/fine-tune-AI-suggestion)
- ☕ [Buy Me a Coffee](https://buymeacoffee.com/daraboth)
- 📚 [Quick Start Guide](QUICKSTART.md)
- 🔌 [API Documentation](API_DOCUMENTATION.md)

*Last Updated: January 30, 2026*
- Dark/light theme toggle

## 📧 Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review the API documentation
- Verify all TypeScript errors are fixed (build should succeed)

---

**Built with ❤️ using Next.js 15, Supabase, OpenAI, and Magic UI**

**TypeFlow AI v1.0.0** - Where Intelligence Meets Beautiful Design

*Last Updated: January 29, 2026*
