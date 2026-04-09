import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const ADMIN_KEY = process.env.ADMIN_KEY || ""

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: {
    name: string
    status: 'pass' | 'fail' | 'warn'
    message: string
    details?: Record<string, unknown>
  }[]
  summary: string
}

export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('x-admin-key')
  if (authHeader !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const checks: HealthStatus['checks'] = []
  let overallStatus: HealthStatus['status'] = 'healthy'

  // 1. Check environment variables
  const envChecks = [
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: SUPABASE_SERVICE_KEY, critical: true },
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: SUPABASE_URL, critical: true },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: SUPABASE_ANON_KEY, critical: true },
    { name: 'ADMIN_KEY', value: ADMIN_KEY, critical: false },
    { name: 'ANTHROPIC_API_KEY', value: process.env.ANTHROPIC_API_KEY || '', critical: true },
    { name: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY || '', critical: false },
  ]

  for (const env of envChecks) {
    const isSet = env.value.length > 10 // Must be more than a placeholder
    checks.push({
      name: `env:${env.name}`,
      status: isSet ? 'pass' : (env.critical ? 'fail' : 'warn'),
      message: isSet ? 'Set' : `NOT SET${env.critical ? ' (CRITICAL)' : ''}`,
      details: { length: env.value.length, critical: env.critical }
    })
    if (!isSet && env.critical) {
      overallStatus = 'unhealthy'
    }
  }

  // 2. Test Supabase connection with service key
  if (SUPABASE_SERVICE_KEY.length > 10) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

      // Test read from a known table
      const { data, error } = await supabase
        .from('opencancer_profiles')
        .select('count')
        .limit(1)

      if (error) {
        checks.push({
          name: 'db:service_key_read',
          status: 'fail',
          message: `Read failed: ${error.message}`,
        })
        overallStatus = 'unhealthy'
      } else {
        checks.push({
          name: 'db:service_key_read',
          status: 'pass',
          message: 'Service key can read from database',
        })
      }

      // Test write to patient_entities (the problematic table)
      const testId = `healthcheck-${Date.now()}`
      const { error: insertError } = await supabase
        .from('patient_entities')
        .insert({
          session_id: testId,
          entity_type: 'healthcheck',
          entity_value: 'test',
          confidence: 1.0,
          source_type: 'healthcheck',
        })

      if (insertError) {
        checks.push({
          name: 'db:patient_entities_write',
          status: 'fail',
          message: `Insert failed: ${insertError.message}`,
          details: { code: insertError.code, hint: insertError.hint }
        })
        overallStatus = 'unhealthy'
      } else {
        // Clean up test record
        await supabase
          .from('patient_entities')
          .delete()
          .eq('session_id', testId)

        checks.push({
          name: 'db:patient_entities_write',
          status: 'pass',
          message: 'Can write to patient_entities (RLS bypassed)',
        })
      }
    } catch (err) {
      checks.push({
        name: 'db:connection',
        status: 'fail',
        message: `Connection error: ${err instanceof Error ? err.message : String(err)}`,
      })
      overallStatus = 'unhealthy'
    }
  } else {
    checks.push({
      name: 'db:service_key_test',
      status: 'fail',
      message: 'Cannot test - SUPABASE_SERVICE_ROLE_KEY not set',
    })
  }

  // 3. Check table counts
  if (SUPABASE_SERVICE_KEY.length > 10) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const tablesToCheck = [
      'opencancer_profiles',
      'patient_entities',
      'combat_analyses',
      'navis_eval_logs',
      'patient_activity',
      'api_usage',
      'analytics_events',
      'medical_records',
      'patient_questions2',
      'guideline_chunks',
    ]

    for (const table of tablesToCheck) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (error) {
          checks.push({
            name: `count:${table}`,
            status: 'warn',
            message: `Error: ${error.message}`,
          })
        } else {
          const isEmpty = count === 0
          const isExpectedEmpty = ['patient_activity', 'api_usage'].includes(table)

          checks.push({
            name: `count:${table}`,
            status: isEmpty && !isExpectedEmpty ? 'warn' : 'pass',
            message: `${count} records`,
            details: { count }
          })

          // Flag critical empty tables
          if (isEmpty && table === 'patient_entities') {
            checks.push({
              name: 'alert:no_entities',
              status: 'fail',
              message: 'patient_entities is empty - GraphRAG not working!',
            })
            if (overallStatus === 'healthy') overallStatus = 'degraded'
          }
        }
      } catch {
        checks.push({
          name: `count:${table}`,
          status: 'warn',
          message: 'Query failed',
        })
      }
    }
  }

  // Build summary
  const failCount = checks.filter(c => c.status === 'fail').length
  const warnCount = checks.filter(c => c.status === 'warn').length
  const passCount = checks.filter(c => c.status === 'pass').length

  let summary = ''
  if (overallStatus === 'unhealthy') {
    summary = `UNHEALTHY: ${failCount} critical issues. Check SUPABASE_SERVICE_ROLE_KEY in Vercel.`
  } else if (overallStatus === 'degraded') {
    summary = `DEGRADED: ${warnCount} warnings. Some features may not work correctly.`
  } else {
    summary = `HEALTHY: All ${passCount} checks passed.`
  }

  const health: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    summary,
  }

  return NextResponse.json(health, {
    status: overallStatus === 'unhealthy' ? 503 : 200,
  })
}
