'use client'

import { useEffect, useRef, KeyboardEvent, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Copy, Check, Languages, Brain, Lightbulb, Sparkles as SparklesIcon } from 'lucide-react'
import { matchesPreferredLanguage, detectLanguage, getLanguageName } from '@/lib/language-detector'
import { useAppStore } from '@/lib/store'
import ShimmerButton from '@/components/ui/shimmer-button'
import Sparkles from '@/components/ui/sparkles'
import { BorderBeam } from '@/components/ui/border-beam'
import { DotPattern } from '@/components/ui/dot-pattern'
import { Particles } from '@/components/ui/particles'
import { Meteors } from '@/components/ui/meteors'
import { completeWord, suggestPhrase, learnFromAcceptedSuggestion, Suggestion } from '@/services'

/**
 * Calculates the overlap between the end of the input and the start of the suggestion.
 * Returns the length of the overlapping characters.
 */
function calculateOverlap(input: string, suggestion: string): number {
  const normalizedInput = input.toLowerCase()
  const normalizedSuggestion = suggestion.toLowerCase()

  // Check for overlap starting from the longest possible match
  const maxOverlap = Math.min(input.length, suggestion.length)

  for (let i = maxOverlap; i > 0; i--) {
    const suffix = normalizedInput.substring(input.length - i)
    const prefix = normalizedSuggestion.substring(0, i)

    if (suffix === prefix) {
      return i
    }
  }

  return 0
}

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
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const suggestionCacheRef = useRef<Map<string, Suggestion[]>>(new Map())

  // Auto-expand textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

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

      // Cache the results
      suggestionCacheRef.current.set(text.trim(), allSuggestions)
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

    const cacheKey = value.trim()

    // Detect language of current input
    const detected = detectLanguage(value)
    setDetectedLanguage(detected)

    // Check cache for instant feedback
    if (suggestionCacheRef.current.has(cacheKey)) {
      setSuggestions(suggestionCacheRef.current.get(cacheKey) || [])
    } else {
      // Clear previous suggestions if not in cache
      setSuggestions([])
    }

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer for debounced API call (250ms for faster response)
    debounceTimerRef.current = setTimeout(() => {
      // Only fetch suggestion if language matches preference
      if (matchesPreferredLanguage(value, preferredLanguage)) {
        // If we already have cached results, we don't strictly need to fetch again
        // unless we want to ensure freshness (but for autocomplete, cache is usually fine)
        if (!suggestionCacheRef.current.has(cacheKey)) {
          fetchSuggestion(value)
        }
      } else {
        // Clear suggestions if language doesn't match
        setSuggestions([])
      }
    }, 250)
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

    // Check for overlap to prevent duplication
    const overlapLen = calculateOverlap(inputValue, suggestionText)

    // If we found a meaningful overlap (and it's not just a single space match unless context implies it)
    if (overlapLen > 0) {
      // Use the overlapped version
      completedText = inputValue + suggestionText.substring(overlapLen)
    } else {
      // Standard fallback logic if no overlap found
      if (type === 'word' && analysis.incompleteWord) {
        completedText = inputValue + suggestionText
      } else if (type === 'phrase') {
        const needsSpace = !inputValue.endsWith(' ') && suggestionText.length > 0
        completedText = inputValue + (needsSpace ? ' ' : '') + suggestionText
      } else {
        completedText = inputValue.trimEnd() + ' ' + suggestionText
      }
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

      // Sync with global store to trigger refresh in TrainingTab
      useAppStore.getState().setTrainingUploadStatus({
        status: 'success',
        message: 'Manual training successful',
        filename: 'manual-training.txt',
        chunks: data.chunks
      })

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
      <Card className="border-white/10 bg-black/40 backdrop-blur-xl relative z-10 overflow-visible group/card">
        <BorderBeam size={300} duration={18} delay={0} />
        <DotPattern
          width={20}
          height={20}
          cx={1}
          cy={1}
          cr={1}
          className="opacity-10 [mask-image:radial-gradient(white,transparent_115%)]"
        />
        <Particles
          className="absolute inset-0 z-0 transition-opacity duration-1000 group-hover/card:opacity-40 opacity-20"
          quantity={40}
          staticity={50}
        />

        <CardContent className="p-4 sm:p-6 relative z-10">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent" />
                  <SparklesIcon className="h-6 w-6 text-blue-400 relative z-10 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    Smart Suggestion
                    <SparklesIcon className="h-4 w-4 text-cyan-400" />
                  </h3>
                  <p className="text-xs sm:text-sm text-white/50">
                    Type to get intelligent completions based on your content
                  </p>
                </div>
              </div>

              {/* Language Preference Selector */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Languages className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <select
                  value={preferredLanguage}
                  onChange={handleLanguageChange}
                  className="rounded-md border text-black px-2 sm:px-3 py-1 sm:py-1.5 text-base focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option className="text-black" value="en">English</option>
                  <option className="text-black" value="ko">Korean</option>
                </select>
              </div>
            </div>

            <div className="relative overflow-visible z-10 group/input">
              {/* Input Textarea */}
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Start typing..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 sm:px-6 py-4 text-base leading-relaxed text-white caret-blue-400 placeholder:text-white/20 focus:border-blue-500/40 focus:bg-black/60 focus:outline-none transition-all duration-300 shadow-2xl backdrop-blur-md min-h-[56px] overflow-hidden"
                spellCheck={false}
              />
              <div className="absolute inset-0 rounded-2xl pointer-events-none border border-transparent group-focus-within/input:border-blue-500/20 transition-all duration-500" />

              {/* Dropdown Suggestion List */}
              <AnimatePresence>
                {suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.1 }}
                    className="absolute left-0 right-0 top-full mt-3 z-50 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden max-h-80 overflow-y-auto"
                  >
                    {/* Suggestion Items */}
                    {suggestions.map((sug, index) => (
                      <motion.button
                        key={index}
                        transition={{ duration: 0.05 }}
                        onClick={() => {
                          acceptSuggestion(sug.text, sug.suggestionType)
                          textareaRef.current?.focus()
                        }}
                        className={`w-full z-40 px-5 py-4 flex items-center gap-4 transition-all text-left group border-b border-white/5 last:border-b-0 relative overflow-hidden ${index === selectedSuggestionIndex
                          ? 'bg-blue-600/20'
                          : 'hover:bg-white/5'
                          }`}
                      >
                        {index === selectedSuggestionIndex && (
                          <motion.div
                            layoutId="active-bg"
                            className="absolute inset-0 bg-blue-500/10 pointer-events-none"
                            initial={false}
                          />
                        )}

                        {/* Suggestion Text */}
                        <div className="flex-1 min-w-0 relative z-10">
                          <div className="text-white text-base flex items-center flex-wrap gap-2">
                            {/* Show suggestion type badge */}
                            {sug.suggestionType && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${sug.suggestionType === 'word'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                }`}>
                                {sug.suggestionType === 'word' ? 'Word' : 'Phrase'}
                              </span>
                            )}
                            <div className="leading-tight">
                              {(() => {
                                // Calculate overlap for visual deduplication
                                const overlapLen = calculateOverlap(inputValue, sug.text)

                                if (overlapLen > 0) {
                                  // Suggestion overlaps with input - only show new part in blue
                                  const uniquePart = sug.text.substring(overlapLen)
                                  return (
                                    <>
                                      <span className="text-white/40">{inputValue}</span>
                                      <span className="text-blue-400 font-bold">{uniquePart}</span>
                                    </>
                                  )
                                } else {
                                  const analysis = analyzeInputState(inputValue)
                                  const type = sug.suggestionType || analysis.type

                                  if (type === 'word' && analysis.incompleteWord) {
                                    return (
                                      <>
                                        <span className="text-white/40">{inputValue}</span>
                                        <span className="text-blue-400 font-bold">{sug.text}</span>
                                      </>
                                    )
                                  } else {
                                    const needsSpace = !inputValue.endsWith(' ') && sug.text.length > 0
                                    return (
                                      <>
                                        <span className="text-white/40">{inputValue}</span>
                                        {needsSpace && <span className="text-white/40"> </span>}
                                        <span className="text-blue-400 font-bold">{sug.text}</span>
                                      </>
                                    )
                                  }
                                }
                              })()}
                            </div>
                          </div>
                          {sug.similarity && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500/50"
                                  style={{ width: `${sug.similarity * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-white/30 font-medium">
                                {Math.round(sug.similarity * 100)}% match
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Source Badge */}
                        <div className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tighter relative z-10 border ${sug.source === 'trained-data'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : sug.source === 'ai-with-context'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          }`}>
                          {sug.source === 'trained-data' ? 'Trained' : sug.source === 'ai-with-context' ? 'AI+Data' : 'AI'}
                        </div>
                      </motion.button>
                    ))}

                    {/* Footer Hint */}
                    <div className="px-5 py-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-[10px] font-medium text-white/40 uppercase tracking-widest">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><span className="text-white/60">↑↓</span> Navigate</span>
                        <span className="flex items-center gap-1"><span className="text-white/60">Enter/Tab</span> Accept</span>
                      </div>
                      <span className="flex items-center gap-1"><span className="text-white/60">Esc</span> Close</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
      <Card className="border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden group/tips">
        <Meteors number={10} />
        <CardContent className="p-5 sm:p-6 relative z-10">
          <div className="flex gap-4">
            <div className="shrink-0 h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Lightbulb className="h-5 w-5 text-amber-500" />
            </div>
            <div className="space-y-3">
              <p className="font-bold text-lg text-white tracking-tight">Pro Tips</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-white/50">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">✦</span>
                  <span>Upload PDFs in "Training" tab for custom knowledge enrichment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">✦</span>
                  <span>Click "Teach AI" to instantly learn from your current input</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">✦</span>
                  <span>Navigate with Arrow Keys, accept with Tab/Enter</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">✦</span>
                  <span>Semantic similarity identifies the most relevant context</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
