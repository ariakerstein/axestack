import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  "https://felofmlhqwcdpiyjgstx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"
)

async function main() {
  console.log('Counting tests in database...\n')

  // Count dx_test_master
  const { count: dxCount, error: dxErr } = await supabase
    .from('dx_test_master')
    .select('*', { count: 'exact', head: true })
  
  console.log('dx_test_master:', dxCount ?? 'error', dxErr ? `(${dxErr.message})` : '')

  // Count openonco_tests  
  const { count: openCount, error: openErr } = await supabase
    .from('openonco_tests')
    .select('*', { count: 'exact', head: true })
  
  console.log('openonco_tests:', openCount ?? 'error', openErr ? `(${openErr.message})` : '')

  // Total
  const total = (dxCount || 0) + (openCount || 0)
  console.log('\n=== TOTAL TESTS:', total, '===')
}

main()
