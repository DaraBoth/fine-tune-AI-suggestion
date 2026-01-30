'use client'

import { useEffect, useRef, KeyboardEvent, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Copy, Check, Languages, Brain } from 'lucide-react'
import { matchesPreferredLanguage, detectLanguage, getLanguageName } from '@/lib/language-detector'
import { useAppStore } from '@/lib/store'
import ShimmerButton from '@/components/ui/shimmer-button'
import Sparkles from '@/components/ui/sparkles'
import { BorderBeam } from '@/components/ui/border-beam'
import { completeWord, suggestPhrase, learnFromAcceptedSuggestion } from '@/services'

export default function ChatInput() {
  // Get state and actions from store
  const inputValue = useAppStore((state) => state.autocompleteInput)
  const setInputValue = useAppStore((state) => state.setAutocompleteInput)
  const suggestions = useAppStore((state) => state.autocompleteSuggestions)
  const setSuggestions = useAppStore((state) => state.setAutocompleteSuggestions)
  const preferredLanguage = useAppStore((state) => state.autocompletePreferredLanguage)
  const setPreferredLanguage = useAppStore((state) => state.setAutocompletePreferredLanguage)
  const detectedLanguage = useAppStore((state) => state.autocompleteDetectedLanguage)
  const setDetectedLanguage = useAppStore((state) => state.setAutocompleteDetectedLanguage)
  
  // Local UI state (not persisted)
  const [isCopied, setIsCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isTeaching, setIsTeaching] = useState(false)
  const [teachSuccess, setTeachSuccess] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout>()

  /**
   * Analyze input state to determine what type of suggestion to fetch
   */
  const analyzeInputState = (text: string): { 
    shouldFetch: boolean
    type: 'word' | 'phrase' | null
    incompleteWord?: string 
  } => {
    if (!text || text.trim().length < 2) {
      return { shouldFetch: false, type: null }
    }

    const trimmedText = text.trimEnd() // Remove trailing spaces for analysis
    
    // Don't suggest if text ends with punctuation
    if (/[.!?,;:]$/.test(trimmedText)) {
      return { shouldFetch: false, type: null }
    }

    // Check if last character is a space (means user finished a word)
    const endsWithSpace = text.endsWith(' ')
    
    if (endsWithSpace) {
      // User finished typing a word and added space - suggest next phrase
      return { shouldFetch: true, type: 'phrase' }
    } else {
      // Get the last word being typed
      const words = trimmedText.split(/\s+/)
      const lastWord = words[words.length - 1]
      
      // If last word is incomplete (no punctuation), suggest word completion
      if (lastWord && lastWord.length > 0) {
        return { 
          shouldFetch: true, 
          type: 'word',
          incompleteWord: lastWord 
        }
      }
    }

    return { shouldFetch: false, type: null }
  }

  /**
   * Fetch AI suggestion from appropriate API endpoint
   */
  const fetchSuggestion = useCallback(async (text: string) => {
    const analysis = analyzeInputState(text)
    
    if (!analysis.shouldFetch) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    
    try {
      let allSuggestions: any[] = []

      if (analysis.type === 'word' && analysis.incompleteWord) {
        // For word completion, fetch both word completions and phrase suggestions
        const [wordData, phraseData] = await Promise.all([
          completeWord(text, analysis.incompleteWord),
          suggestPhrase(text)
        ])
        
        // Combine: word completions first, then phrase suggestions
        if (wordData?.suggestions) {
          allSuggestions = wordData.suggestions.map((s: any) => ({ ...s, suggestionType: 'word' }))
        }
        if (phraseData?.suggestions) {
          const phraseSuggestions = phraseData.suggestions.map((s: any) => ({ ...s, suggestionType: 'phrase' }))
          allSuggestions = [...allSuggestions, ...phraseSuggestions]
        }
      } else if (analysis.type === 'phrase') {
        // For phrase suggestions only
        const data = await suggestPhrase(text)
        if (data?.suggestions) {
          allSuggestions = data.suggestions.map((s: any) => ({ ...s, suggestionType: 'phrase' }))
        }
      }

      setSuggestions(allSuggestions)
      setSelectedSuggestionIndex(0) // Reset to first suggestion
    } catch (error) {
      console.error('Error fetching suggestion:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Handle input change with debouncing
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInputValue(value)

    // Clear previous suggestions immediately when user types
    setSuggestions([])

    // Detect language of current input
    const detected = detectLanguage(value)
    setDetectedLanguage(detected)

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer for debounced API call (500ms for faster response)
    debounceTimerRef.current = setTimeout(() => {
      // Only fetch suggestion if language matches preference
      if (matchesPreferredLanguage(value, preferredLanguage)) {
        fetchSuggestion(value)
      } else {
        // Clear suggestions if language doesn't match
        setSuggestions([])
      }
    }, 500)
  }

  /**
   * Handle keyboard navigation and suggestion acceptance
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length === 0) return

    // Arrow Down - Navigate to next suggestion
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestionIndex((prev) => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
      return
    }

    // Arrow Up - Navigate to previous suggestion
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestionIndex((prev) => prev > 0 ? prev - 1 : prev)
      return
    }

    // Enter or Tab - Accept selected suggestion
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const selectedSuggestion = suggestions[selectedSuggestionIndex]
      acceptSuggestion(selectedSuggestion.text, selectedSuggestion.suggestionType)
      return
    }

    // Escape - Close suggestions
    if (e.key === 'Escape') {
      e.preventDefault()
      setSuggestions([])
      return
    }

    // Number keys 1-5 - Direct selection
    const num = parseInt(e.key)
    if (num >= 1 && num <= 5 && num <= suggestions.length) {
      e.preventDefault()
      const selectedSuggestion = suggestions[num - 1]
      acceptSuggestion(selectedSuggestion.text, selectedSuggestion.suggestionType)
      return
    }
  }

  /**
   * Accept a suggestion and add it to the input
   */
  const acceptSuggestion = async (suggestionText: string, suggestionType?: 'word' | 'phrase') => {
    const analysis = analyzeInputState(inputValue)
    let completedText = inputValue
    
    // Use suggestionType if provided, otherwise fallback to analysis
    const type = suggestionType || analysis.type
    
    if (type === 'word' && analysis.incompleteWord) {
      // For word completion: append the completion to the incomplete word
      // suggestionText should be just the completion part (e.g., "인" not "확인")
      completedText = inputValue + suggestionText
    } else if (type === 'phrase') {
      // For phrase suggestion: append with space if needed
      const needsSpace = !inputValue.endsWith(' ') && suggestionText.length > 0
      completedText = inputValue + (needsSpace ? ' ' : '') + suggestionText
    } else {
      // Fallback: append with space
      completedText = inputValue.trimEnd() + ' ' + suggestionText
    }
    
    // Check if this suggestion came from AI (not from trained data)
    const selectedSuggestion = suggestions[selectedSuggestionIndex]
    if (selectedSuggestion && selectedSuggestion.source === 'openai-fallback') {
      // Auto-learn this accepted suggestion
      console.log('[Auto-Learn] User accepted AI suggestion, learning:', suggestionText)
      
      // Send to learning API (don't await to avoid blocking UI)
      learnFromAcceptedSuggestion(suggestionText, inputValue, selectedSuggestion.source)
        .then((data) => {
          if (data.learned) {
            console.log('[Auto-Learn] Successfully learned:', data.text)
          } else {
            console.log('[Auto-Learn] Skipped learning:', data.reason)
          }
        })
        .catch((error) => {
          console.error('[Auto-Learn] Failed:', error)
        })
    }
    
    setInputValue(completedText)
    setSuggestions([])
    
    // Move cursor to end
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = completedText.length
        textareaRef.current.selectionEnd = completedText.length
      }
    }, 0)
  }

  /**
   * Copy to clipboard
   */
  const handleCopy = async () => {
    if (!inputValue) return

    try {
      await navigator.clipboard.writeText(inputValue)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  /**
   * Handle language preference change
   */
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value
    setPreferredLanguage(newLanguage)
  }

  /**
   * Teach AI with current input text
   */
  const handleTeach = async () => {
    if (!inputValue.trim() || isTeaching) return

    setIsTeaching(true)
    setTeachSuccess(false)

    try {
      const { trainWithText } = await import('@/services')
      const data = await trainWithText(inputValue)
      
      setTeachSuccess(true)
      setTimeout(() => setTeachSuccess(false), 3000)
      console.log('Training successful:', data)
    } catch (error) {
      console.error('Error teaching AI:', error)
    } finally {
      setIsTeaching(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-white/5 backdrop-blur-xl relative z-10">
        <BorderBeam size={300} duration={18} delay={0} />
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1">
                <Sparkles
                  className="inline-block"
                  density={50}
                  size={0.8}
                  speed={1}
                  color="#60a5fa"
                >
                  <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Smart Suggestion
                  </h3>
                </Sparkles>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Type to get intelligent suggestions from your trained AI
                </p>
              </div>
              
              {/* Language Preference Selector */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Languages className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <select
                  value={preferredLanguage}
                  onChange={handleLanguageChange}
                  className="rounded-md border text-black px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option className="text-black" value="en">English</option>
                  <option className="text-black" value="zh">Chinese</option>
                  <option className="text-black" value="ko">Korean</option>
                </select>
              </div>
            </div>

            {/* Search Bar Style Input with Dropdown Suggestions */}
            <div className="relative overflow-visible z-10">
              {/* Input Textarea */}
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange} 
                onKeyDown={handleKeyDown}
                placeholder="Start typing... AI will suggest completions based on your trained data"
                className="min-h-[100px] sm:min-h-[72px] w-full resize-none rounded-xl border-2 border-white/20 bg-slate-900/50 px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-base leading-relaxed text-white caret-blue-400 placeholder:text-white/30 focus:border-blue-500/50 focus:bg-slate-800/60 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                spellCheck={false}
              />
              
              {/* Dropdown Suggestion List - Absolutely positioned relative to textarea container */}
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-800/95 backdrop-blur-lg border border-white/20 rounded-lg shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                  {/* Suggestion Items */}
                  {suggestions.map((sug, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        acceptSuggestion(sug.text, sug.suggestionType)
                        textareaRef.current?.focus()
                      }}
                      className={`w-full z-40 px-4 py-3 flex items-center gap-3 transition-colors text-left group border-b border-white/5 last:border-b-0 ${
                        index === selectedSuggestionIndex 
                          ? 'bg-blue-500/30 ring-2 ring-blue-500/50' 
                          : 'hover:bg-blue-500/20'
                      }`}
                    >
                      
                      {/* Suggestion Text */}
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-base flex items-center gap-2">
                          {/* Show suggestion type badge */}
                          {sug.suggestionType && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              sug.suggestionType === 'word' 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {sug.suggestionType === 'word' ? 'Word' : 'Phrase'}
                            </span>
                          )}
                          <div>
                            {(() => {
                              const analysis = analyzeInputState(inputValue)
                              const type = sug.suggestionType || analysis.type
                              
                              if (type === 'word' && analysis.incompleteWord) {
                                // For word completion: show full input with the completion appended
                                return (
                                  <>
                                    <span className="text-white/50">{inputValue}</span>
                                    <span className="text-white font-medium">{sug.text}</span>
                                  </>
                                )
                              } else {
                                // For phrase suggestion: show full input + suggestion (with space if needed)
                                const needsSpace = !inputValue.endsWith(' ') && sug.text.length > 0
                                return (
                                  <>
                                    <span className="text-white/50">{inputValue}</span>
                                    {needsSpace && <span className="text-white/50"> </span>}
                                    <span className="text-white font-medium">{sug.text}</span>
                                  </>
                                )
                              }
                            })()}
                          </div>
                        </div>
                        {sug.similarity && (
                          <div className="text-xs text-white/40 mt-0.5">
                            {Math.round(sug.similarity * 100)}% match
                          </div>
                        )}
                      </div>
                      
                      {/* Source Badge */}
                      <div className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${
                        sug.source === 'trained-data' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {sug.source === 'trained-data' ? 'Trained' : 'AI'}
                      </div>
                    </button>
                  ))}
                  
                  {/* Footer Hint */}
                  <div className="px-4 py-2 bg-slate-900/50 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                    <span>↑↓ Navigate • Enter/Tab Accept • 1-5 Quick select</span>
                    <span>Esc to close</span>
                  </div>
                </div>
              )}
            </div>

            {/* Info Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center flex-wrap gap-2 sm:gap-4">
                <span>{inputValue.length} characters</span>
                
                {/* Detected Language Indicator */}
                {inputValue && detectedLanguage !== 'unknown' && (
                  <span className="flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-1 text-xs text-blue-400">
                    {getLanguageName(detectedLanguage)}
                  </span>
                )}
                
                {/* Language Mismatch Warning */}
                {inputValue && preferredLanguage !== 'all' && 
                 detectedLanguage !== 'unknown' && 
                 detectedLanguage !== preferredLanguage && (
                  <span className="flex items-center gap-1 rounded-md bg-orange-500/20 px-2 py-1 text-xs text-orange-400">
                    ⚠ Language mismatch (suggestions disabled)
                  </span>
                )}
                
                {isLoading && (
                  <span className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                    Loading suggestions...
                  </span>
                )}
                {suggestions.length > 0 && (
                  <span className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 px-3 py-1.5 text-xs font-medium text-blue-400 shadow-sm">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <ShimmerButton
                  onClick={handleTeach}
                  disabled={!inputValue || isTeaching}
                  className="gap-1 sm:gap-2 border-purple-500/30 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTeaching ? (
                    <>
                      <div className="h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span className="hidden xs:inline">Teaching...</span>
                      <span className="xs:hidden">...</span>
                    </>
                  ) : teachSuccess ? (
                    <>
                      <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                      Taught!
                    </>
                  ) : (
                    <>
                      <Brain className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden xs:inline">Teach AI</span>
                      <span className="xs:hidden">Teach</span>
                    </>
                  )}
                </ShimmerButton>
                <ShimmerButton
                  onClick={handleCopy}
                  disabled={!inputValue}
                  className="gap-1 sm:gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                      Copy
                    </>
                  )}
                </ShimmerButton>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="flex gap-3 text-sm">
            <div className="shrink-0 text-2xl">💡</div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Quick Tips:</p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                <li>Upload PDFs in the Train Your AI tab to teach the AI with custom content</li>
                <li>Click <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">Teach AI</kbd> button to train directly from your input text</li>
                <li>Use <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">↑↓</kbd> arrow keys to navigate suggestions</li>
                <li>Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">Tab</kbd> or <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">Enter</kbd> to accept, or use number keys <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">1-5</kbd> for quick selection</li>
                <li>Suggestions powered by RAG architecture with semantic similarity and AI processing</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
