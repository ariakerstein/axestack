#!/bin/bash

# Script to update the service role key in .env file

echo "=================================="
echo "Update Supabase Service Role Key"
echo "=================================="
echo ""
echo "This script will update your .env file with the correct service_role key."
echo ""
echo "First, get your service_role key from Supabase:"
echo "1. Go to: https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/settings/api"
echo "2. Scroll to 'Project API keys'"
echo "3. Click [Copy] next to 'service_role' (the SECRET one, not the public one)"
echo ""
read -p "Paste your service_role key here: " SERVICE_KEY

if [ -z "$SERVICE_KEY" ]; then
    echo "❌ No key provided. Exiting."
    exit 1
fi

# Check if it looks like a JWT
if [[ ! "$SERVICE_KEY" =~ ^eyJ ]]; then
    echo "⚠️  Warning: This doesn't look like a valid JWT key (should start with 'eyJ')"
    read -p "Continue anyway? (y/n): " CONFIRM
    if [ "$CONFIRM" != "y" ]; then
        echo "Cancelled."
        exit 1
    fi
fi

# Backup existing .env
if [ -f ".env" ]; then
    cp .env .env.backup
    echo "✅ Backed up existing .env to .env.backup"
fi

# Update the key in .env
if grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env; then
    # Key exists, replace it
    sed -i.tmp "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY|" .env
    rm .env.tmp 2>/dev/null
    echo "✅ Updated SUPABASE_SERVICE_ROLE_KEY in .env"
else
    # Key doesn't exist, add it
    echo "" >> .env
    echo "# Service role key for Python scripts" >> .env
    echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY" >> .env
    echo "✅ Added SUPABASE_SERVICE_ROLE_KEY to .env"
fi

echo ""
echo "✅ Done! Now run:"
echo "   python3 test_single_pdf.py"
echo ""
