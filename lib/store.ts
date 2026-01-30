import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Message {
  role: 'user' | 'assistant'
  content: string
  usedKnowledgeBase?: boolean
  contextChunks?: number
}

interface Suggestion {
  text: string
  source: 'trained-data' | 'openai-fallback'
  similarity?: number
  suggestionType?: 'word' | 'phrase'
}

interface UploadStatus {
  status: 'idle' | 'uploading' | 'success' | 'error'
  message: string
  filename?: string
  chunks?: number
}

interface AppState {
  // Autocomplete tab state
  autocompleteInput: string
  autocompleteSuggestions: Suggestion[]
  autocompletePreferredLanguage: string
  autocompleteDetectedLanguage: string
  
  // Chat tab state
  chatMessages: Message[]
  chatInput: string
  
  // Training tab state
  trainingStatus: string
  trainingUploadStatus: UploadStatus
  
  // Actions for Autocomplete
  setAutocompleteInput: (value: string) => void
  setAutocompleteSuggestions: (suggestions: Suggestion[]) => void
  setAutocompletePreferredLanguage: (language: string) => void
  setAutocompleteDetectedLanguage: (language: string) => void
  
  // Actions for Chat
  setChatMessages: (messages: Message[]) => void
  addChatMessage: (message: Message) => void
  setChatInput: (value: string) => void
  clearChat: () => void
  
  // Actions for Training
  setTrainingStatus: (status: string) => void
  setTrainingUploadStatus: (status: UploadStatus) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state - Autocomplete
      autocompleteInput: '',
      autocompleteSuggestions: [],
      autocompletePreferredLanguage: 'all',
      autocompleteDetectedLanguage: 'unknown',
      
      // Initial state - Chat
      chatMessages: [],
      chatInput: '',
      
      // Initial state - Training
      trainingStatus: '',
      trainingUploadStatus: {
        status: 'idle',
        message: '',
      },
      
      // Actions - Autocomplete
      setAutocompleteInput: (value) => set({ autocompleteInput: value }),
      setAutocompleteSuggestions: (suggestions) => set({ autocompleteSuggestions: suggestions }),
      setAutocompletePreferredLanguage: (language) => set({ autocompletePreferredLanguage: language }),
      setAutocompleteDetectedLanguage: (language) => set({ autocompleteDetectedLanguage: language }),
      
      // Actions - Chat
      setChatMessages: (messages) => set({ chatMessages: messages }),
      addChatMessage: (message) => set((state) => ({ 
        chatMessages: [...state.chatMessages, message] 
      })),
      setChatInput: (value) => set({ chatInput: value }),
      clearChat: () => set({ chatMessages: [], chatInput: '' }),
      
      // Actions - Training
      setTrainingStatus: (status) => set({ trainingStatus: status }),
      setTrainingUploadStatus: (status) => set({ trainingUploadStatus: status }),
    }),
    {
      name: 'ai-autocomplete-storage',
      partialize: (state) => ({
        // Only persist certain fields
        autocompleteInput: state.autocompleteInput,
        autocompletePreferredLanguage: state.autocompletePreferredLanguage,
        chatMessages: state.chatMessages,
        chatInput: state.chatInput,
        trainingUploadStatus: state.trainingUploadStatus,
      }),
    }
  )
)
