import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase credentials not configured')
  }
  return createClient(url, key)
}

interface IngestUrlRequest {
  url: string
  title: string
  source: string
  tier: 'tier_1' | 'tier_2' | 'tier_3'
  cancerType: string | null
}

/**
 * Extract text content from HTML
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

  // Remove HTML tags but preserve structure with newlines
  text = text.replace(/<(p|div|br|h[1-6]|li|tr)[^>]*>/gi, '\n')
  text = text.replace(/<[^>]+>/g, ' ')

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ')
  text = text.replace(/\n\s*\n/g, '\n\n')

  return text.trim()
}

/**
 * Chunk text into optimal sizes for RAG
 */
function chunkText(
  text: string,
  chunkSize: number = 800,
  overlapSize: number = 100
): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []

  for (let i = 0; i < words.length; i += chunkSize - overlapSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ')
    if (chunk.trim().length > 50) {
      chunks.push(chunk)
    }
  }

  return chunks
}

/**
 * Generate embedding for text using OpenAI API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} ${error}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const body: IngestUrlRequest = await request.json()
    const { url, title, source, tier, cancerType } = body

    if (!url || !title) {
      return NextResponse.json(
        { error: 'URL and title are required' },
        { status: 400 }
      )
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Fetch the URL content
    console.log(`[ingest-url] Fetching: ${url}`)
    const fetchResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OpenCancer/1.0; +https://opencancer.ai)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    if (!fetchResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${fetchResponse.status} ${fetchResponse.statusText}` },
        { status: 400 }
      )
    }

    const contentType = fetchResponse.headers.get('content-type') || ''
    const html = await fetchResponse.text()

    // Extract text content
    let textContent: string
    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      textContent = extractTextFromHtml(html)
    } else if (contentType.includes('text/plain')) {
      textContent = html
    } else {
      // Try to extract anyway
      textContent = extractTextFromHtml(html)
    }

    if (textContent.length < 100) {
      return NextResponse.json(
        { error: 'Extracted content is too short. The page may require JavaScript or login.' },
        { status: 400 }
      )
    }

    console.log(`[ingest-url] Extracted ${textContent.length} chars from ${url}`)

    // Chunk the content
    const chunks = chunkText(textContent)
    console.log(`[ingest-url] Created ${chunks.length} chunks`)

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'Could not create any chunks from the content' },
        { status: 400 }
      )
    }

    // Generate embeddings and insert chunks
    const batchSize = 10
    let inserted = 0
    const errors: string[] = []

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)

      // Generate embeddings for batch
      const embeddings = await Promise.all(
        batch.map(chunk => generateEmbedding(chunk))
      )

      // Prepare records
      const records = batch.map((chunk, idx) => ({
        chunk_text: chunk,
        guideline_source: source,
        guideline_title: title,
        cancer_type: cancerType || null,
        content_tier: tier,
        content_type: 'web_article',
        status: 'active',
        source_url: url,
        embedding: embeddings[idx],
        word_count: chunk.split(/\s+/).length,
        metadata: {
          chunk_index: i + idx,
          total_chunks: chunks.length,
          ingested_at: new Date().toISOString(),
          ingestion_method: 'url_fetch',
          domain: parsedUrl.hostname,
        }
      }))

      // Insert batch
      const { error } = await supabase
        .from('guideline_chunks')
        .insert(records)

      if (error) {
        console.error(`[ingest-url] Error inserting batch ${i}-${i + batch.length}:`, error)
        errors.push(`Batch ${i}: ${error.message}`)
      } else {
        inserted += batch.length
        console.log(`[ingest-url] Inserted chunks ${i}-${i + batch.length}`)
      }
    }

    if (inserted === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: `Failed to insert chunks: ${errors[0]}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      chunksCreated: inserted,
      totalChunks: chunks.length,
      contentLength: textContent.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('[ingest-url] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}
