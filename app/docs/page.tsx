import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Code, BookOpen, Zap, Database, MessageSquare, Key, Sparkles, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { BorderBeam } from '@/components/ui/border-beam'
import { DotPattern } from '@/components/ui/dot-pattern'
import { CodeBlock } from '@/components/docs/CodeBlock'

export default function DocsPage() {

  return (
    <div className="min-h-screen bg-[#030303]">
      <DotPattern
        width={20}
        height={20}
        cx={1}
        cy={1}
        cr={1}
        className="fixed inset-0 opacity-10 [mask-image:radial-gradient(white,transparent_70%)]"
      />
      
      <div className="container mx-auto max-w-6xl px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4 text-white/60 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to App
            </Button>
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">TypeFlow AI Documentation</h1>
              <p className="text-white/60 mt-2">Complete guide to integrate and use TypeFlow AI</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="getting-started" className="w-full">
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 gap-2 p-2 bg-white/5 backdrop-blur-xl border border-white/10 mb-8 h-auto">
            <TabsTrigger 
              value="getting-started" 
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 hover:text-white/80 transition-colors flex items-center justify-center gap-2 py-3 px-4"
            >
              <Zap className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Quick Start</span>
            </TabsTrigger>
            <TabsTrigger 
              value="autocomplete" 
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 hover:text-white/80 transition-colors flex items-center justify-center gap-2 py-3 px-4"
            >
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Autocomplete</span>
            </TabsTrigger>
            <TabsTrigger 
              value="chat" 
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 hover:text-white/80 transition-colors flex items-center justify-center gap-2 py-3 px-4"
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Chat API</span>
            </TabsTrigger>
            <TabsTrigger 
              value="training" 
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 hover:text-white/80 transition-colors flex items-center justify-center gap-2 py-3 px-4"
            >
              <Database className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Training</span>
            </TabsTrigger>
            <TabsTrigger 
              value="api-keys" 
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 hover:text-white/80 transition-colors flex items-center justify-center gap-2 py-3 px-4"
            >
              <Key className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">API Keys</span>
            </TabsTrigger>
            <TabsTrigger 
              value="examples" 
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 hover:text-white/80 transition-colors flex items-center justify-center gap-2 py-3 px-4"
            >
              <Code className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Examples</span>
            </TabsTrigger>
          </TabsList>

          {/* Getting Started */}
          <TabsContent value="getting-started" className="space-y-6">
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden">
              <BorderBeam size={250} duration={12} delay={0} />
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  Getting Started
                </CardTitle>
                <CardDescription>Quick start guide to integrate TypeFlow AI into your application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Installation</h3>
                  <p className="text-white/70 mb-4">
                    TypeFlow AI is a REST API service. No SDK installation required. Simply make HTTP requests to our endpoints.
                  </p>
                  <CodeBlock
                    id="base-url"
                    code={`// Base URL
const BASE_URL = 'https://your-domain.com';

// Example: Fetch suggestions
fetch(\`\${BASE_URL}/api/complete-word\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: "Hello world",
    incompleteWord: "wor"
  })
});`}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Authentication</h3>
                  <p className="text-white/70 mb-4">
                    For public endpoints, no authentication is required. For admin operations, use the admin password.
                  </p>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-sm text-blue-300">
                      💡 <strong>Tip:</strong> Generate API keys for production use to track usage and enforce rate limits.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Core Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <Sparkles className="h-8 w-8 text-blue-400 mb-3" />
                      <h4 className="text-white font-semibold mb-2">Smart Autocomplete</h4>
                      <p className="text-sm text-white/60">AI-powered word completion and phrase suggestions with RAG</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <MessageSquare className="h-8 w-8 text-purple-400 mb-3" />
                      <h4 className="text-white font-semibold mb-2">RAG Chat</h4>
                      <p className="text-sm text-white/60">Chat with your trained documents using vector search</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <Database className="h-8 w-8 text-green-400 mb-3" />
                      <h4 className="text-white font-semibold mb-2">Training System</h4>
                      <p className="text-sm text-white/60">Upload PDFs or text to train the AI on your data</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <Key className="h-8 w-8 text-yellow-400 mb-3" />
                      <h4 className="text-white font-semibold mb-2">API Keys</h4>
                      <p className="text-sm text-white/60">Secure access with rate limiting and usage tracking</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Autocomplete API */}
          <TabsContent value="autocomplete" className="space-y-6">
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden">
              <BorderBeam size={250} duration={12} delay={2} />
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-400" />
                  Autocomplete API
                </CardTitle>
                <CardDescription>Real-time word completion and phrase suggestions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Word Completion */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Word Completion</h3>
                  <p className="text-white/70 mb-4">
                    Complete incomplete words based on trained data and AI suggestions.
                  </p>
                  
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-semibold">
                      POST /api/complete-word
                    </span>
                  </div>

                  <h4 className="text-white font-semibold mb-2">Request</h4>
                  <CodeBlock
                    id="complete-word-request"
                    language="json"
                    code={`{
  "query": "The quick brown fox jumps over the la",
  "incompleteWord": "la"
}`}
                  />

                  <h4 className="text-white font-semibold mb-2 mt-4">Response</h4>
                  <CodeBlock
                    id="complete-word-response"
                    language="json"
                    code={`{
  "suggestions": [
    {
      "text": "zy dog",
      "similarity": 0.92,
      "source": "trained-data",
      "suggestionType": "word"
    },
    {
      "text": "st night",
      "similarity": 0.88,
      "source": "ai-with-context",
      "suggestionType": "word"
    }
  ]
}`}
                  />

                  <h4 className="text-white font-semibold mb-2 mt-4">JavaScript Example</h4>
                  <CodeBlock
                    id="complete-word-js"
                    language="javascript"
                    code={`async function completeWord(query, incompleteWord) {
  const response = await fetch('/api/complete-word', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, incompleteWord })
  });
  
  const data = await response.json();
  return data.suggestions;
}

// Usage
const suggestions = await completeWord(
  "Hello wor",
  "wor"
);
console.log(suggestions);`}
                  />
                </div>

                {/* Phrase Suggestion */}
                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Phrase Suggestion</h3>
                  <p className="text-white/70 mb-4">
                    Get intelligent next phrase suggestions based on context.
                  </p>
                  
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-semibold">
                      POST /api/suggest-phrase
                    </span>
                  </div>

                  <h4 className="text-white font-semibold mb-2">Request</h4>
                  <CodeBlock
                    id="suggest-phrase-request"
                    language="json"
                    code={`{
  "query": "TypeFlow AI is an intelligent autocomplete system."
}`}
                  />

                  <h4 className="text-white font-semibold mb-2 mt-4">Response</h4>
                  <CodeBlock
                    id="suggest-phrase-response"
                    language="json"
                    code={`{
  "suggestions": [
    {
      "text": "It uses RAG architecture for better accuracy.",
      "similarity": 0.89,
      "source": "trained-data",
      "suggestionType": "phrase"
    },
    {
      "text": "The system learns from your documents.",
      "similarity": 0.85,
      "source": "ai-with-context",
      "suggestionType": "phrase"
    }
  ]
}`}
                  />

                  <h4 className="text-white font-semibold mb-2 mt-4">Python Example</h4>
                  <CodeBlock
                    id="suggest-phrase-python"
                    language="python"
                    code={`import requests

def suggest_phrase(query):
    response = requests.post(
        'https://your-domain.com/api/suggest-phrase',
        json={'query': query},
        headers={'Content-Type': 'application/json'}
    )
    return response.json()['suggestions']

# Usage
suggestions = suggest_phrase("Hello world.")
for suggestion in suggestions:
    print(f"{suggestion['text']} ({suggestion['source']})")`}
                  />
                </div>

                {/* Parameters */}
                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Response Fields</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-white/10">
                        <tr className="text-left">
                          <th className="pb-3 text-white font-semibold">Field</th>
                          <th className="pb-3 text-white font-semibold">Type</th>
                          <th className="pb-3 text-white font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody className="text-white/70">
                        <tr className="border-b border-white/5">
                          <td className="py-3 font-mono text-blue-300">text</td>
                          <td className="py-3">string</td>
                          <td className="py-3">The suggested text completion</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-3 font-mono text-blue-300">similarity</td>
                          <td className="py-3">number</td>
                          <td className="py-3">Similarity score (0-1)</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-3 font-mono text-blue-300">source</td>
                          <td className="py-3">string</td>
                          <td className="py-3">trained-data | ai-with-context | openai-fallback</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-3 font-mono text-blue-300">suggestionType</td>
                          <td className="py-3">string</td>
                          <td className="py-3">word | phrase</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat API */}
          <TabsContent value="chat" className="space-y-6">
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden">
              <BorderBeam size={250} duration={12} delay={4} />
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-400" />
                  Chat API
                </CardTitle>
                <CardDescription>RAG-powered conversational AI with your trained documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-white/70 mb-4">
                    Chat with your trained documents using Retrieval Augmented Generation (RAG). The system retrieves relevant chunks from your training data and generates contextual responses.
                  </p>
                  
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-semibold">
                      POST /api/chat
                    </span>
                  </div>

                  <h4 className="text-white font-semibold mb-2">Request</h4>
                  <CodeBlock
                    id="chat-request"
                    language="json"
                    code={`{
  "message": "What is TypeFlow AI?",
  "history": [
    {
      "role": "user",
      "content": "Hello"
    },
    {
      "role": "assistant",
      "content": "Hi! How can I help you today?"
    }
  ]
}`}
                  />

                  <h4 className="text-white font-semibold mb-2 mt-4">Response</h4>
                  <CodeBlock
                    id="chat-response"
                    language="json"
                    code={`{
  "response": "TypeFlow AI is an intelligent autocomplete system that uses RAG architecture...",
  "usedKnowledgeBase": true,
  "contextChunks": 3
}`}
                  />

                  <h4 className="text-white font-semibold mb-2 mt-4">TypeScript Example</h4>
                  <CodeBlock
                    id="chat-ts"
                    language="typescript"
                    code={`interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  response: string;
  usedKnowledgeBase: boolean;
  contextChunks: number;
}

async function sendMessage(
  message: string,
  history: ChatMessage[] = []
): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message, history })
  });
  
  return response.json();
}

// Usage
const history: ChatMessage[] = [];

const response1 = await sendMessage("What is RAG?");
history.push(
  { role: 'user', content: "What is RAG?" },
  { role: 'assistant', content: response1.response }
);

const response2 = await sendMessage("How does it work?", history);
console.log(response2.response);
console.log('Used KB:', response2.usedKnowledgeBase);`}
                  />
                </div>

                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Response Fields</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-white/10">
                        <tr className="text-left">
                          <th className="pb-3 text-white font-semibold">Field</th>
                          <th className="pb-3 text-white font-semibold">Type</th>
                          <th className="pb-3 text-white font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody className="text-white/70">
                        <tr className="border-b border-white/5">
                          <td className="py-3 font-mono text-purple-300">response</td>
                          <td className="py-3">string</td>
                          <td className="py-3">The AI-generated response</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-3 font-mono text-purple-300">usedKnowledgeBase</td>
                          <td className="py-3">boolean</td>
                          <td className="py-3">Whether trained data was used</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-3 font-mono text-purple-300">contextChunks</td>
                          <td className="py-3">number</td>
                          <td className="py-3">Number of chunks retrieved</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-sm text-yellow-300">
                    ⚠️ <strong>Note:</strong> Include conversation history for context-aware responses. The API maintains no server-side session.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training API */}
          <TabsContent value="training" className="space-y-6">
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden">
              <BorderBeam size={250} duration={12} delay={6} />
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-green-400" />
                  Training API
                </CardTitle>
                <CardDescription>Upload documents to train the AI on your custom data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Upload Training File</h3>
                  <p className="text-white/70 mb-4">
                    Upload PDF or text files to train the AI. Files are processed, chunked, and embedded for vector search.
                  </p>
                  
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-semibold">
                      POST /api/train
                    </span>
                    <span className="ml-2 text-xs text-white/60">Requires Admin Password</span>
                  </div>

                  <h4 className="text-white font-semibold mb-2">Request (multipart/form-data)</h4>
                  <CodeBlock
                    id="train-request"
                    language="javascript"
                    code={`const formData = new FormData();
formData.append('file', pdfFile);  // File object
formData.append('password', 'admin_password');

const response = await fetch('/api/train', {
  method: 'POST',
  body: formData
});

const data = await response.json();`}
                  />

                  <h4 className="text-white font-semibold mb-2 mt-4">Response</h4>
                  <CodeBlock
                    id="train-response"
                    language="json"
                    code={`{
  "success": true,
  "message": "Successfully trained with 45 chunks",
  "chunks": 45,
  "filename": "document.pdf"
}`}
                  />

                  <h4 className="text-white font-semibold mb-2 mt-4">Complete Example</h4>
                  <CodeBlock
                    id="train-example"
                    language="javascript"
                    code={`async function trainWithFile(file, password) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('password', password);
  
  const response = await fetch('/api/train', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Training failed');
  }
  
  return response.json();
}

// Usage with file input
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  
  try {
    const result = await trainWithFile(file, 'your_admin_password');
    console.log(\`Trained with \${result.chunks} chunks\`);
  } catch (error) {
    console.error('Training failed:', error);
  }
});`}
                  />
                </div>

                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Delete Training File</h3>
                  <p className="text-white/70 mb-4">
                    Remove a trained file and all its associated chunks from the system.
                  </p>
                  
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm font-semibold">
                      DELETE /api/forget
                    </span>
                  </div>

                  <h4 className="text-white font-semibold mb-2">Request</h4>
                  <CodeBlock
                    id="forget-request"
                    language="json"
                    code={`{
  "filename": "document.pdf"
}`}
                  />

                  <h4 className="text-white font-semibold mb-2 mt-4">Response</h4>
                  <CodeBlock
                    id="forget-response"
                    language="json"
                    code={`{
  "success": true,
  "message": "Successfully deleted 45 chunks from 'document.pdf'",
  "deletedCount": 45,
  "filename": "document.pdf",
  "storageDeleted": true
}`}
                  />

                  <h4 className="text-white font-semibold mb-2 mt-4">JavaScript Example</h4>
                  <CodeBlock
                    id="forget-example"
                    language="javascript"
                    code={`async function deleteTrainingFile(filename) {
  const response = await fetch('/api/forget', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ filename })
  });
  
  return response.json();
}

// Usage
const result = await deleteTrainingFile('document.pdf');
console.log(\`Deleted \${result.deletedCount} chunks\`);`}
                  />
                </div>

                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">List Trained Files</h3>
                  
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-semibold">
                      GET /api/trained-files
                    </span>
                  </div>

                  <h4 className="text-white font-semibold mb-2">Response</h4>
                  <CodeBlock
                    id="list-files-response"
                    language="json"
                    code={`{
  "files": [
    {
      "filename": "document.pdf",
      "chunkCount": 45,
      "lastUpdated": "2026-02-03T10:30:00Z"
    },
    {
      "filename": "guide.txt",
      "chunkCount": 23,
      "lastUpdated": "2026-02-02T15:20:00Z"
    }
  ]
}`}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys */}
          <TabsContent value="api-keys" className="space-y-6">
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden">
              <BorderBeam size={250} duration={12} delay={8} />
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Key className="h-5 w-5 text-yellow-400" />
                  API Keys
                </CardTitle>
                <CardDescription>Secure access with rate limiting and usage tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Generate API Key</h3>
                  <p className="text-white/70 mb-4">
                    Create API keys to secure your endpoints and track usage. Each key can have custom rate limits and endpoint permissions.
                  </p>
                  
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm font-semibold">
                      POST /api/keys/generate
                    </span>
                    <span className="ml-2 text-xs text-white/60">Requires Admin Password</span>
                  </div>

                  <h4 className="text-white font-semibold mb-2">Request</h4>
                  <CodeBlock
                    id="generate-key-request"
                    language="json"
                    code={`{
  "name": "Production API Key",
  "allowedEndpoints": [
    "/api/complete-word",
    "/api/suggest-phrase",
    "/api/chat"
  ],
  "rateLimit": 10000,
  "expiresInDays": 365,
  "password": "admin_password"
}`}
                  />

                  <h4 className="text-white font-semibold mb-2 mt-4">Response</h4>
                  <CodeBlock
                    id="generate-key-response"
                    language="json"
                    code={`{
  "success": true,
  "apiKey": "tfai_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
  "message": "API key generated successfully"
}`}
                  />

                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-4">
                    <p className="text-sm text-red-300">
                      🔒 <strong>Important:</strong> Save the API key immediately. It won't be shown again!
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Using API Keys</h3>
                  <p className="text-white/70 mb-4">
                    Include your API key in the Authorization header using Bearer authentication.
                  </p>

                  <CodeBlock
                    id="use-api-key"
                    language="javascript"
                    code={`const API_KEY = 'tfai_your_api_key_here';

async function callAPI(endpoint, data) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${API_KEY}\`
    },
    body: JSON.stringify(data)
  });
  
  return response.json();
}

// Usage
const suggestions = await callAPI('/api/complete-word', {
  query: "Hello world",
  incompleteWord: "wor"
});`}
                  />
                </div>

                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Delete API Key</h3>
                  
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm font-semibold">
                      DELETE /api/keys/:id
                    </span>
                    <span className="ml-2 text-xs text-white/60">Requires Admin Password</span>
                  </div>

                  <CodeBlock
                    id="delete-key"
                    language="javascript"
                    code={`async function deleteApiKey(keyId, password) {
  const response = await fetch(\`/api/keys/\${keyId}\`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password })
  });
  
  return response.json();
}`}
                  />
                </div>

                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Rate Limiting</h3>
                  <p className="text-white/70 mb-4">
                    Each API key has a rate limit (default: 1000 requests/hour). When exceeded, you'll receive a 429 status code.
                  </p>

                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2">Rate Limit Headers</h4>
                    <CodeBlock
                      id="rate-limit-headers"
                      language="http"
                      code={`HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 856
X-RateLimit-Reset: 1643875200`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Examples */}
          <TabsContent value="examples" className="space-y-6">
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden">
              <BorderBeam size={250} duration={12} delay={10} />
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Code className="h-5 w-5 text-cyan-400" />
                  Code Examples
                </CardTitle>
                <CardDescription>Complete integration examples in multiple languages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* React Example */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">React Autocomplete Component</h3>
                  <CodeBlock
                    id="react-example"
                    language="typescript"
                    code={`import { useState, useEffect, useRef } from 'react';

export function AutocompleteInput() {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (input.length < 2) return;

      setLoading(true);
      try {
        const lastWord = input.split(/\\s+/).pop() || '';
        const response = await fetch('/api/complete-word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: input,
            incompleteWord: lastWord
          })
        });

        const data = await response.json();
        setSuggestions(data.suggestions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [input]);

  return (
    <div className="relative">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Start typing..."
        className="w-full p-3 border rounded-lg"
      />
      
      {loading && <div>Loading...</div>}
      
      {suggestions.length > 0 && (
        <ul className="absolute w-full bg-white border rounded-lg mt-1">
          {suggestions.map((sug, idx) => (
            <li
              key={idx}
              onClick={() => {
                setInput(input + sug.text);
                setSuggestions([]);
              }}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              {sug.text}
              <span className="text-xs text-gray-500 ml-2">
                ({sug.source})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}`}
                  />
                </div>

                {/* Python Example */}
                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Python SDK</h3>
                  <CodeBlock
                    id="python-sdk"
                    language="python"
                    code={`import requests
from typing import List, Dict, Optional

class TypeFlowAI:
    def __init__(self, base_url: str, api_key: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()
        if api_key:
            self.session.headers['Authorization'] = f'Bearer {api_key}'
    
    def complete_word(self, query: str, incomplete_word: str) -> List[Dict]:
        """Get word completion suggestions"""
        response = self.session.post(
            f'{self.base_url}/api/complete-word',
            json={
                'query': query,
                'incompleteWord': incomplete_word
            }
        )
        response.raise_for_status()
        return response.json()['suggestions']
    
    def suggest_phrase(self, query: str) -> List[Dict]:
        """Get phrase suggestions"""
        response = self.session.post(
            f'{self.base_url}/api/suggest-phrase',
            json={'query': query}
        )
        response.raise_for_status()
        return response.json()['suggestions']
    
    def chat(self, message: str, history: List[Dict] = None) -> Dict:
        """Send a chat message"""
        response = self.session.post(
            f'{self.base_url}/api/chat',
            json={
                'message': message,
                'history': history or []
            }
        )
        response.raise_for_status()
        return response.json()
    
    def train(self, file_path: str, password: str) -> Dict:
        """Upload training file"""
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {'password': password}
            response = self.session.post(
                f'{self.base_url}/api/train',
                files=files,
                data=data
            )
        response.raise_for_status()
        return response.json()

# Usage
client = TypeFlowAI('https://your-domain.com', 'tfai_your_api_key')

# Autocomplete
suggestions = client.complete_word("Hello wor", "wor")
for sug in suggestions:
    print(f"{sug['text']} - {sug['source']}")

# Chat
response = client.chat("What is TypeFlow AI?")
print(response['response'])

# Train
result = client.train("document.pdf", "admin_password")
print(f"Trained with {result['chunks']} chunks")`}
                  />
                </div>

                {/* Node.js Example */}
                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Node.js SDK</h3>
                  <CodeBlock
                    id="nodejs-sdk"
                    language="javascript"
                    code={`const FormData = require('form-data');
const fs = require('fs');

class TypeFlowAI {
  constructor(baseUrl, apiKey = null) {
    this.baseUrl = baseUrl.replace(/\\/$/, '');
    this.apiKey = apiKey;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.apiKey) {
      headers['Authorization'] = \`Bearer \${this.apiKey}\`;
    }

    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(\`API Error: \${response.statusText}\`);
    }

    return response.json();
  }

  async completeWord(query, incompleteWord) {
    const data = await this.request('/api/complete-word', {
      method: 'POST',
      body: JSON.stringify({ query, incompleteWord })
    });
    return data.suggestions;
  }

  async suggestPhrase(query) {
    const data = await this.request('/api/suggest-phrase', {
      method: 'POST',
      body: JSON.stringify({ query })
    });
    return data.suggestions;
  }

  async chat(message, history = []) {
    return this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history })
    });
  }

  async train(filePath, password) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('password', password);

    const response = await fetch(\`\${this.baseUrl}/api/train\`, {
      method: 'POST',
      body: formData,
      headers: this.apiKey ? {
        'Authorization': \`Bearer \${this.apiKey}\`
      } : {}
    });

    return response.json();
  }
}

// Usage
const client = new TypeFlowAI('https://your-domain.com', 'tfai_your_api_key');

// Autocomplete
const suggestions = await client.completeWord("Hello wor", "wor");
console.log(suggestions);

// Chat
const chatResponse = await client.chat("What is TypeFlow AI?");
console.log(chatResponse.response);

// Train
const trainResult = await client.train("./document.pdf", "admin_password");
console.log(\`Trained with \${trainResult.chunks} chunks\`);

module.exports = TypeFlowAI;`}
                  />
                </div>

                {/* cURL Examples */}
                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">cURL Examples</h3>
                  <CodeBlock
                    id="curl-examples"
                    language="bash"
                    code={`# Word Completion
curl -X POST https://your-domain.com/api/complete-word \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer tfai_your_api_key" \\
  -d '{
    "query": "Hello wor",
    "incompleteWord": "wor"
  }'

# Phrase Suggestion
curl -X POST https://your-domain.com/api/suggest-phrase \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer tfai_your_api_key" \\
  -d '{"query": "Hello world."}'

# Chat
curl -X POST https://your-domain.com/api/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer tfai_your_api_key" \\
  -d '{
    "message": "What is TypeFlow AI?",
    "history": []
  }'

# Train with File
curl -X POST https://your-domain.com/api/train \\
  -H "Authorization: Bearer tfai_your_api_key" \\
  -F "file=@document.pdf" \\
  -F "password=admin_password"

# Delete File
curl -X DELETE https://your-domain.com/api/forget \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer tfai_your_api_key" \\
  -d '{"filename": "document.pdf"}'`}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-12 text-center border-t border-white/5 pt-8">
          <p className="text-white/40 text-sm">
            Need help? Check out the{' '}
            <Link href="/" className="text-blue-400 hover:text-blue-300">
              main application
            </Link>
            {' '}or contact support.
          </p>
          <p className="text-white/30 text-xs mt-2">
            TypeFlow AI v1.0.0 • Built with ❤️ by KOSIGN Global Biz Center
          </p>
        </div>
      </div>
    </div>
  )
}
