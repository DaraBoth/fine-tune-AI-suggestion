import MainInterface from "@/components/MainInterface";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TypeFlow AI - Intelligent Autocomplete with RAG Technology",
  description: "Experience the future of writing with TypeFlow AI. Train our advanced AI with your documents and get intelligent autocomplete suggestions powered by RAG architecture, OpenAI, and Google Gemini.",
  keywords: [
    "AI writing assistant",
    "intelligent autocomplete",
    "RAG technology",
    "document training",
    "AI suggestions",
    "OpenAI integration",
    "Google Gemini",
    "text completion",
    "productivity tool",
    "machine learning"
  ],
  openGraph: {
    title: "TypeFlow AI - Intelligent Autocomplete with RAG",
    description: "Train AI with your documents and get smart autocomplete suggestions. Features RAG architecture, real-time analytics, and multi-provider AI support.",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TypeFlow AI Interface",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TypeFlow AI - Smart Autocomplete",
    description: "AI-powered writing assistant with RAG technology. Train with PDFs and get intelligent suggestions.",
    images: ["/og-image.png"],
  },
};

export default function Home() {
  return (
    <main className="min-h-screen">
      <MainInterface />
    </main>
  );
}
