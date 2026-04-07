#!/bin/bash

# ============================================================
# Deploy Semantic Search + Claude 3.5 Sonnet Changes
# ============================================================
# Date: October 29, 2025

set -e  # Exit on error

echo "=========================================="
echo "DEPLOYING SEMANTIC SEARCH IMPROVEMENTS"
echo "=========================================="
echo ""

# Step 1: Deploy SQL function
echo "Step 1: Deploying match_chunks SQL function..."
echo "⚠️  MANUAL STEP REQUIRED:"
echo "    1. Go to: https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new"
echo "    2. Copy and paste contents of: rag_scripts_guidelines/create_semantic_search_function.sql"
echo "    3. Click 'Run' button"
echo "    4. Verify function created successfully"
echo ""
read -p "Press Enter after you've completed the SQL deployment..."

# Step 2: Deploy edge function
echo ""
echo "Step 2: Deploying updated direct-navis edge function..."
npx supabase functions deploy direct-navis --project-ref felofmlhqwcdpiyjgstx --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ Edge function deployed successfully!"
else
    echo "❌ Edge function deployment failed!"
    exit 1
fi

# Step 3: Verify deployment
echo ""
echo "Step 3: Verifying deployment..."
npx supabase functions list --project-ref felofmlhqwcdpiyjgstx

echo ""
echo "=========================================="
echo "DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "✅ Changes deployed:"
echo "   - Semantic search with cosine similarity"
echo "   - Claude 3.5 Sonnet (faster model)"
echo "   - Fuzzy cancer type matching"
echo ""
echo "📊 Next steps:"
echo "   1. Test with a question at: http://localhost:8081/response-quality"
echo "   2. Example: 'What are treatment options for glioblastoma?'"
echo "   3. Check function logs: https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/functions/direct-navis/logs"
echo "   4. Run verification SQL: rag_scripts_guidelines/verify_chunk_traceability.sql"
echo ""
echo "⚡ Expected improvements:"
echo "   - Latency: 20-25s → 8-12s (60% faster)"
echo "   - Retrieval: More robust (no more cancer type mismatches)"
echo "   - Quality: Same or better"
echo ""
