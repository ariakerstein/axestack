import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'
import { createClient } from '@supabase/supabase-js'

// Use Navis Supabase for AI calls (reuse existing infrastructure)
const SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY

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
    const sessionId = formData.get('sessionId') as string | null
    const userId = formData.get('userId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name
    const fileType = file.type
    const fileSize = file.size
    const fileSizeMB = fileSize / 1024 / 1024

    // Log file details (no hard limit - let Claude API handle it)
    console.log(`Processing file: ${fileName}, type: ${fileType}, size: ${fileSizeMB.toFixed(2)}MB`)

    // Warn for very large files (Claude API has ~32MB limit for documents)
    if (fileSizeMB > 30) {
      console.warn(`Large file warning: ${fileName} is ${fileSizeMB.toFixed(2)}MB - may fail due to API limits`)
    }

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

    // For Word documents, extract text using mammoth (Claude doesn't support Word natively)
    if (isWord) {
      try {
        // mammoth accepts Node.js Buffer directly
        const result = await mammoth.extractRawText({ buffer: buffer })
        documentText = result.value
        console.log(`Word document extracted: ${fileName}, ${documentText.length} characters`)

        // Log first 500 chars for debugging
        if (documentText) {
          console.log(`Word doc preview (${fileName}):`, documentText.substring(0, 500))
        }

        if (!documentText || documentText.trim().length < 10) {
          console.warn(`Word document appears empty or minimal: ${fileName}`)
          return NextResponse.json(
            { error: 'Word document appears empty or could not be read. Try saving as PDF.' },
            { status: 400 }
          )
        }
      } catch (wordError) {
        console.error(`Failed to extract Word document: ${fileName}`, wordError)
        return NextResponse.json(
          { error: 'Failed to read Word document. Please try saving as PDF.' },
          { status: 400 }
        )
      }
    }

    // Determine media type for Claude
    if (isPDF) {
      mediaType = 'application/pdf'
    } else if (isImage) {
      // Keep the original image type
      mediaType = fileType
    }

    // Word docs are now treated as text (extracted via mammoth)
    const isTextBased = isText || isWord

    // Call Navis Supabase edge function (reuses existing Claude API key)
    const response = await fetch(`${SUPABASE_URL}/functions/v1/axestack-translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        base64Data: isTextBased ? undefined : base64Data,
        mediaType,
        isText: isTextBased,
        documentText: isTextBased ? documentText : undefined
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Supabase edge function error:', errorText)
      console.error('Failed file details:', { fileName, fileType, fileSizeMB: fileSizeMB.toFixed(2), isPDF, isImage, isTextBased })

      // Try to parse actual error from edge function
      let actualError = ''
      try {
        const errorData = JSON.parse(errorText)
        actualError = errorData.error || ''
        console.error('Parsed error from edge function:', actualError)
      } catch (e) {
        // Couldn't parse, use raw text
        actualError = errorText.substring(0, 200)
      }

      // Show the actual API error if available
      if (actualError) {
        throw new Error(actualError)
      }

      // Fallback error messages
      if (response.status === 500) {
        if (fileSizeMB > 10) {
          throw new Error(`File may be too large (${fileSizeMB.toFixed(1)}MB). Try a smaller PDF or split into multiple files.`)
        }
        throw new Error(`Processing failed. The document may be encrypted, scanned, or in an unsupported format. Try a different PDF.`)
      } else if (response.status === 504 || response.status === 408) {
        throw new Error(`Processing timed out. Large or complex documents may take too long. Try a simpler or smaller file.`)
      }
      throw new Error(`Processing failed (${response.status}). Please try again.`)
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to process document')
    }

    const aiResponse = data.response || ''
    console.log(`AI response length: ${aiResponse.length} chars`)
    console.log(`AI response preview:`, aiResponse.substring(0, 300))

    // Parse JSON from response
    let analysis
    try {
      let cleanedResponse = aiResponse.trim()

      // Remove markdown code blocks
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.slice(7)
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3)
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(0, -3)
      }
      cleanedResponse = cleanedResponse.trim()

      // Try to find JSON object in response
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0])
        } catch (innerParseError) {
          // Try fixing common JSON issues
          let fixedJson = jsonMatch[0]
            .replace(/,\s*}/g, '}')  // Remove trailing commas
            .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
            .replace(/'/g, '"')       // Replace single quotes with double
          analysis = JSON.parse(fixedJson)
          console.log('JSON parsed after fixing common issues')
        }
      } else {
        console.error('No JSON object found in response. Full response:', cleanedResponse)
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
      const errorMsg = parseError instanceof Error ? parseError.message : 'Unknown parse error'
      console.error('Failed to parse response as JSON:', errorMsg)
      console.error('Raw AI response:', aiResponse)

      // Return a structured fallback instead of failing
      analysis = {
        document_type: 'Other',
        patient_name: 'unknown',
        date_of_service: 'unknown',
        provider_name: 'unknown',
        institution: 'unknown',
        diagnosis: [],
        test_summary: `We processed your document but encountered a formatting issue. The document was successfully read (${documentText?.length || 0} characters extracted). Try uploading as PDF for better results.`,
        questions_to_ask_doctor: 'Please discuss this document with your healthcare provider.',
        recommended_next_steps: ['Review with healthcare provider'],
        cancer_specific: { cancer_type: 'unknown', stage: 'unknown', grade: 'unknown', biomarkers: [], treatment_timeline: 'unknown' },
        lab_values: { key_results: [] },
        technical_terms_explained: [],
        processing_metadata: { confidence_level: 'Low', completeness: 'Limited', parse_error: errorMsg }
      }
    }

    // Determine document type label for response
    const docTypeLabel = isPDF ? 'PDF' : isWord ? 'Word document' : isImage ? 'Image' : 'Document'

    // Upload original file to Supabase Storage (non-blocking, best effort)
    let storagePath: string | null = null
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      const sessionId = formData.get('sessionId') as string || 'anonymous'
      const timestamp = Date.now()
      const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `opencancer/${sessionId}/${timestamp}_${safeName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(filePath, buffer, {
          contentType: fileType || 'application/octet-stream',
          upsert: false,
        })

      if (uploadError) {
        console.error('Storage upload error (non-fatal):', uploadError.message)
      } else {
        storagePath = filePath
        console.log(`File stored at: ${filePath}`)
      }
    } catch (storageErr) {
      console.error('Storage upload failed (non-fatal):', storageErr)
    }

    // Trigger entity extraction in background (non-blocking)
    if (analysis && (sessionId || userId)) {
      const baseUrl = request.nextUrl.origin
      fetch(`${baseUrl}/api/entities/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          translationResult: analysis,
          documentText: documentText || null,
          sessionId,
          userId
        })
      }).catch(err => {
        console.error('Entity extraction background call failed:', err)
      })
    }

    return NextResponse.json({
      success: true,
      fileName,
      fileType,
      analysis,
      documentText: documentText || `[${docTypeLabel} content analyzed by AI]`,
      storagePath, // Include storage path for viewing original
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
