import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

export async function GET(request: Request) {
  // Simple auth check
  const authHeader = request.headers.get('x-admin-key')
  const adminKey = process.env.ADMIN_KEY || ''

  if (authHeader !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Get users who uploaded records but never ran Combat
    const { data: uploaders, error: uploadersError } = await supabase
      .from('patient_activity')
      .select('user_id')
      .eq('activity_type', 'record_upload')

    if (uploadersError) {
      console.error('Uploaders query error:', uploadersError)
      return NextResponse.json({ error: 'Failed to fetch uploaders' }, { status: 500 })
    }

    const { data: combatUsers, error: combatError } = await supabase
      .from('patient_activity')
      .select('user_id')
      .eq('activity_type', 'combat_run')

    if (combatError) {
      console.error('Combat query error:', combatError)
      return NextResponse.json({ error: 'Failed to fetch combat users' }, { status: 500 })
    }

    // Get unique uploaders who haven't run combat
    const uploaderIds = new Set(uploaders?.map(u => u.user_id).filter(Boolean))
    const combatUserIds = new Set(combatUsers?.map(u => u.user_id).filter(Boolean))

    const winbackIds = [...uploaderIds].filter(id => !combatUserIds.has(id))

    // Get user details from auth.users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({
      perPage: 1000
    })

    if (usersError) {
      console.error('Users query error:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Match winback IDs to user emails
    const winbackUsers = users
      ?.filter(u => winbackIds.includes(u.id))
      .filter(u => {
        // Filter out test accounts
        const email = u.email || ''
        if (email.includes('@gmaiul')) return false
        if (email.match(/^[a-z]{2,4}@/)) return false
        if (email.length < 10) return false
        if (email.startsWith('test')) return false
        return true
      })
      .map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at
      }))
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())

    // Get activity counts for each winback user
    const winbackWithActivity = await Promise.all(
      (winbackUsers || []).slice(0, 50).map(async (user) => {
        const { count } = await supabase
          .from('patient_activity')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('activity_type', 'record_upload')

        return {
          ...user,
          record_uploads: count || 0
        }
      })
    )

    return NextResponse.json({
      total: winbackIds.length,
      totalReal: winbackUsers?.length || 0,
      users: winbackWithActivity,
      summary: {
        totalUploaders: uploaderIds.size,
        totalCombatUsers: combatUserIds.size,
        dropoffRate: uploaderIds.size > 0
          ? Math.round((1 - combatUserIds.size / uploaderIds.size) * 100)
          : 0
      }
    })
  } catch (err) {
    console.error('Winback error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
