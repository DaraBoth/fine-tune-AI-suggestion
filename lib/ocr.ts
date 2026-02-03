/**
 * OCR Service for extracting text from images in PDFs
 * Supports multiple OCR providers:
 * - Tesseract.js: Local, free, good accuracy
 * - Gemini Vision: Cloud, free (15 RPM), excellent accuracy
 * - OpenAI Vision: Cloud, paid, excellent accuracy
 */

import Tesseract from 'tesseract.js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { getOCRProvider, type OCRProvider } from './ocr-provider'

// Initialize Gemini client for vision
const geminiKey = process.env.GEMINI_API_KEY
let geminiClient: GoogleGenerativeAI | null = null
if (geminiKey) {
  geminiClient = new GoogleGenerativeAI(geminiKey)
}

// Initialize OpenAI client for vision
const openaiKey = process.env.OPENAI_API_KEY
let openaiClient: OpenAI | null = null
if (openaiKey) {
  openaiClient = new OpenAI({ apiKey: openaiKey })
}

/**
 * Extract text from an image buffer using OCR
 */
export async function extractTextFromImage(imageBuffer: Buffer | Uint8Array, provider?: OCRProvider): Promise<string> {
  const ocrProvider = provider || getOCRProvider()
  
  console.log(`[OCR] Using provider: ${ocrProvider}`)
  
  try {
    switch (ocrProvider) {
      case 'gemini':
        return await extractTextWithGeminiVision(imageBuffer)
      case 'openai':
        return await extractTextWithOpenAIVision(imageBuffer)
      case 'tesseract':
      default:
        return await extractTextWithTesseract(imageBuffer)
    }
  } catch (error) {
    console.error(`[OCR] Error with ${ocrProvider}:`, error)
    
    // Fallback to Tesseract if cloud provider fails
    if (ocrProvider !== 'tesseract') {
      console.log('[OCR] Falling back to Tesseract.js')
      return await extractTextWithTesseract(imageBuffer)
    }
    
    return ''
  }
}

/**
 * Extract text using Tesseract.js (local processing)
 */
async function extractTextWithTesseract(imageBuffer: Buffer | Uint8Array): Promise<string> {
  try {
    console.log('[OCR] Starting Tesseract text recognition...')
    
    // Convert to Buffer if Uint8Array
    const buffer = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer)
    
    const { data: { text } } = await Tesseract.recognize(
      buffer,
      'eng', // English language
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`[OCR] Tesseract progress: ${Math.round(m.progress * 100)}%`)
          }
        }
      }
    )
    
    const cleanedText = text.trim()
    console.log(`[OCR] Tesseract extracted ${cleanedText.length} characters`)
    
    return cleanedText
  } catch (error) {
    console.error('[OCR] Tesseract error:', error)
    return ''
  }
}

/**
 * Extract text using Gemini Vision API (FREE tier: 15 RPM)
 */
async function extractTextWithGeminiVision(imageBuffer: Buffer | Uint8Array): Promise<string> {
  if (!geminiClient) {
    throw new Error('Gemini API key not configured')
  }
  
  try {
    console.log('[OCR] Starting Gemini Vision text extraction...')
    
    // Convert buffer to base64
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    
    // Use gemini-1.5-flash for vision (FREE tier)
    const model = geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' })
    
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/png', // Assume PNG, works for most formats
          data: base64Image
        }
      },
      'Extract all text from this image. Return only the text content, no descriptions or explanations.'
    ])
    
    const response = result.response
    const text = response.text().trim()
    
    console.log(`[OCR] Gemini Vision extracted ${text.length} characters`)
    
    return text
  } catch (error) {
    console.error('[OCR] Gemini Vision error:', error)
    throw error
  }
}

/**
 * Extract text using OpenAI Vision API (gpt-4-vision-preview)
 */
async function extractTextWithOpenAIVision(imageBuffer: Buffer | Uint8Array): Promise<string> {
  if (!openaiClient) {
    throw new Error('OpenAI API key not configured')
  }
  
  try {
    console.log('[OCR] Starting OpenAI Vision text extraction...')
    
    // Convert buffer to base64
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini', // Cheaper vision model
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text from this image. Return only the text content, no descriptions or explanations.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
    })
    
    const text = response.choices[0]?.message?.content?.trim() || ''
    
    console.log(`[OCR] OpenAI Vision extracted ${text.length} characters`)
    
    return text
  } catch (error) {
    console.error('[OCR] OpenAI Vision error:', error)
    throw error
  }
}

