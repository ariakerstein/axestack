#!/bin/bash

# Pre-render Verification Script
# This script verifies that the pre-rendering setup is working correctly

set -e

echo "🔍 Pre-render Verification Script"
echo "=================================="
echo ""

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist/ directory not found. Run 'npm run build' first."
    exit 1
fi

echo "✓ dist/ directory found"
echo ""

# Check if pre-rendered files exist
echo "Checking for pre-rendered files..."
if [ ! -f "dist/index.html" ]; then
    echo "❌ Error: dist/index.html not found"
    exit 1
fi
echo "✓ dist/index.html exists"

if [ ! -f "dist/faq/index.html" ]; then
    echo "❌ Error: dist/faq/index.html not found"
    exit 1
fi
echo "✓ dist/faq/index.html exists"
echo ""

# Check meta tags in index.html
echo "Checking meta tags in index.html..."
if grep -q "<title>Navis - AI-Powered Cancer Navigation Platform</title>" dist/index.html; then
    echo "✓ Title tag found in index.html"
else
    echo "❌ Error: Title tag not found in index.html"
    exit 1
fi

if grep -q 'meta name="description"' dist/index.html; then
    echo "✓ Description meta tag found in index.html"
else
    echo "❌ Error: Description meta tag not found in index.html"
    exit 1
fi
echo ""

# Check meta tags in faq/index.html
echo "Checking meta tags in faq/index.html..."
if grep -q "<title>FAQ - Navis Cancer Navigation Platform</title>" dist/faq/index.html; then
    echo "✓ Title tag found in faq/index.html"
else
    echo "❌ Error: Title tag not found in faq/index.html"
    exit 1
fi

if grep -q 'meta name="description"' dist/faq/index.html; then
    echo "✓ Description meta tag found in faq/index.html"
else
    echo "❌ Error: Description meta tag not found in faq/index.html"
    exit 1
fi
echo ""

# Check for hydration setup
echo "Checking hydration setup..."
if grep -q "hydrateRoot" dist/index.html || grep -q "hydrateRoot" dist/faq/index.html; then
    echo "✓ Hydration appears to be configured"
else
    echo "⚠️  Warning: Could not verify hydration setup in built files"
fi
echo ""

# Check if _redirects or vercel.json exists
echo "Checking deployment configuration..."
if [ -f "dist/_redirects" ] || [ -f "public/_redirects" ]; then
    echo "✓ Netlify _redirects file found"
fi

if [ -f "vercel.json" ]; then
    echo "✓ Vercel configuration found"
fi
echo ""

echo "=================================="
echo "✅ All checks passed!"
echo ""
echo "Next steps:"
echo "1. Run 'npm run preview' to test locally"
echo "2. Visit http://localhost:4173/ and http://localhost:4173/faq"
echo "3. Right-click → 'View Page Source' to verify meta tags"
echo "4. Deploy to your hosting platform"
echo ""
