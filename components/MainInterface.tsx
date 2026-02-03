'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ChatInput from '@/components/ChatInput'
import ChatInterface from '@/components/ChatInterface'
import TrainingTab from '@/components/TrainingTab'
import Image from 'next/image'
import { MessageSquare, BookOpen, MessagesSquare, Github, Coffee, Heart, Sparkles as SparklesIcon } from 'lucide-react'

export default function MainInterface() {
  return (
    <div className="container mx-auto max-w-4xl px-3 sm:px-4 py-6 sm:py-16 overflow-x-hidden">
      {/* Premium Header */}
      <div className="mb-12 sm:mb-20 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative inline-block mb-6 animate-float h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border border-white/20 shadow-2xl glass-morphism overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 via-purple-500 to-teal-500 blur-2xl opacity-20" />
          <Image
            src="/icon.png"
            alt="TypeFlow AI Logo"
            width={120}
            height={120}
            className="relative mx-auto h-full w-full object-cover"
          />
        </div>

        <h1 className="mb-4 text-3xl sm:text-6xl font-extrabold tracking-tight">
          <span className="text-white">TypeFlow</span>
          <span className="text-gradient"> AI</span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-xl text-white/50 px-2 leading-relaxed">
          The ultimate intelligent autocomplete experience.
          <span className="text-white/80"> Train, chat, and generate</span> with your custom data using advanced RAG architecture.
        </p>

        {/* Quick Links */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/docs"
            className="group flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-5 py-2.5 backdrop-blur-xl transition-all hover:border-blue-500/40 hover:bg-blue-500/20 hover:scale-105"
          >
            <BookOpen className="h-4 w-4 text-blue-400 transition-colors group-hover:text-blue-300" />
            <span className="text-sm font-medium text-blue-400 transition-colors group-hover:text-blue-300">
              API Docs
            </span>
          </a>

          <a
            href="https://github.com/DaraBoth/fine-tune-AI-suggestion"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/10 hover:scale-105"
          >
            <Github className="h-4 w-4 text-white/60 transition-colors group-hover:text-white" />
            <span className="text-sm font-medium text-white/60 transition-colors group-hover:text-white">
              GitHub
            </span>
          </a>

          <a
            href="https://buymeacoffee.com/daraboth"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-5 py-2.5 backdrop-blur-xl transition-all hover:border-yellow-500/40 hover:bg-yellow-500/20 hover:scale-105"
          >
            <Coffee className="h-4 w-4 text-yellow-400 transition-colors group-hover:text-yellow-300" />
            <span className="text-sm font-medium text-yellow-400 transition-colors group-hover:text-yellow-300">
              Support Project
            </span>
          </a>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="autocomplete" className="w-full">
        <TabsList className="mb-8 sm:mb-12 grid w-full grid-cols-3 p-1 glass-morphism">
          <TabsTrigger
            value="autocomplete"
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-md"
          >
            <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline text-white/70 group-data-[state=active]:text-white">Autocomplete</span>
            <span className="xs:hidden text-white/70 group-data-[state=active]:text-white">Auto</span>
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-md"
          >
            <MessagesSquare className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline text-white/70 group-data-[state=active]:text-white">AI Chat</span>
            <span className="xs:hidden text-white/70 group-data-[state=active]:text-white">Chat</span>
          </TabsTrigger>
          <TabsTrigger
            value="training"
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-md"
          >
            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline text-white/70 group-data-[state=active]:text-white">Training</span>
            <span className="xs:hidden text-white/70 group-data-[state=active]:text-white">Train</span>
          </TabsTrigger>
        </TabsList>

        {/* Autocomplete Tab */}
        <TabsContent value="autocomplete" className="focus-visible:outline-none">
          <ChatInput />
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="focus-visible:outline-none">
          <ChatInterface />
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="focus-visible:outline-none">
          <TrainingTab />
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="mt-12 sm:mt-24 text-center border-t border-white/5 pt-8 sm:pt-12">
        <div className="flex flex-col items-center gap-4 px-4">
          <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 text-xs sm:text-sm text-white/30">
            <span className="flex items-center gap-1.5">
              Built with <Heart className="h-3.5 w-3.5 fill-red-500/50 text-red-500/50" /> by
            </span>
            <a
              href="https://www.kosign.com.kh/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white/50 transition-colors hover:text-white whitespace-nowrap"
            >
              KOSIGN Global Biz Center
            </a>
            <span className="hidden sm:inline text-white/30 mx-1">•</span>
            <span className="text-white/40 text-xs">Open Source License by KOSIGN</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="hidden sm:block h-px w-8 bg-white/5" />
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/20 font-semibold px-2">
              TypeFlow AI v1.0.0 • Production Stable
            </p>
            <span className="hidden sm:block h-px w-8 bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  )
}
