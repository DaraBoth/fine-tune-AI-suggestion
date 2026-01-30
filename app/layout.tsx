import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TypeFlow AI - Intelligent Autocomplete with RAG",
  description: "AI-powered autocomplete featuring RAG architecture, real-time analytics, and stunning Magic UI components. Train with PDFs and experience smart word completion and phrase suggestions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
        <Toaster richColors position="bottom-right" expand={true} />
      </body>
    </html>
  );
}