export interface OCRResult {
  text: string
  imagesProcessed: number
  charactersExtracted: number
  provider: OCRProvider
}

/**
 * Extract images from PDF pages and perform OCR on each
 * Note: This is a simplified implementation. For full PDF image extraction,
 * consider using a dedicated PDF processing service or library.
 */
export async function extractTextFromPDFImages(pdfBuffer: Buffer): Promise<OCRResult> {
  const ocrProvider = getOCRProvider()

  console.log('[OCR] PDF image extraction is currently simplified')
  console.log(`[OCR] OCR provider configured: ${ocrProvider}`)

  // For now, return empty result as full PDF image extraction
  // requires complex PDF parsing that may have DOM dependencies
  // TODO: Implement proper PDF image extraction in future versions
  console.log('[OCR] Skipping PDF image extraction (simplified implementation)')

  return {
    text: '',
    imagesProcessed: 0,
    charactersExtracted: 0,
    provider: ocrProvider
  }

  // Original implementation (commented out due to DOM dependencies):
  /*
  try {
    console.log('[OCR] Loading PDF document...')
    console.log(`[OCR] Using OCR provider: ${ocrProvider}`)

    // Get pdf.js library dynamically
    const pdfjs = await getPdfJsLib()
    if (!pdfjs) {
      throw new Error('Failed to load PDF.js library')
    }

    // Load the PDF document
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
    })

    const pdfDocument = await loadingTask.promise
    const numPages = pdfDocument.numPages

    console.log(`[OCR] PDF has ${numPages} pages`)

    let allOcrText = ''
    let totalImagesProcessed = 0

    // Process each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      console.log(`[OCR] Processing page ${pageNum}/${numPages}...`)

      try {
        const page = await pdfDocument.getPage(pageNum)
        const operatorList = await page.getOperatorList()

        let pageImageCount = 0

        // Look through all operations for images
        for (let i = 0; i < operatorList.fnArray.length; i++) {
          const op = operatorList.fnArray[i]

          // Check if this operation is painting an image
          // OPS.paintImageXObject = 85, OPS.paintInlineImageXObject = 86
          if (op === 85 || op === 86) {
            try {
              const imageName = operatorList.argsArray[i][0]

              // Get image from page resources
              const images = await page.objs.get(imageName)

              if (images && images.data) {
                pageImageCount++
                totalImagesProcessed++

                console.log(`[OCR] Found image ${pageImageCount} on page ${pageNum}`)

                // Convert image data to buffer
                const imageBuffer = Buffer.from(images.data)

                // Perform OCR
                const ocrText = await extractTextFromImage(imageBuffer)

                if (ocrText && ocrText.length > 10) { // Only include if meaningful text found
                  allOcrText += `\n\n[Image ${totalImagesProcessed} - Page ${pageNum}]\n${ocrText}`
                  console.log(`[OCR] Extracted ${ocrText.length} characters from image`)
                } else {
                  console.log(`[OCR] No significant text found in image`)
                }
              }

            } catch (imageError) {
              console.error(`[OCR] Error processing image:`, imageError)
              // Continue with next image
            }
          }
        }

        if (pageImageCount === 0) {
          console.log(`[OCR] No images found on page ${pageNum}`)
        }

      } catch (pageError) {
        console.error(`[OCR] Error processing page ${pageNum}:`, pageError)
        // Continue with next page
      }
    }

    console.log(`[OCR] Completed! Processed ${totalImagesProcessed} images total`)
    console.log(`[OCR] Total OCR text extracted: ${allOcrText.length} characters`)

    return {
      text: allOcrText.trim(),
      imagesProcessed: totalImagesProcessed,
      charactersExtracted: allOcrText.length,
      provider: ocrProvider
    }

  } catch (error) {
    console.error('[OCR] Fatal error extracting images from PDF:', error)
    return {
      text: '',
      imagesProcessed: 0,
      charactersExtracted: 0,
      provider: getOCRProvider()
    }
  }
  */
}
