import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'),
  title: {
    default: "TypeFlow AI - Intelligent Autocomplete with RAG",
    template: "%s | TypeFlow AI"
  },
  description: "AI-powered autocomplete featuring RAG architecture, real-time analytics, and stunning Magic UI components. Train with PDFs and experience smart word completion and phrase suggestions powered by OpenAI and Google Gemini.",
  keywords: [
    "AI autocomplete",
    "RAG architecture",
    "intelligent suggestions",
    "PDF training",
    "OpenAI integration",
    "Google Gemini",
    "machine learning",
    "natural language processing",
    "text completion",
    "AI assistant",
    "document analysis",
    "semantic search",
    "vector database",
    "embeddings"
  ],
  authors: [{ name: "TypeFlow AI Team" }],
  creator: "TypeFlow AI",
  publisher: "TypeFlow AI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "any" },
      { url: "/icon.png", sizes: "16x16", type: "image/png" },
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/icon.png", sizes: "180x180" },
    ],
    shortcut: "/icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "TypeFlow AI - Intelligent Autocomplete with RAG",
    description: "AI-powered autocomplete featuring RAG architecture, real-time analytics, and stunning Magic UI components. Train with PDFs and experience smart word completion and phrase suggestions.",
    siteName: "TypeFlow AI",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TypeFlow AI - Intelligent Autocomplete",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TypeFlow AI - Intelligent Autocomplete with RAG",
    description: "AI-powered autocomplete featuring RAG architecture, real-time analytics, and stunning Magic UI components.",
    images: ["/og-image.png"],
    creator: "@typeflowai",
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "your-google-site-verification-code",
    yandex: "your-yandex-verification-code",
    other: {
      "msvalidate.01": "your-bing-verification-code",
    },
  },
  alternates: {
    canonical: "/",
  },
  category: "AI Tools",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "TypeFlow AI",
    "description": "AI-powered autocomplete featuring RAG architecture, real-time analytics, and stunning Magic UI components",
    "url": baseUrl,
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "AI-powered autocomplete",
      "RAG architecture",
      "PDF document training",
      "Real-time analytics",
      "OCR text extraction",
      "Multi-provider AI support",
      "Vector database search"
    ],
    "author": {
      "@type": "Organization",
      "name": "TypeFlow AI Team"
    },
    "publisher": {
      "@type": "Organization",
      "name": "TypeFlow AI"
    },
    "datePublished": "2024-01-01",
    "dateModified": new Date().toISOString().split('T')[0],
    "inLanguage": "en-US",
    "isAccessibleForFree": true,
    "screenshot": `${baseUrl}/screenshot-wide.png`,
    "softwareVersion": "1.0.0"
  }

  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        <link rel="canonical" href={baseUrl} />
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster richColors position="bottom-right" expand={true} />
      </body>
    </html>
  );
}
