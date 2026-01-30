'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Send, Bot, User, Database, Sparkles, Loader2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { sendChatMessage, type ChatMessage } from '@/services'

interface Message {
  role: 'user' | 'assistant'
  content: string
  usedKnowledgeBase?: boolean
  contextChunks?: number
}

export default function ChatInterface() {
  // Get state and actions from store
  const messages = useAppStore((state) => state.chatMessages)
  const setMessages = useAppStore((state) => state.setChatMessages)
  const addMessage = useAppStore((state) => state.addChatMessage)
  const inputValue = useAppStore((state) => state.chatInput)
  const setInputValue = useAppStore((state) => state.setChatInput)
  const clearChat = useAppStore((state) => state.clearChat)
  
  // Local UI state
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')

    // Add user message to chat
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
    }
    addMessage(newUserMessage)

    setIsLoading(true)

    try {
      const data = await sendChatMessage(
        userMessage,
        messages.map((m) => ({
          role: m.role,
          content: m.content,
        }))
      )

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        usedKnowledgeBase: (data as any).usedKnowledgeBase,
        contextChunks: (data as any).contextChunks,
      }
      addMessage(assistantMessage)
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I could not connect to the AI service.',
      }
      addMessage(errorMessage)
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearChat = () => {
    clearChat()
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-semibold">AI Chat Assistant</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Ask questions and get answers powered by your knowledge base
              </p>
            </div>
            {messages.length > 0 && (
              <Button
                onClick={handleClearChat}
                variant="outline"
                size="sm"
                className="border-white/20 text-xs sm:text-sm"
              >
                Clear Chat
              </Button>
            )}
          </div>

          {/* Messages Container */}
          <div className="mb-4 flex min-h-[300px] sm:min-h-[400px] max-h-[500px] sm:max-h-[600px] flex-col overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-3 sm:p-4">
            {messages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-center px-2">
                <div className="space-y-3">
                  <div className="mx-auto flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary/20">
                    <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-medium text-white">
                      Start a Conversation
                    </h4>
                    <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                      Ask me anything! I can use your trained knowledge base to provide accurate answers.
                    </p>
                  </div>
                  <div className="mx-auto mt-4 max-w-md space-y-2 text-left text-xs text-muted-foreground">
                    <p className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Ask normal questions using my general knowledge</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Ask about your uploaded PDFs and documents</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Try: "What knowledge do you have?" or "Summarize what you know"</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-2 sm:gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <Bot className="h-3 w-3 sm:h-5 sm:w-5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-3 py-2 sm:px-4 sm:py-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">
                        {message.content}
                      </p>
                      {message.role === 'assistant' && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          {message.usedKnowledgeBase ? (
                            <>
                              <Database className="h-3 w-3" />
                              <span className="text-xs">
                                <span className="hidden xs:inline">Used knowledge base (</span>
                                <span className="xs:hidden">KB (</span>
                                {message.contextChunks} sources)
                              </span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3" />
                              <span className="text-xs">General knowledge</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                        <User className="h-3 w-3 sm:h-5 sm:w-5 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 sm:gap-3 justify-start">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                      <Bot className="h-3 w-3 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="rounded-lg bg-white/10 px-3 py-2 sm:px-4 sm:py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-primary" />
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          Thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="flex-1 resize-none rounded-lg border-2 border-white/20 bg-white/5 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/20"
              rows={2}
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="h-auto shrink-0 px-3 sm:px-4"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              ) : (
                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </Button>
          </div>

          {/* Help Text */}
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Tip: Ask about your uploaded documents or any general question. The AI will use your knowledge base when relevant.</span>
            <span className="sm:hidden">Ask about your documents or general questions</span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
