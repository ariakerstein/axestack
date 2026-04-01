import { NextRequest, NextResponse } from 'next/server'

// Use Navis Supabase for AI calls (reuse existing infrastructure)
const SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"

// Optimized system prompt
const SYSTEM_PROMPT = `You extract medical document information into structured JSON. Be concise and accurate.

SAFETY: Never interpret results clinically, make diagnoses, or give medical advice. Only extract what's stated.

Return ONLY valid JSON (no markdown, no code blocks) with this structure:
{
  "document_type": "Pathology Report|Lab Result|Doctor Note|Genomic Test|Imaging Report|Other",
  "patient_name": "name or unknown",
  "date_of_service": "date or unknown",
  "provider_name": "doctor name or unknown",
  "institution": "hospital/clinic or unknown",
  "diagnosis": ["primary diagnosis", "secondary conditions"],
  "test_summary": "2-3 sentence plain English summary at 8th grade reading level - NO JSON here, just a readable paragraph",
  "questions_to_ask_doctor": "2-3 specific questions to ask",
  "recommended_next_steps": ["actions mentioned in document"],
  "cancer_specific": {
    "cancer_type": "type or unknown",
    "stage": "stage or unknown",
    "grade": "grade or unknown",
    "biomarkers": ["biomarkers tested"],
    "treatment_timeline": "phase or unknown"
  },
  "lab_values": {
    "key_results": [{"test": "name", "value": "result", "reference_range": "range", "status": "Normal|Abnormal|Critical"}]
  },
  "technical_terms_explained": [{"term": "medical term", "definition": "simple explanation"}],
  "processing_metadata": {"confidence_level": "High|Moderate|Low", "completeness": "Complete|Partial|Limited"}
}`

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name
    const fileType = file.type
    const fileSize = file.size

    // Check file size (limit to 20MB)
    const MAX_SIZE = 20 * 1024 * 1024
    if (fileSize > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Please upload files under 20MB.' },
        { status: 400 }
      )
    }

    console.log(`Processing file: ${fileName}, type: ${fileType}, size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`)

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Data = buffer.toString('base64')

    const isPDF = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')
    const isImage = fileType.startsWith('image/')
    // Expanded text file detection - handle various text formats users might upload
    const lowerFileName = fileName.toLowerCase()
    const isText = fileType === 'text/plain' ||
      fileType === 'text/csv' ||
      fileType === 'text/markdown' ||
      lowerFileName.endsWith('.txt') ||
      lowerFileName.endsWith('.md') ||
      lowerFileName.endsWith('.csv')
    const isWord = fileType === 'application/msword' ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      lowerFileName.endsWith('.doc') ||
      lowerFileName.endsWith('.docx')

    // Validate supported file types
    if (!isPDF && !isImage && !isText && !isWord) {
      console.log(`Unsupported file type: ${fileName}, type: ${fileType}`)
      return NextResponse.json(
        { error: `Unsupported file type: ${fileType || 'unknown'}. Please upload PDF, Word (.doc/.docx), image, or text files.` },
        { status: 400 }
      )
    }

    let documentText = ''
    let mediaType = fileType

    // For text files, extract content directly
    if (isText) {
      documentText = buffer.toString('utf-8')
      console.log(`Text file detected: ${fileName}, extracted ${documentText.length} characters`)
    }

    // Determine media type for Claude
    if (isPDF) {
      mediaType = 'application/pdf'
    } else if (isWord) {
      // Word documents - use proper MIME type for Claude's document understanding
      mediaType = fileName.toLowerCase().endsWith('.docx') ||
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/msword'
      console.log(`Word document detected: ${fileName}, using media type: ${mediaType}`)
    } else if (isImage) {
      // Keep the original image type
      mediaType = fileType
    }

    // Call Navis Supabase edge function (reuses existing Claude API key)
    const response = await fetch(`${SUPABASE_URL}/functions/v1/axestack-translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        base64Data: isText ? undefined : base64Data,
        mediaType,
        isText,
        documentText: isText ? documentText : undefined
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Supabase edge function error:', errorText)
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to process document')
    }

    const aiResponse = data.response || ''

    // Parse JSON from response
    let analysis
    try {
      let cleanedResponse = aiResponse.trim()
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.slice(7)
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3)
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(0, -3)
      }
      cleanedResponse = cleanedResponse.trim()

      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }

      // Validate test_summary isn't JSON
      if (analysis.test_summary && (
        analysis.test_summary.includes('"document_type"') ||
        analysis.test_summary.startsWith('{') ||
        analysis.test_summary.startsWith('```')
      )) {
        const diagnoses = analysis.diagnosis?.filter((d: string) => d && d !== 'unknown') || []
        if (diagnoses.length > 0) {
          analysis.test_summary = `This ${analysis.document_type?.toLowerCase() || 'medical document'} contains information about ${diagnoses.slice(0, 2).join(' and ')}. Please review the details below and discuss with your healthcare provider.`
        } else {
          analysis.test_summary = `This is a ${analysis.document_type?.toLowerCase() || 'medical document'}. Review the extracted information below and discuss any questions with your healthcare provider.`
        }
      }
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError)
      analysis = {
        document_type: 'Other',
        patient_name: 'unknown',
        date_of_service: 'unknown',
        provider_name: 'unknown',
        institution: 'unknown',
        diagnosis: [],
        test_summary: 'We were unable to fully parse this document. Please try uploading a clearer version or a different format.',
        questions_to_ask_doctor: 'Please discuss this document with your healthcare provider.',
        recommended_next_steps: ['Review with healthcare provider'],
        cancer_specific: { cancer_type: 'unknown', stage: 'unknown', grade: 'unknown', biomarkers: [], treatment_timeline: 'unknown' },
        lab_values: { key_results: [] },
        technical_terms_explained: [],
        processing_metadata: { confidence_level: 'Low', completeness: 'Limited' }
      }
    }

    // Determine document type label for response
    const docTypeLabel = isPDF ? 'PDF' : isWord ? 'Word document' : isImage ? 'Image' : 'Document'

    return NextResponse.json({
      success: true,
      fileName,
      fileType,
      analysis,
      documentText: documentText || `[${docTypeLabel} content analyzed by AI]`,
    })

  } catch (error) {
    console.error('Translate API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to process document: ${errorMessage}` },
      { status: 500 }
    )
  }
}
