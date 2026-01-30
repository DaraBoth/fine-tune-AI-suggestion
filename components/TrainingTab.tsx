'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, CheckCircle2, XCircle, Loader2, Database, FileStack, Calendar, BarChart3, Trash2, AlertTriangle, Eye, Download, BrainCircuit, File as FileIcon } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import ShimmerButton from '@/components/ui/shimmer-button'
import NumberTicker from '@/components/ui/number-ticker'
import { BorderBeam } from '@/components/ui/border-beam'
import Sparkles from '@/components/ui/sparkles'
import { Button } from '@/components/ui/button'
import { AnimatedBeam } from '@/components/ui/animated-beam'
import { Meteors } from '@/components/ui/meteors'
import { Particles } from '@/components/ui/particles'
import { Confetti } from '@/components/ui/confetti'
import { useRef } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { trainWithFile, getTrainingStats, deleteTrainingFile, viewFileContent, downloadFile, triggerFileDownload, verifyAdminPassword, type TrainingStats as ITrainingStats } from '@/services'

interface UploadStatus {
  status: 'idle' | 'uploading' | 'success' | 'error'
  message: string
  filename?: string
  chunks?: number
}

interface TrainedFile {
  filename: string
  chunkCount: number
  lastUpdated: string
}

interface ActiveFile {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'error'
}

