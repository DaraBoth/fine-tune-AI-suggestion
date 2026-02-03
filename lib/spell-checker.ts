/**
 * Spell Checker Utility
 * Implements fuzzy word matching using Levenshtein distance algorithm
 */

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed to transform one string into another
 */
export function levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length
    const len2 = str2.length

    // Create a 2D array for dynamic programming
    const matrix: number[][] = Array(len1 + 1)
        .fill(null)
        .map(() => Array(len2 + 1).fill(0))

    // Initialize first row and column
    for (let i = 0; i <= len1; i++) {
        matrix[i][0] = i
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j
    }

    // Fill the matrix
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            )
        }
    }

    return matrix[len1][len2]
}

/**
 * Check if a word is likely misspelled based on context
 */
export function isLikelyMisspelled(word: string, knownWords: string[]): boolean {
    if (!word || word.length < 2) return false

    const wordLower = word.toLowerCase()

    // If word exists in known words, it's not misspelled
    if (knownWords.some(w => w.toLowerCase() === wordLower)) {
        return false
    }

    // If there's a very close match (distance 1-2), likely misspelled
    const hasCloseMatch = knownWords.some(w => {
        const distance = levenshteinDistance(wordLower, w.toLowerCase())
        return distance > 0 && distance <= 2
    })

    return hasCloseMatch
}

/**
 * Find spelling suggestions for a misspelled word
 */
export function findSpellingSuggestions(
    misspelledWord: string,
    knownWords: string[],
    maxSuggestions: number = 3,
    maxDistance: number = 2
): Array<{ word: string; distance: number; confidence: number }> {
    const wordLower = misspelledWord.toLowerCase()

    // Calculate distance for all known words
    const candidates = knownWords
        .map(word => ({
            word,
            distance: levenshteinDistance(wordLower, word.toLowerCase())
        }))
        .filter(({ distance }) => distance > 0 && distance <= maxDistance)
        .sort((a, b) => {
            // Sort by distance first, then by length similarity
            if (a.distance !== b.distance) return a.distance - b.distance
            const lenDiff1 = Math.abs(a.word.length - misspelledWord.length)
            const lenDiff2 = Math.abs(b.word.length - misspelledWord.length)
            return lenDiff1 - lenDiff2
        })

    // Calculate confidence scores
    const suggestions = candidates.slice(0, maxSuggestions).map(({ word, distance }) => ({
        word,
        distance,
        confidence: 1 - (distance / Math.max(word.length, misspelledWord.length))
    }))

    return suggestions
}

/**
 * Extract unique words from text content
 */
export function extractWords(content: string): string[] {
    // Split by whitespace and punctuation
    const words = content
        .split(/[\s.,!?;:()\[\]{}"'`]+/)
        .map(w => w.trim())
        .filter(w => w.length >= 2) // Filter out single characters

    // Return unique words
    return Array.from(new Set(words))
}

/**
 * Build a dictionary from matched chunks
 */
export function buildDictionary(chunks: Array<{ content: string }>): string[] {
    const allWords = chunks.flatMap(chunk => extractWords(chunk.content))
    return Array.from(new Set(allWords))
}
