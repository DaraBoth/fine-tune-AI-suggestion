'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

interface CodeBlockProps {
  code: string
  language?: string
  id: string
}

export function CodeBlock({ code, language = 'javascript', id }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 z-10">
        <Button
          size="sm"
          variant="ghost"
          onClick={copyToClipboard}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="bg-black/60 border border-white/10 rounded-lg p-4 overflow-x-auto">
        <pre className="text-sm text-white/90">
          <code className={`language-${language}`}>{code}</code>
        </pre>
      </div>
    </div>
  )
}
