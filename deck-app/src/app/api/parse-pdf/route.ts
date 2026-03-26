import { NextRequest, NextResponse } from 'next/server'

// Force Node.js runtime (not Edge) for pdf-parse compatibility
export const runtime = 'nodejs'

// For App Router, body size is configured via vercel.json or next.config.js
// Maximum supported is ~4.5MB on Vercel free tier

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check if it's a PDF
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      )
    }

    // Convert to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Parse PDF - dynamic import for better compatibility
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)

    return NextResponse.json({
      text: data.text,
      pages: data.numpages,
      info: data.info,
    })
  } catch (error) {
    console.error('PDF parse error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to parse PDF: ${message}` },
      { status: 500 }
    )
  }
}
