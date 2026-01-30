'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, CheckCircle2, XCircle, Loader2, Database, FileStack, Calendar, BarChart3, Trash2, AlertTriangle, Eye, Download } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import ShimmerButton from '@/components/ui/shimmer-button'
import NumberTicker from '@/components/ui/number-ticker'
import { BorderBeam } from '@/components/ui/border-beam'
import Sparkles from '@/components/ui/sparkles'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface UploadStatus {
  status: 'idle' | 'uploading' | 'success' | 'error'
  message: string
  filename?: string
  chunks?: number
}

interface TrainingStats {
  totalChunks: number
  totalFiles: number
  totalCharacters: number
  files: string[]
  lastTrainingDate: string | null
  lastTrainingFile: string | null
}

interface TrainedFile {
  filename: string
  chunkCount: number
  lastUpdated: string
}

export default function TrainingTab() {
  const uploadStatus = useAppStore((state) => state.trainingUploadStatus)
  const setUploadStatus = useAppStore((state) => state.setTrainingUploadStatus)
  const [stats, setStats] = useState<TrainingStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [trainedFiles, setTrainedFiles] = useState<TrainedFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  const [viewingFile, setViewingFile] = useState<{ filename: string; content: string; metadata: any } | null>(null)
  const [loadingView, setLoadingView] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

  // Fetch training statistics
  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const response = await fetch('/api/training-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch training stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }, [])

  // Fetch trained files list
  const fetchTrainedFiles = useCallback(async () => {
    setLoadingFiles(true)
    try {
      const response = await fetch('/api/forget')
      if (response.ok) {
        const data = await response.json()
        setTrainedFiles(data.files || [])
      }
    } catch (error) {
      console.error('Failed to fetch trained files:', error)
    } finally {
      setLoadingFiles(false)
    }
  }, [])

  // Delete/forget a trained file
  const handleForgetFile = useCallback(async (filename: string) => {
    const toastId = toast.loading(`Deleting ${filename}...`, {
      description: 'Removing training data from AI memory',
    })

    setDeletingFile(filename)
    try {
      const response = await fetch('/api/forget', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh both stats and file list
        await Promise.all([fetchStats(), fetchTrainedFiles()])
        
        // Update toast to success
        toast.success(`Deleted ${filename}`, {
          id: toastId,
          description: `Successfully removed ${data.deletedCount} chunks from AI memory`,
        })
        
        // Remove from selected files if it was selected
        setSelectedFiles(prev => {
          const newSet = new Set(prev)
          newSet.delete(filename)
          return newSet
        })
      } else {
        toast.error(`Failed to delete ${filename}`, {
          id: toastId,
          description: data.error,
        })
      }
    } catch (error) {
      console.error('Failed to forget file:', error)
      toast.error(`Failed to delete ${filename}`, {
        id: toastId,
        description: 'An unexpected error occurred. Please try again.',
      })
    } finally {
      setDeletingFile(null)
    }
  }, [fetchStats, fetchTrainedFiles])

  // Delete multiple selected files
  const handleDeleteSelected = useCallback(async () => {
    if (selectedFiles.size === 0) return

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedFiles.size} file(s)?\n\nThis will permanently remove all training data for these files.`
    )
    
    if (!confirmed) return

    // Delete each file with its own toast
    const filesToDelete = Array.from(selectedFiles)
    
    for (const filename of filesToDelete) {
      await handleForgetFile(filename)
    }
    
    // Clear selection after all deletions
    setSelectedFiles(new Set())
  }, [selectedFiles, handleForgetFile])

  // Toggle file selection
  const toggleFileSelection = useCallback((filename: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(filename)) {
        newSet.delete(filename)
      } else {
        newSet.add(filename)
      }
      return newSet
    })
  }, [])

  // Select all files
  const handleSelectAll = useCallback(() => {
    if (selectedFiles.size === trainedFiles.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(trainedFiles.map(f => f.filename)))
    }
  }, [selectedFiles.size, trainedFiles])

  // View file content
  const handleViewFile = useCallback(async (filename: string) => {
    setLoadingView(true)
    try {
      const response = await fetch(`/api/view-file?filename=${encodeURIComponent(filename)}`)
      const data = await response.json()

      if (response.ok) {
        setViewingFile({
          filename: data.filename,
          content: data.content,
          metadata: data.metadata,
        })
      } else {
        alert(`❌ Failed to load file: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to view file:', error)
      alert('❌ Failed to load file content. Please try again.')
    } finally {
      setLoadingView(false)
    }
  }, [])

  // Download file content
  const handleDownloadFile = useCallback(async (filename: string) => {
    try {
      // Download the original file from Supabase Storage
      const response = await fetch(`/api/download-file?filename=${encodeURIComponent(filename)}`)

      if (response.ok) {
        // Get the file as a blob
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const data = await response.json()
        alert(`❌ Failed to download file: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to download file:', error)
      alert('❌ Failed to download file. Please try again.')
    }
  }, [])

  // Set up Supabase real-time subscription with fallback
  useEffect(() => {
    fetchStats() // Initial fetch
    fetchTrainedFiles() // Initial fetch of trained files

    try {
      // Try to use Supabase real-time subscription
      const { supabase } = require('@/lib/supabase')
      
      const channel = supabase
        .channel('chunks_changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'chunks_table'
          },
          (payload: any) => {
            console.log('Real-time update detected:', payload)
            // Refresh both stats and file list when any change occurs
            fetchStats()
            fetchTrainedFiles()
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('Real-time subscription active for training stats')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.log('Real-time subscription failed, falling back to polling')
          }
        })

      // Cleanup subscription on unmount
      return () => {
        supabase.removeChannel(channel)
      }
    } catch (error) {
      console.log('Real-time not available, using polling fallback:', error)
      // Fallback to polling if real-time fails
      const interval = setInterval(() => {
        fetchStats()
        fetchTrainedFiles()
      }, 5000) // Poll every 5 seconds as fallback

      return () => clearInterval(interval)
    }
  }, [fetchStats, fetchTrainedFiles])

  // Immediate refresh after successful upload
  useEffect(() => {
    if (uploadStatus.status === 'success') {
      fetchStats()
    }
  }, [uploadStatus.status, fetchStats])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    // Filter only PDF files
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf')
    
    if (pdfFiles.length === 0) {
      setUploadStatus({
        status: 'error',
        message: 'Please upload PDF files only',
      })
      return
    }

    // Add beforeunload listener to prevent accidental page close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process files one by one
    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i]

      setUploadStatus({
        status: 'uploading',
        message: `Processing ${i + 1} of ${pdfFiles.length}: ${file.name}...`,
        filename: file.name,
      })

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/train', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (response.ok) {
          successCount++
          // Fetch stats and file list after each successful file
          await Promise.all([fetchStats(), fetchTrainedFiles()])
        } else {
          errorCount++
          errors.push(`${file.name}: ${data.error || 'Failed to process'}`)
        }
      } catch (error) {
        errorCount++
        errors.push(`${file.name}: Network error`)
        console.error(`Error processing ${file.name}:`, error)
      }
    }

    // Remove beforeunload listener after processing
    window.removeEventListener('beforeunload', handleBeforeUnload)

    // Set final status
    if (successCount === pdfFiles.length) {
      setUploadStatus({
        status: 'success',
        message: `Successfully processed all ${successCount} file(s)`,
        chunks: successCount,
      })
    } else if (successCount > 0) {
      setUploadStatus({
        status: 'success',
        message: `Processed ${successCount} of ${pdfFiles.length} files. ${errorCount} failed: ${errors.join(', ')}`,
        chunks: successCount,
      })
    } else {
      setUploadStatus({
        status: 'error',
        message: `All files failed to process: ${errors.join(', ')}`,
      })
    }
  }, [fetchStats, setUploadStatus])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true, // Enable multiple file upload
    disabled: uploadStatus.status === 'uploading',
  })

  const resetUpload = () => {
    setUploadStatus({
      status: 'idle',
      message: '',
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Training Statistics */}
      {stats && stats.totalChunks > 0 && (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl relative overflow-hidden">
            <BorderBeam size={200} duration={12} delay={0} />
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Chunks</p>
                  <div className="text-xl sm:text-2xl font-bold text-primary">
                    <NumberTicker key={`chunks-${stats.totalChunks}`} value={loadingStats ? 0 : stats.totalChunks} />
                  </div>
                </div>
                <Database className="h-6 w-6 sm:h-8 sm:w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-xl relative overflow-hidden">
            <BorderBeam size={200} duration={12} delay={3} />
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Files Trained</p>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-400">
                    <NumberTicker key={`files-${stats.totalFiles}`} value={loadingStats ? 0 : stats.totalFiles} />
                  </div>
                </div>
                <FileStack className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-xl relative overflow-hidden">
            <BorderBeam size={200} duration={12} delay={6} />
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Characters</p>
                  <div className="text-xl sm:text-2xl font-bold text-blue-400">
                    <NumberTicker key={`chars-${stats.totalCharacters}`} value={loadingStats ? 0 : stats.totalCharacters / 1000} decimalPlaces={1} />K
                  </div>
                </div>
                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-xl relative overflow-hidden">
            <BorderBeam size={200} duration={12} delay={9} />
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Last Training</p>
                  <p className="text-xs sm:text-sm font-medium text-purple-400 truncate">
                    {stats.lastTrainingDate 
                      ? new Date(stats.lastTrainingDate).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'
                    }
                  </p>
                </div>
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400/50 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-white/10 bg-white/5 backdrop-blur-xl relative overflow-hidden">
        <BorderBeam size={250} duration={15} delay={0} />
        <CardHeader className="p-4 sm:p-6">
          <Sparkles
            className="inline-block"
            density={60}
            size={1}
            speed={1.2}
            color="#a78bfa"
          >
            <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Train Your AI
            </CardTitle>
          </Sparkles>
          <CardDescription className="text-xs sm:text-sm">
            Upload PDF files to train the AI with your custom content. The text will be chunked
            and embedded for intelligent suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div
            {...getRootProps()}
            className={`
              relative rounded-lg border-2 border-dashed p-6 sm:p-12 text-center transition-all
              ${
                isDragActive
                  ? 'border-primary bg-primary/10'
                  : 'border-white/20 hover:border-white/40 hover:bg-white/5'
              }
              ${uploadStatus.status === 'uploading' ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            `}
          >
            <input {...getInputProps()} />
            
            {uploadStatus.status === 'idle' && (
              <div className="space-y-3 sm:space-y-4">
                <Upload className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
                <div>
                  <p className="text-sm sm:text-lg font-medium">
                    {isDragActive ? 'Drop your PDF files here' : 'Drop PDF files here or click to browse'}
                  </p>
                  <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
                    Supports multiple PDF files up to 10MB each
                  </p>
                </div>
              </div>
            )}

            {uploadStatus.status === 'uploading' && (
              <div className="space-y-3 sm:space-y-4">
                <Loader2 className="mx-auto h-8 w-8 sm:h-12 sm:w-12 animate-spin text-primary" />
                <div>
                  <p className="text-sm sm:text-lg font-medium">{uploadStatus.message}</p>
                  <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
                    Please wait... Do not close or refresh this page
                  </p>
                </div>
              </div>
            )}

            {uploadStatus.status === 'success' && (
              <div className="space-y-4">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                <div>
                  <p className="text-lg font-medium text-green-500">Upload Successful!</p>
                  <p className="mt-2 text-sm text-muted-foreground">{uploadStatus.message}</p>
                  {uploadStatus.chunks && (
                    <p className="mt-1 text-sm font-medium text-primary">
                      {uploadStatus.chunks} chunks processed
                    </p>
                  )}
                </div>
                <ShimmerButton 
                  onClick={resetUpload} 
                  className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                >
                  Upload Another PDF
                </ShimmerButton>
              </div>
            )}

            {uploadStatus.status === 'error' && (
              <div className="space-y-4">
                <XCircle className="mx-auto h-12 w-12 text-red-500" />
                <div>
                  <p className="text-lg font-medium text-red-500">Upload Failed</p>
                  <p className="mt-2 text-sm text-muted-foreground">{uploadStatus.message}</p>
                </div>
                <ShimmerButton 
                  onClick={resetUpload} 
                  className="mt-4 bg-gradient-to-r from-orange-600 to-red-600 text-white"
                >
                  Try Again
                </ShimmerButton>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex gap-3">
              <FileText className="h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">How it works:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>Upload a PDF document with the content you want the AI to learn</li>
                  <li>The text is automatically extracted and split into manageable chunks</li>
                  <li>Each chunk is converted to embeddings using OpenAI</li>
                  <li>Embeddings are stored in Supabase vector database</li>
                  <li>AI uses semantic search to provide relevant suggestions as you type</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Trained Files List */}
          {trainedFiles.length > 0 && (
            <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileStack className="h-5 w-5 shrink-0 text-emerald-400" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">Trained Files ({trainedFiles.length})</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Select files to delete multiple at once
                  </p>
                </div>
                {trainedFiles.length > 0 && (
                  <div className="flex items-center gap-2">
                    {selectedFiles.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteSelected}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete ({selectedFiles.size})
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="gap-2"
                    >
                      {selectedFiles.size === trainedFiles.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                {loadingFiles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  trainedFiles.map((file, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.filename)}
                        onChange={() => toggleFileSelection(file.filename)}
                        className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 cursor-pointer"
                      />
                      <FileText className="h-4 w-4 shrink-0 text-emerald-400/70" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-foreground truncate font-medium">
                          {file.filename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {file.chunkCount} chunk{file.chunkCount !== 1 ? 's' : ''} • {new Date(file.lastUpdated).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewFile(file.filename)}
                          disabled={loadingView}
                          className="shrink-0 h-8 w-8 p-0 hover:bg-blue-500/10 hover:text-blue-400 transition-colors"
                          title="View file content"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadFile(file.filename)}
                          className="shrink-0 h-8 w-8 p-0 hover:bg-green-500/10 hover:text-green-400 transition-colors"
                          title="Download file"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleForgetFile(file.filename)}
                          disabled={deletingFile === file.filename}
                          className="shrink-0 h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                          title="Forget this file"
                        >
                          {deletingFile === file.filename ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {trainedFiles.length > 0 && !loadingFiles && (
                <div className="mt-4 flex items-start gap-2 text-xs text-amber-500/80 bg-amber-500/5 p-3 rounded-lg border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>
                    Deleting a file will permanently remove all its training data from the AI's memory. This action cannot be undone.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View File Dialog */}
      <Dialog open={viewingFile !== null} onOpenChange={(open) => !open && setViewingFile(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" />
              {viewingFile?.filename}
            </DialogTitle>
            <DialogDescription>
              Viewing trained file content • {viewingFile?.content.length.toLocaleString()} characters
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <pre className="text-sm text-foreground/90 whitespace-pre-wrap bg-black/20 p-4 rounded-lg border border-white/10">
              {viewingFile?.content}
            </pre>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => viewingFile && handleDownloadFile(viewingFile.filename)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              variant="default"
              onClick={() => setViewingFile(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
