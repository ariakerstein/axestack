import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const ADMIN_KEY = process.env.ADMIN_KEY || ''

export async function GET(request: NextRequest) {
  // Check admin auth
  const adminKey = request.headers.get('x-admin-key')
  if (adminKey !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Get usage data
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const { data: usage, error } = await supabase
      .from('api_usage')
      .select('*')
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching usage:', error)
      // If table doesn't exist, return empty data
      if (error.code === '42P01') {
        return NextResponse.json({
          summary: {
            totalCalls: 0,
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalTokens: 0,
            estimatedCostUsd: 0,
            successRate: 100,
          },
          byOperation: [],
          byModel: [],
          byFileType: [],
          dailyUsage: [],
          recentCalls: [],
          message: 'api_usage table not created yet. Run the migration SQL.',
        })
      }
      throw error
    }

    // Calculate aggregates
    const totalCalls = usage?.length || 0
    const totalInputTokens = usage?.reduce((sum, u) => sum + (u.input_tokens || 0), 0) || 0
    const totalOutputTokens = usage?.reduce((sum, u) => sum + (u.output_tokens || 0), 0) || 0
    const totalTokens = totalInputTokens + totalOutputTokens
    const estimatedCostUsd = usage?.reduce((sum, u) => sum + parseFloat(u.estimated_cost_usd || '0'), 0) || 0
    const successCount = usage?.filter(u => u.success).length || 0
    const successRate = totalCalls > 0 ? (successCount / totalCalls * 100).toFixed(1) : 100

    // Group by operation
    type StatsGroup = { count: number; tokens: number; cost: number }
    const byOperation = Object.entries(
      (usage || []).reduce<Record<string, StatsGroup>>((acc, u) => {
        const op = u.operation || 'unknown'
        if (!acc[op]) acc[op] = { count: 0, tokens: 0, cost: 0 }
        acc[op].count++
        acc[op].tokens += (u.input_tokens || 0) + (u.output_tokens || 0)
        acc[op].cost += parseFloat(u.estimated_cost_usd || '0')
        return acc
      }, {})
    ).map(([operation, stats]: [string, StatsGroup]) => ({ operation, count: stats.count, tokens: stats.tokens, cost: stats.cost }))

    // Group by model
    const byModel = Object.entries(
      (usage || []).reduce<Record<string, StatsGroup>>((acc, u) => {
        const model = u.model || 'unknown'
        if (!acc[model]) acc[model] = { count: 0, tokens: 0, cost: 0 }
        acc[model].count++
        acc[model].tokens += (u.input_tokens || 0) + (u.output_tokens || 0)
        acc[model].cost += parseFloat(u.estimated_cost_usd || '0')
        return acc
      }, {})
    ).map(([model, stats]: [string, StatsGroup]) => ({ model, count: stats.count, tokens: stats.tokens, cost: stats.cost }))

    // Group by file type
    const byFileType = Object.entries(
      (usage || []).reduce<Record<string, StatsGroup>>((acc, u) => {
        const type = u.file_type || 'unknown'
        if (!acc[type]) acc[type] = { count: 0, tokens: 0, cost: 0 }
        acc[type].count++
        acc[type].tokens += (u.input_tokens || 0) + (u.output_tokens || 0)
        acc[type].cost += parseFloat(u.estimated_cost_usd || '0')
        return acc
      }, {})
    ).map(([fileType, stats]: [string, StatsGroup]) => ({ fileType, count: stats.count, tokens: stats.tokens, cost: stats.cost }))

    // Daily breakdown
    type DailyStats = { calls: number; tokens: number; cost: number }
    const dailyUsage = Object.entries(
      (usage || []).reduce<Record<string, DailyStats>>((acc, u) => {
        const date = u.created_at?.split('T')[0] || 'unknown'
        if (!acc[date]) acc[date] = { calls: 0, tokens: 0, cost: 0 }
        acc[date].calls++
        acc[date].tokens += (u.input_tokens || 0) + (u.output_tokens || 0)
        acc[date].cost += parseFloat(u.estimated_cost_usd || '0')
        return acc
      }, {})
    )
      .map(([date, stats]: [string, DailyStats]) => ({ date, calls: stats.calls, tokens: stats.tokens, cost: stats.cost }))
      .sort((a, b) => b.date.localeCompare(a.date))

    // Recent calls (last 20)
    const recentCalls = (usage || []).slice(0, 20).map(u => ({
      id: u.id,
      operation: u.operation,
      model: u.model,
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      cost: parseFloat(u.estimated_cost_usd || '0'),
      fileType: u.file_type,
      success: u.success,
      createdAt: u.created_at,
    }))

    return NextResponse.json({
      summary: {
        totalCalls,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        estimatedCostUsd: estimatedCostUsd.toFixed(4),
        successRate,
      },
      byOperation,
      byModel,
      byFileType,
      dailyUsage,
      recentCalls,
    })
  } catch (error) {
    console.error('Usage API error:', error)
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 })
  }
}
