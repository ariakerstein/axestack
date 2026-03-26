import { NextRequest, NextResponse } from 'next/server'

// Force Node.js runtime (not Edge) for pdf-parse compatibility
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let buffer: Buffer

    // Handle JSON request with blob URL
    if (contentType.includes('application/json')) {
      const { url } = await request.json()
      if (!url) {
        return NextResponse.json(
          { error: 'No URL provided' },
          { status: 400 }
        )
      }

      // Fetch PDF from Vercel Blob
      const response = await fetch(url)
      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch PDF from storage' },
          { status: 400 }
        )
      }
      const bytes = await response.arrayBuffer()
      buffer = Buffer.from(bytes)
    }
    // Handle direct file upload (for small files < 4.5MB)
    else {
      const formData = await request.formData()
      const file = formData.get('file') as File

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        )
      }

      if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
        return NextResponse.json(
          { error: 'File must be a PDF' },
          { status: 400 }
        )
      }

      const bytes = await file.arrayBuffer()
      buffer = Buffer.from(bytes)
    }

    // Parse PDF
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
