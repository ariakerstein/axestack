import { NextRequest, NextResponse } from 'next/server'
import { CANCER_TYPES } from '@/lib/cancer-data'

// Use the same Supabase project as Navis for the RAG pipeline
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const { message, cancerType, history = [] } = await request.json()

    // Map cancer type to guideline format
    const guidelineCancerType = cancerType && cancerType !== 'General' && cancerType !== 'other'
      ? CANCER_TYPES[cancerType] || cancerType
      : undefined

    // Build conversation history for context
    const conversationHistory = (history as Message[]).map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Call the Navis direct-navis edge function (RAG pipeline with NCCN guidelines)
    const response = await fetch(`${SUPABASE_URL}/functions/v1/direct-navis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: message,
        cancerType: guidelineCancerType,
        conversationHistory,
        // Use Haiku for fast responses with RAG grounding
        model: 'claude-haiku-4-5-20251001',
        // Low temperature for more deterministic, consistent responses
        temperature: 0.1,
        // Communication style
        communicationStyle: 'balanced',
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('direct-navis error:', errorData)
      return NextResponse.json(
        { error: `AI service error: ${response.status}` },
        { status: 500 }
      )
    }

    const data = await response.json()

    // direct-navis returns: { response, confidenceScore, citations, citationUrls, followUpQuestions }
    return NextResponse.json({
      response: data.response || data.answer || 'Sorry, I encountered an error. Please try again.',
      cancerType: cancerType || null,
      // Pass through rich metadata from RAG pipeline
      confidenceScore: data.confidenceScore,
      citations: data.citations,
      citationUrls: data.citationUrls,
      followUpQuestions: data.followUpQuestions,
    })
  } catch (error) {
    console.error('Ask API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to process request: ${errorMessage}` },
      { status: 500 }
    )
  }
}
