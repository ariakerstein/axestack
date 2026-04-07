#!/bin/bash

# ============================================================
# Quick Test Runner - Runs automated test suite
# ============================================================
# Date: October 29, 2025

set -e

cd "$(dirname "$0")"

echo "=========================================="
echo "AUTOMATED TEST RUNNER"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "Please create .env with:"
    echo "  SUPABASE_URL=https://felofmlhqwcdpiyjgstx.supabase.co"
    echo "  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>"
    echo "  OPENAI_API_KEY=<your-openai-key>"
    exit 1
fi

# Check if python3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 not found"
    echo "Please install Python 3"
    exit 1
fi

# Check if requests library is installed
if ! python3 -c "import requests" 2>/dev/null; then
    echo "📦 Installing required Python packages..."
    pip3 install requests python-dotenv
fi

# Run the test script
python3 automated_test_runner.py

echo ""
echo "✅ Done!"
