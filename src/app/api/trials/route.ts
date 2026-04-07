import { NextRequest, NextResponse } from 'next/server'

// Use the same Supabase project as Navis for the trial search
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"

interface TrialSearchParams {
  cancerType?: string
  stage?: string
  location?: string
  status?: string
  biomarker?: string
  phase?: string
}

export async function POST(request: NextRequest) {
  try {
    const searchParams: TrialSearchParams = await request.json()

    // Call the Navis fetch-clinical-trials edge function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-clinical-trials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        searchParams: {
          cancerType: searchParams.cancerType,
          stage: searchParams.stage,
          location: searchParams.location,
          status: searchParams.status || 'recruiting',
          biomarker: searchParams.biomarker,
          phase: searchParams.phase,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('fetch-clinical-trials error:', errorData)
      return NextResponse.json(
        { error: `Trial search error: ${response.status}` },
        { status: 500 }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Trials API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to search trials: ${errorMessage}` },
      { status: 500 }
    )
  }
}
