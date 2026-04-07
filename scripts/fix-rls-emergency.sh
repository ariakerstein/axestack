#!/bin/bash
# EMERGENCY: Fix RLS on caregiver_managed_patients
# This script directly applies the RLS fix via Supabase SQL Editor

echo "🚨 EMERGENCY RLS FIX for caregiver_managed_patients"
echo ""
echo "⚠️  CRITICAL SECURITY ISSUE DETECTED:"
echo "   Anonymous users can currently see all caregiver patient records!"
echo ""
echo "📋 This script will:"
echo "   1. Force enable RLS on caregiver tables"
echo "   2. Recreate policies with auth.uid() checks"
echo "   3. Verify the fix worked"
echo ""
echo "🔧 ACTION REQUIRED:"
echo "   1. Go to: https://felofmlhqwcdpiyjgstx.supabase.co/project/felofmlhqwcdpiyjgstx/sql"
echo "   2. Copy and paste the SQL from: supabase/migrations/20251118000000_emergency_fix_caregiver_rls.sql"
echo "   3. Click 'Run'"
echo "   4. Come back and run: npx tsx scripts/test-caregiver-permissions.ts"
echo ""
read -p "Press ENTER after you've applied the SQL fix in Supabase Dashboard..."

echo ""
echo "✅ Testing if fix was applied..."
npx tsx scripts/test-caregiver-permissions.ts