export default function TrainingTab() {
  const uploadStatus = useAppStore((state) => state.trainingUploadStatus)
  const setUploadStatus = useAppStore((state) => state.setTrainingUploadStatus)
  const [stats, setStats] = useState<ITrainingStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [trainedFiles, setTrainedFiles] = useState<TrainedFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  const [viewingFile, setViewingFile] = useState<{ filename: string; content: string; metadata: any } | null>(null)
  const [loadingView, setLoadingView] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [chunkStrategy, setChunkStrategy] = useState<'word' | 'sentence' | 'smart'>('smart')
  const [activeFiles, setActiveFiles] = useState<ActiveFile[]>([])

  // Refs for Animated Beam
  const containerRef = useRef<HTMLDivElement>(null)
  const brainRef = useRef<HTMLDivElement>(null)
  const fileRefs = useRef<{ [key: string]: React.RefObject<HTMLDivElement | null> }>({})
  const confettiRef = useRef<any>(null)

  // Fetch training statistics
  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const data = await getTrainingStats()
      setStats(data)
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
      const response = await fetch('/api/trained-files')
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
    // Ask for admin password
    const password = prompt('⚠️ Security Check\n\nEnter admin password to delete this file:')

    if (!password) {
      return // User cancelled
    }

    const toastId = toast.loading(`Verifying password...`, {
      description: 'Please wait',
    })

    // Verify password first
    try {
      const isValid = await verifyAdminPassword(password)

      if (!isValid) {
        toast.error('Access Denied', {
          id: toastId,
          description: 'Invalid admin password. Deletion cancelled.',
        })
        return
      }
    } catch (error) {
      toast.error('Verification Failed', {
        id: toastId,
        description: 'Could not verify password. Please try again.',
      })
      return
    }

    // Update toast to show deletion progress
    toast.loading(`Deleting ${filename}...`, {
      id: toastId,
      description: 'Removing training data from AI memory',
    })

    setDeletingFile(filename)
    try {
      await deleteTrainingFile(filename)

      // Refresh both stats and file list
      await Promise.all([fetchStats(), fetchTrainedFiles()])

      // Update toast to success
      toast.success(`Deleted ${filename}`, {
        id: toastId,
        description: `Successfully removed training data from AI memory`,
      })

      // Remove from selected files if it was selected
      setSelectedFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(filename)
        return newSet
      })
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

    // Ask for admin password once for bulk deletion
    const password = prompt('⚠️ Security Check\n\nEnter admin password to delete selected files:')

    if (!password) {
      return // User cancelled
    }

    const toastId = toast.loading(`Verifying password...`, {
      description: 'Please wait',
    })

    // Verify password first
    try {
      const isValid = await verifyAdminPassword(password)

      if (!isValid) {
        toast.error('Access Denied', {
          id: toastId,
          description: 'Invalid admin password. Deletion cancelled.',
        })
        return
      }

      // Close verification toast
      toast.dismiss(toastId)
    } catch (error) {
      toast.error('Verification Failed', {
        id: toastId,
        description: 'Could not verify password. Please try again.',
      })
      return
    }

    // Delete each file with its own toast (skip password prompt since already verified)
    const filesToDelete = Array.from(selectedFiles)

    for (const filename of filesToDelete) {
      const deleteToastId = toast.loading(`Deleting ${filename}...`, {
        description: 'Removing training data from AI memory',
      })

      setDeletingFile(filename)
      try {
        await deleteTrainingFile(filename)

        // Refresh stats
        await Promise.all([fetchStats(), fetchTrainedFiles()])

        toast.success(`Deleted ${filename}`, {
          id: deleteToastId,
          description: `Successfully removed training data`,
        })
      } catch (error) {
        toast.error(`Failed to delete ${filename}`, {
          id: deleteToastId,
          description: 'An error occurred',
        })
      } finally {
        setDeletingFile(null)
      }
    }

    // Clear selection after all deletions
    setSelectedFiles(new Set())
  }, [selectedFiles, fetchStats, fetchTrainedFiles])

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
    // Ask for admin password
    const password = prompt('🔒 Security Check\n\nEnter admin password to view this file:')

    if (!password) {
      return // User cancelled
    }

    const toastId = toast.loading('Verifying password...', {
      description: 'Please wait',
    })

    // Verify password first
    try {
      const isValid = await verifyAdminPassword(password)

      if (!isValid) {
        toast.error('Access Denied', {
          id: toastId,
          description: 'Invalid admin password. Access cancelled.',
        })
        return
      }

      // Close verification toast
      toast.dismiss(toastId)
    } catch (error) {
      toast.error('Verification Failed', {
        id: toastId,
        description: 'Could not verify password. Please try again.',
      })
      return
    }

    setLoadingView(true)
    try {
      const data = await viewFileContent(filename)

      setViewingFile({
        filename: filename,
        content: data.content,
        metadata: {},
      })

      toast.success('File Loaded', {
        description: `Viewing ${filename}`,
      })
    } catch (error) {
      console.error('Failed to view file:', error)
      toast.error('Failed to Load File', {
        description: 'Could not load file content. Please try again.',
      })
    } finally {
      setLoadingView(false)
    }
  }, [])

  // Download file content
  const handleDownloadFile = useCallback(async (filename: string) => {
    // Ask for admin password
    const password = prompt('🔒 Security Check\n\nEnter admin password to download this file:')

    if (!password) {
      return // User cancelled
    }

    const toastId = toast.loading('Verifying password...', {
      description: 'Please wait',
    })

    // Verify password first
    try {
      const isValid = await verifyAdminPassword(password)

      if (!isValid) {
        toast.error('Access Denied', {
          id: toastId,
          description: 'Invalid admin password. Download cancelled.',
        })
        return
      }

      // Update toast to show download progress
      toast.loading(`Downloading ${filename}...`, {
        id: toastId,
        description: 'Preparing file for download',
      })
    } catch (error) {
      toast.error('Verification Failed', {
        id: toastId,
        description: 'Could not verify password. Please try again.',
      })
      return
    }

    try {
      const blob = await downloadFile(filename)
      triggerFileDownload(blob, filename)

      toast.success('Download Started', {
        id: toastId,
        description: `${filename} is being downloaded`,
      })
    } catch (error) {
      console.error('Failed to download file:', error)
      toast.error('Download Failed', {
        id: toastId,
        description: 'Could not download file. Please try again.',
      })
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    fetchStats()
    fetchTrainedFiles()
  }, [fetchStats, fetchTrainedFiles])

  // Debounced refresh after successful upload (wait 1 second after last change)
  useEffect(() => {
    if (uploadStatus.status === 'success') {
      const debounceTimer = setTimeout(() => {
        console.log('[TrainingTab] Refreshing stats after upload completion')
        fetchStats()
        fetchTrainedFiles()
      }, 1000) // Wait 1 second after the last upload success

      return () => clearTimeout(debounceTimer)
    }
  }, [uploadStatus.status, fetchStats, fetchTrainedFiles])

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
    const initialActiveFiles = pdfFiles.map(f => ({
      id: Math.random().toString(36).substring(7),
      name: f.name,
      status: 'pending' as const
    }))
    setActiveFiles(initialActiveFiles)

    // Initialize refs for each file
    initialActiveFiles.forEach(af => {
      fileRefs.current[af.id] = { current: null }
    })

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i]
      const activeFile = initialActiveFiles[i]

      // Update active file status
      setActiveFiles(prev => prev.map(af =>
        af.id === activeFile.id ? { ...af, status: 'processing' } : af
      ))

      setUploadStatus({
        status: 'uploading',
        message: `Processing ${i + 1} of ${pdfFiles.length}: ${file.name}...`,
        filename: file.name,
      })

      try {
        const data = await trainWithFile(file, chunkStrategy)

        // Check if it was a partial upload (timeout)
        if (data.partial) {
          setActiveFiles(prev => prev.map(af =>
            af.id === activeFile.id ? { ...af, status: 'error' } : af
          ))
          setUploadStatus({
            status: 'success',
            message: `⚠️ Partial upload for ${file.name}: Processed ${data.processed}/${data.total} chunks (timeout limit reached). Re-upload the same file to process remaining ${data.remaining} chunks.`,
            chunks: data.chunks,
          })

          // Show toast notification for partial upload
          toast.warning('Partial Upload Completed', {
            description: `${file.name} is too large. Processed ${data.processed}/${data.total} chunks. Please re-upload to continue.`,
            duration: 10000,
          })
        } else {
          successCount++
          setActiveFiles(prev => prev.map(af =>
            af.id === activeFile.id ? { ...af, status: 'completed' } : af
          ))

          // Show success toast with processing details
          toast.success('File Trained Successfully', {
            description: `${file.name}: ${data.chunks} chunks processed in ${Math.round((data.processingTime || 0) / 1000)}s`,
          })
        }

        // Fetch stats and file list after each file
        await Promise.all([fetchStats(), fetchTrainedFiles()])
      } catch (error: any) {
        errorCount++
        setActiveFiles(prev => prev.map(af =>
          af.id === activeFile.id ? { ...af, status: 'error' } : af
        ))
        errors.push(`${file.name}: ${error.message || 'Failed to process'}`)
        console.error(`Error processing ${file.name}:`, error)

        // Show error toast
        toast.error('Training Failed', {
          description: `${file.name}: ${error.message || 'Unknown error'}`,
        })
      }
    }

    // Remove beforeunload listener after processing
    window.removeEventListener('beforeunload', handleBeforeUnload)

    // Set final status
    if (successCount === pdfFiles.length) {
      confettiRef.current?.fire()
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
  }, [fetchStats, setUploadStatus, chunkStrategy, fetchTrainedFiles])

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
    setActiveFiles([])
    fileRefs.current = {}
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
          {/* Chunking Strategy Selector */}
          <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-white/10">
            <label className="block text-sm font-medium text-white mb-3">
              Text Extraction Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setChunkStrategy('word')}
                disabled={uploadStatus.status === 'uploading'}
                className={`p-3 rounded-lg border-2 transition-all text-left ${chunkStrategy === 'word'
                    ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50'
                    : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                  } ${uploadStatus.status === 'uploading' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="font-medium text-white text-sm">Word by Word</div>
                <div className="text-xs text-white/60 mt-1">
                  Extract individual words from the text
                </div>
              </button>

              <button
                type="button"
                onClick={() => setChunkStrategy('sentence')}
                disabled={uploadStatus.status === 'uploading'}
                className={`p-3 rounded-lg border-2 transition-all text-left ${chunkStrategy === 'sentence'
                    ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50'
                    : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                  } ${uploadStatus.status === 'uploading' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="font-medium text-white text-sm">Sentence by Sentence</div>
                <div className="text-xs text-white/60 mt-1">
                  Extract complete sentences (., !, ?)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setChunkStrategy('smart')}
                disabled={uploadStatus.status === 'uploading'}
                className={`p-3 rounded-lg border-2 transition-all text-left ${chunkStrategy === 'smart'
                    ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50'
                    : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                  } ${uploadStatus.status === 'uploading' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="font-medium text-white text-sm">Smart Mode ⭐</div>
                <div className="text-xs text-white/60 mt-1">
                  Words + phrases + sentences (recommended)
                </div>
              </button>
            </div>
          </div>

          <div
            {...getRootProps()}
            className={`
              relative rounded-lg border-2 border-dashed p-6 sm:p-12 text-center transition-all min-h-[400px] flex flex-col items-center justify-center overflow-hidden
              ${isDragActive
                ? 'border-primary bg-primary/10'
                : 'border-white/20 hover:border-white/40 hover:bg-white/5'
              }
              ${uploadStatus.status === 'uploading' ? 'pointer-events-none' : 'cursor-pointer'}
            `}
          >
            <Confetti ref={confettiRef} manualstart />
            <Particles className="absolute inset-0 z-0" refresh={uploadStatus.status === 'uploading'} />

            {uploadStatus.status === 'uploading' && <Meteors number={15} />}

            <input {...getInputProps()} />

            {uploadStatus.status === 'idle' && (
              <div className="space-y-3 sm:space-y-4 z-10">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 glass-morphism animate-float">
                    <Upload className="h-10 w-10 sm:h-12 sm:w-12 text-blue-400" />
                  </div>
                </div>
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
              <div ref={containerRef} className="relative w-full h-full min-h-[300px] flex items-center justify-center z-10">
                {/* Central AI Brain Node */}
                <div
                  ref={brainRef}
                  className="z-20 relative flex h-24 w-24 sm:h-32 sm:w-32 items-center justify-center rounded-full border-2 border-primary/50 bg-black glass-morphism shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)]"
                >
                  <div className="absolute inset-0 rounded-full animate-pulse bg-primary/10" />
                  <Image src="/icon.png" alt="AI Brain" width={64} height={64} className="relative z-30 h-12 w-12 sm:h-16 sm:w-16 animate-pulse" />
                </div>

                {/* Dynamical File Nodes */}
                <div className="absolute inset-0 flex items-center justify-around pointer-events-none">
                  {/* Left Side Files */}
                  <div className="flex flex-col gap-8 items-start ml-2 sm:ml-8">
                    {activeFiles.filter((_, i) => i % 2 === 0).map((af) => (
                      <div
                        key={af.id}
                        ref={(el) => { if (el) fileRefs.current[af.id] = { current: el } as any }}
                        className={`flex flex-col items-center gap-2 transition-all duration-500 scale-90 sm:scale-100 ${af.status === 'completed' ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'
                          }`}
                      >
                        <div className={`p-3 rounded-xl border border-white/10 glass-morphism shadow-xl relative ${af.status === 'processing' ? 'border-blue-500/50 scale-110' : ''
                          }`}>
                          {af.status === 'processing' && <div className="absolute inset-0 rounded-xl animate-ping border border-blue-500/30" />}
                          <FileIcon className={`h-6 w-6 sm:h-8 sm:w-8 ${af.status === 'processing' ? 'text-blue-400 animate-pulse' :
                              af.status === 'completed' ? 'text-emerald-400' :
                                af.status === 'error' ? 'text-red-400' : 'text-white/60'
                            }`} />
                        </div>
                        <span className="text-[10px] sm:text-xs text-white/50 max-w-[80px] truncate">{af.name}</span>

                        {af.status === 'processing' && (
                          <AnimatedBeam
                            containerRef={containerRef}
                            fromRef={fileRefs.current[af.id]}
                            toRef={brainRef}
                            pathColor="#3b82f6"
                            pathWidth={3}
                            gradientStartColor="#3b82f6"
                            gradientStopColor="#8b5cf6"
                            curvature={20}
                            duration={2}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Right Side Files */}
                  <div className="flex flex-col gap-8 items-end mr-2 sm:mr-8">
                    {activeFiles.filter((_, i) => i % 2 !== 0).map((af) => (
                      <div
                        key={af.id}
                        ref={(el) => { if (el) fileRefs.current[af.id] = { current: el } as any }}
                        className={`flex flex-col items-center gap-2 transition-all duration-500 scale-90 sm:scale-100 ${af.status === 'completed' ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'
                          }`}
                      >
                        <div className={`p-3 rounded-xl border border-white/10 glass-morphism shadow-xl relative ${af.status === 'processing' ? 'border-blue-500/50 scale-110' : ''
                          }`}>
                          {af.status === 'processing' && <div className="absolute inset-0 rounded-xl animate-ping border border-blue-500/30" />}
                          <FileIcon className={`h-6 w-6 sm:h-8 sm:w-8 ${af.status === 'processing' ? 'text-blue-400 animate-pulse' :
                              af.status === 'completed' ? 'text-emerald-400' :
                                af.status === 'error' ? 'text-red-400' : 'text-white/60'
                            }`} />
                        </div>
                        <span className="text-[10px] sm:text-xs text-white/50 max-w-[80px] truncate">{af.name}</span>

                        {af.status === 'processing' && (
                          <AnimatedBeam
                            containerRef={containerRef}
                            fromRef={fileRefs.current[af.id]}
                            toRef={brainRef}
                            reverse
                            pathColor="#3b82f6"
                            pathWidth={3}
                            gradientStartColor="#8b5cf6"
                            gradientStopColor="#3b82f6"
                            curvature={-20}
                            duration={2}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <p className="text-xs sm:text-sm font-medium text-white/70 italic">{uploadStatus.message}</p>
                  </div>
                </div>
              </div>
            )}

            {uploadStatus.status === 'success' && (
              <div className="space-y-4 z-10">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full" />
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24 bg-white/5 rounded-2xl flex items-center justify-center border border-green-500/20 glass-morphism">
                    <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-green-500" />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-medium text-green-500">Training Complete!</p>
                  <p className="mt-2 text-sm text-muted-foreground">{uploadStatus.message}</p>
                  {uploadStatus.chunks && (
                    <div className="mt-3 px-4 py-1 rounded-full bg-primary/10 border border-primary/20 inline-block">
                      <p className="text-xs font-semibold text-primary">
                        {uploadStatus.chunks} Document{uploadStatus.chunks !== 1 ? 's' : ''} Synced
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 justify-center">
                  <ShimmerButton
                    onClick={resetUpload}
                    className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                  >
                    Train More Data
                  </ShimmerButton>
                </div>
              </div>
            )}

            {uploadStatus.status === 'error' && (
              <div className="space-y-4 z-10">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full" />
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24 bg-white/5 rounded-2xl flex items-center justify-center border border-red-500/20 glass-morphism">
                    <XCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500" />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-medium text-red-500">Training Failed</p>
                  <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">{uploadStatus.message}</p>
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
