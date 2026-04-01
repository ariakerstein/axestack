import { NextRequest, NextResponse } from 'next/server'
import { CANCER_TYPES } from '@/lib/cancer-data'

// Use the same Supabase project as Navis for the RAG pipeline
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Detect if question is about symptoms/side effects (not well covered by NCCN guidelines)
function isSymptomQuestion(message: string): boolean {
  const symptomPatterns = [
    /symptom/i,
    /feeling/i,
    /tingly|tingling|numbness|numb/i,
    /pain|ache|hurt/i,
    /nausea|vomit/i,
    /fatigue|tired|exhausted/i,
    /cold (fingers|toes|hands|feet)/i,
    /paraneoplastic/i,
    /side effect/i,
    /is (this|it) normal/i,
    /should i (be )?worried/i,
    /why (do|am) i/i,
    /what causes/i,
    /swelling|swollen/i,
    /rash|itchy|itching/i,
    /dizzy|dizziness/i,
    /headache/i,
    /neuropathy/i,
  ]
  return symptomPatterns.some(pattern => pattern.test(message))
}

// Check if RAG response indicates low confidence or lack of info
function needsFallback(response: string, confidenceScore?: number): boolean {
  const lowConfidenceIndicators = [
    /i don't have (specific |enough )?information/i,
    /not covered in/i,
    /beyond (my|the) (knowledge|scope)/i,
    /cannot find/i,
    /no specific guidance/i,
    /guidelines do not address/i,
    /i'm not able to/i,
    /i cannot provide/i,
  ]

  const hasLowConfidenceText = lowConfidenceIndicators.some(pattern => pattern.test(response))
  const hasLowConfidenceScore = confidenceScore !== undefined && confidenceScore < 0.4

  return hasLowConfidenceText || hasLowConfidenceScore
}

// Symptom-focused system prompt for fallback when RAG doesn't have good answers
const SYMPTOM_SYSTEM_PROMPT = `You are Navis, a compassionate cancer care assistant helping patients understand their symptoms and side effects.

When discussing symptoms:
1. Acknowledge the patient's experience with empathy
2. Explain possible causes in simple terms (treatment side effects, the cancer itself, or unrelated conditions)
3. Distinguish between common/expected symptoms vs. concerning ones that need immediate attention
4. Always recommend discussing with their care team, but provide helpful context first
5. For symptoms like tingling, numbness, cold extremities - explain paraneoplastic syndromes, neuropathy, and treatment-related causes when relevant

Be warm, informative, and reassuring while being honest about when to seek medical attention. Avoid medical jargon - explain in plain language.`

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

    // Detect if this is a symptom question upfront
    const isSymptom = isSymptomQuestion(message)

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
    const ragResponse = data.response || data.answer || ''

    // Check if we need to fallback to general LLM (for symptom questions with low confidence)
    if (isSymptom && needsFallback(ragResponse, data.confidenceScore)) {
      console.log('Symptom question with low RAG confidence, using fallback')

      // Retry with skipRAG and symptom-focused prompt
      const fallbackResponse = await fetch(`${SUPABASE_URL}/functions/v1/direct-navis`, {
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
          model: 'claude-haiku-4-5-20251001',
          temperature: 0.3, // Slightly higher for more natural symptom discussion
          communicationStyle: 'balanced',
          skipRAG: true, // Skip NCCN guidelines, use general knowledge
          systemPrompt: SYMPTOM_SYSTEM_PROMPT,
        }),
      })

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json()
        return NextResponse.json({
          response: fallbackData.response || fallbackData.answer || ragResponse,
          cancerType: cancerType || null,
          // Note: fallback won't have citations since it skipped RAG
          confidenceScore: fallbackData.confidenceScore,
          citations: null,
          citationUrls: null,
          followUpQuestions: fallbackData.followUpQuestions,
          usedFallback: true, // Let frontend know we used fallback
        })
      }
      // If fallback fails, continue with original RAG response
    }

    // direct-navis returns: { response, confidenceScore, citations, citationUrls, followUpQuestions }
    return NextResponse.json({
      response: ragResponse || 'Sorry, I encountered an error. Please try again.',
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
