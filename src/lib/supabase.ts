import { createClient } from '@supabase/supabase-js'

// Use the same Supabase project as Navis
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Get or create a session ID for anonymous users
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = localStorage.getItem('promptdeck_session_id')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem('promptdeck_session_id', sessionId)
  }
  return sessionId
}

// Types for our tables
export interface PitchDeck {
  id: string
  session_id: string
  user_id: string | null
  name: string
  html: string
  stage: string | null
  score: number | null
  score_breakdown: Record<string, number> | null
  slide_scores: Array<{ slide: number; score: number; status: string; issue: string | null }> | null
  wizard_answers: Record<string, string> | null
  created_at: string
  updated_at: string
}

export interface PitchFeedback {
  id: string
  deck_id: string
  investor_name: string
  feedback: string
  believability_score: number
  investor_type: string
  domain_expertise: string
  check_size_fit: string
  meeting_stage: string
  created_at: string
}

// Deck operations
export async function saveNewDeck(data: {
  name: string
  html: string
  stage?: string
  score?: number
  scoreBreakdown?: Record<string, number>
  slideScores?: PitchDeck['slide_scores']
  wizardAnswers?: Record<string, string>
  userId?: string | null
}): Promise<PitchDeck | null> {
  const sessionId = getSessionId()

  const { data: deck, error } = await supabase
    .from('promptdeck_versions')
    .insert({
      session_id: sessionId,
      user_id: data.userId || null,
      name: data.name,
      html: data.html,
      stage: data.stage || null,
      score: data.score || null,
      score_breakdown: data.scoreBreakdown || null,
      slide_scores: data.slideScores || null,
      wizard_answers: data.wizardAnswers || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving deck:', error)
    return null
  }
  return deck
}

export async function updateDeck(id: string, data: Partial<{
  name: string
  html: string
  score: number
  scoreBreakdown: Record<string, number>
  slideScores: PitchDeck['slide_scores']
}>): Promise<PitchDeck | null> {
  const { data: deck, error } = await supabase
    .from('promptdeck_versions')
    .update({
      ...data.name && { name: data.name },
      ...data.html && { html: data.html },
      ...data.score !== undefined && { score: data.score },
      ...data.scoreBreakdown && { score_breakdown: data.scoreBreakdown },
      ...data.slideScores && { slide_scores: data.slideScores },
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating deck:', error)
    return null
  }
  return deck
}

export async function getDecks(userId?: string | null): Promise<PitchDeck[]> {
  const sessionId = getSessionId()

  // If user is logged in, get their decks + any session decks
  // If anonymous, just get session decks
  let query = supabase
    .from('promptdeck_versions')
    .select('*')
    .order('updated_at', { ascending: false })

  if (userId) {
    // Get decks owned by user OR matching current session (for migration)
    query = query.or(`user_id.eq.${userId},session_id.eq.${sessionId}`)
  } else {
    // Anonymous: only session decks
    query = query.eq('session_id', sessionId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching decks:', error)
    return []
  }
  return data || []
}

export async function getDeck(id: string): Promise<PitchDeck | null> {
  const { data, error } = await supabase
    .from('promptdeck_versions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching deck:', error)
    return null
  }
  return data
}

export async function deleteDeck(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('promptdeck_versions')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting deck:', error)
    return false
  }
  return true
}

// Feedback operations
export async function addFeedback(deckId: string, data: {
  investorName: string
  feedback: string
  believabilityScore: number
  investorType: string
  domainExpertise: string
  checkSizeFit: string
  meetingStage: string
}): Promise<PitchFeedback | null> {
  const { data: feedback, error } = await supabase
    .from('promptdeck_feedback')
    .insert({
      deck_id: deckId,
      investor_name: data.investorName,
      feedback: data.feedback,
      believability_score: data.believabilityScore,
      investor_type: data.investorType,
      domain_expertise: data.domainExpertise,
      check_size_fit: data.checkSizeFit,
      meeting_stage: data.meetingStage,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding feedback:', error)
    return null
  }
  return feedback
}

export async function getFeedbackForDeck(deckId: string): Promise<PitchFeedback[]> {
  const { data, error } = await supabase
    .from('promptdeck_feedback')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching feedback:', error)
    return []
  }
  return data || []
}
